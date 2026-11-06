// G.O.A.T.S.: Gangriel's Otherworldly Alcohol Transport System, a Bondage Club add-on.
//
// /goats opens the tavern (with the goat). Serving a drink hands the player a real crafted glass or bottle from the
// game, named after the drink, so everyone sees it, add-on or not; only G.O.A.T.S. hands them out. Someone with
// G.O.A.T.S. who is served a drink gets a card to drink it or not: the effects only ever happen on the drinker's own
// screen, and only when they choose to drink. Everything runs inside `guard`: if the game changes, G.O.A.T.S. shows an
// error in its menu and the game carries on.
(() => {
	'use strict';
	const w = /** @type {any} */ (window);
	if (w.GOATS) {
		return;
	}
	const VERSION = '1.0.0';
	w.GOATS = Object.freeze({ version: VERSION });

	/** The original G.O.A.T.S. pictures and sounds. */
	const IMAGES = 'https://gitlab.com/kitco2/goats/-/raw/main/src/assets/images/';
	const AUDIO = 'https://kitco2.gitlab.io/goats/assets/audio/';
	/** The goat. Mandatory. */
	const BLEAT = `${AUDIO}GoatBAAAAAA.mp3`;
	/** What a crafted G.O.A.T.S. drink's description starts with, so G.O.A.T.S. knows its own bottles. */
	const MARK = '🐐 G.O.A.T.S.';
	/** Crafted names and descriptions the game accepts. */
	const NAME_MAX = 30;
	const DESCRIPTION_MAX = 200;

	/**
	 * @typedef {object} Drink
	 * @property {string} id
	 * @property {string} name
	 * @property {string} description
	 * @property {string} image the menu picture
	 * @property {string} sound played on the drinker's screen
	 * @property {number} volume
	 * @property {'GlassFilled' | 'PotionBottle'} item the game's hand-held item it comes in
	 * @property {string} drinkLine the room emote when it's drunk ({name} = the drinker)
	 * @property {() => void} effect what happens on the drinker's own screen
	 */

	// ---- Small helpers
	/**
	 * Plays a sound; a blocked or missing sound is only logged.
	 * @param {string} url
	 * @param {number} volume
	 */
	const play = (url, volume) => {
		try {
			const a = new Audio(url);
			a.volume = volume;
			a.play().catch(() => {});
		} catch (e) {
			/* no audio */
		}
	};
	/**
	 * A full-screen tint (clicks go through it) with optional text, for `ms`.
	 * @param {string} color
	 * @param {number} ms
	 * @param {{ text?: string, style?: string }} [label]
	 */
	const overlay = (color, ms, label = {}) => {
		const el = document.createElement('div');
		el.style.cssText = `position:fixed;inset:0;z-index:2147483000;background:${color};display:flex;align-items:center;justify-content:center;pointer-events:none;transition:opacity .6s`;
		if (label.text) {
			const s = document.createElement('span');
			s.textContent = label.text;
			s.style.cssText = label.style || '';
			el.append(s);
		}
		document.body.append(el);
		setTimeout(() => {
			el.style.opacity = '0';
			setTimeout(() => el.remove(), 700);
		}, ms);
	};
	/** A line in your own chat log only (nobody else sees it). */
	const note = (/** @type {string} */ text) => {
		if (typeof w.ChatRoomSendLocal === 'function') {
			w.ChatRoomSendLocal(`🐐 ${text}`);
		}
	};
	/** An emote to the room, like /me. */
	const emote = (/** @type {string} */ text) => w.ServerSend('ChatRoomChat', { Content: text, Type: 'Emote' });
	const nick = (/** @type {any} */ C) => (typeof w.CharacterNickname === 'function' ? w.CharacterNickname(C) : C.Nickname || C.Name);
	/** LSCG's state (horny, gagged, asleep...) on yourself, when LSCG is there; false if not. */
	const lscgState = (/** @type {string} */ type, /** @type {number} */ ms, /** @type {number} */ by) => {
		const lscg = (w.Player && w.Player.LSCG) || w.LSCG;
		const states = lscg && lscg.StateModule;
		const state = states && (typeof states.getState === 'function' ? states.getState(type) : (states.states || []).find((s) => s.type === type));
		if (!state || typeof state.Activate !== 'function') {
			return false;
		}
		state.Activate(by, ms, true);
		return true;
	};
	/** Makes the last few chat lines glow and burn away, then puts them back. */
	const burnChat = (/** @type {number} */ ms) => {
		const log = document.getElementById('TextAreaChatLog');
		for (const line of log ? [...log.children].slice(-5) : []) {
			const el = /** @type {HTMLElement} */ (line);
			const before = el.style.cssText;
			el.style.transition = `color ${ms}ms, text-shadow ${ms}ms, opacity 500ms`;
			el.style.color = '#ff4400';
			el.style.textShadow = '0 0 8px #ff6600, 0 0 20px #ff2200';
			setTimeout(() => {
				el.style.opacity = '0';
			}, ms * 0.7);
			setTimeout(() => {
				el.style.cssText = before;
			}, ms + 600);
		}
	};

	/** The drinks. The person who served it is in `servedBy` while an effect runs. */
	let servedBy = 0;
	/** @type {Drink[]} */
	const DRINKS = [
		{
			id: 'VoidAbsinthe',
			name: 'Void Absinthe',
			description: 'An eldritch green spirit distilled from concentrated nothingness. One sip and the drinker slips out of reality for a moment.',
			image: 'void.png',
			sound: 'VoidAbsinthe_drink.mp3',
			volume: 0.6,
			item: 'PotionBottle',
			drinkLine: "{name}'s eyes go blank as the Void Absinthe takes hold. Reality unravels around them…",
			effect: () => {
				overlay('rgba(0,20,0,0.92)', 3500, { text: 'V O I D', style: 'color:#00ff44;font-size:3em;font-family:monospace;text-shadow:0 0 20px #00ff44' });
			},
		},
		{
			id: 'RoseCoeur',
			name: 'Rosé Cœur',
			description: 'A heart-shaped bottle of shimmering pink liqueur sealed with a golden Cupid. One sip fills the heart with overwhelming, irresistible affection.',
			image: 'rose.png',
			sound: 'RoseCoeur_drink.mp3',
			volume: 0.5,
			item: 'GlassFilled',
			drinkLine: '{name} sips the Rosé Cœur. Their cheeks flush a deep pink and their eyes go starry: they look absolutely smitten.',
			effect: () => {
				overlay('rgba(255,100,150,0.18)', 5000, { text: '💗', style: 'font-size:4em' });
				lscgState('horny', 300000, servedBy);
				note('The Rosé Cœur warms your heart… and more. 💗');
			},
		},
		{
			id: 'MoonwalkerVodka',
			name: 'Moonwalker Vodka',
			description: 'A crystal-clear blue bottle branded with a retro moon logo. Makes the drinker feel impossibly light: their feet barely touch the ground.',
			image: 'Moonwalker.png',
			sound: 'MoonwalkerVodka_drink.mp3',
			volume: 0.5,
			item: 'GlassFilled',
			drinkLine: "{name} knocks back the Moonwalker Vodka. Their movements become uncannily smooth: they look like they're gliding on the moon.",
			effect: () => {
				overlay('rgba(100,180,255,0.12)', 6000, { text: '★ ☽ ★', style: 'color:#aaddff;font-size:2em;text-shadow:0 0 12px #88ccff' });
				note('Gravity? Never heard of her. ★☽★');
			},
		},
		{
			id: 'FirebiteCinnamonWhisky',
			name: 'Firebite Cinnamon Whisky',
			description: 'A flat amber bottle snarling with a flaming beast. Burns on the way down and sets the chat on fire.',
			image: 'firebite.png',
			sound: 'Firebite_Sound.mp3',
			volume: 0.75,
			item: 'GlassFilled',
			drinkLine: '{name} throws back a shot of Firebite. Their face contorts, then they exhale a belch that smells like literal hellfire.',
			effect: () => {
				overlay('rgba(255,80,0,0.35)', 1200, { text: '🔥', style: 'color:#ffcc00;font-size:5em;text-shadow:0 0 30px #ff4400' });
				burnChat(3500);
				note('🔥 Your throat is on FIRE.');
			},
		},
		{
			id: 'Aphasia',
			name: 'Aphasia',
			description: "A dark apothecary bottle labelled 'Verbal Function Suppressant'. Causes temporary inability to form coherent speech.",
			image: 'aphasia.png',
			sound: 'Aphasia_drink.mp3',
			volume: 0.5,
			item: 'PotionBottle',
			drinkLine: '{name} drinks the Aphasia suppressant. They open their mouth to speak, but only confused, garbled sounds come out.',
			effect: () => {
				overlay('rgba(30,30,30,0.2)', 2000);
				const ok = lscgState('gagged', 60000, servedBy);
				note(ok ? 'Your words fail you… (about a minute)' : 'Your words fail you… (needs LSCG to garble your speech)');
			},
		},
		{
			id: 'Abaddon',
			name: 'Abaddon',
			description: 'An unmarked black bottle bearing a skull and runic script. One sip sends the drinker straight to unconscious oblivion.',
			image: 'Abaddon.png',
			sound: 'Abaddon_drink.mp3',
			volume: 0.6,
			item: 'PotionBottle',
			drinkLine: '{name} drinks from the ominous Abaddon bottle. Their eyes roll back and they crumple to the floor, out cold.',
			effect: () => {
				overlay('rgba(0,0,0,0.85)', 8000, { text: 'Darkness takes you…', style: 'color:#777;font-size:1.5em;font-style:italic' });
				const ok = lscgState('asleep', 1800000, servedBy);
				note(ok ? '💤 Unconsciousness claims you…' : '💤 Unconsciousness claims you… (needs LSCG to put you to sleep)');
			},
		},
	];

	/**
	 * The crafted item a drink comes in: its name, and a description that starts with MARK.
	 * @param {Drink} d
	 */
	const craftOf = (d) => ({
		Item: d.item,
		Name: d.name.slice(0, NAME_MAX),
		Description: `${MARK} ${d.description}`.slice(0, DESCRIPTION_MAX),
		MemberName: nick(w.Player),
		MemberNumber: w.Player.MemberNumber,
		Lock: '',
		Private: false,
		Property: 'Normal',
		Color: '',
	});
	/**
	 * The drink a worn item is, when it's a G.O.A.T.S. bottle, else null.
	 * @param {any} item
	 */
	const drinkOf = (item) => {
		const craft = item && item.Craft;
		if (!craft || typeof craft.Description !== 'string' || !craft.Description.startsWith(MARK)) {
			return null;
		}
		return DRINKS.find((d) => d.name.slice(0, NAME_MAX) === craft.Name && d.item === item.Asset.Name) || null;
	};

	// ---- Serving and drinking
	/** The game functions G.O.A.T.S. needs; a missing one turns it off with a note instead of an error. */
	const NEEDS = ['ServerSend', 'InventoryWear', 'InventoryGet', 'InventoryRemove', 'ChatRoomCharacterUpdate', 'ChatRoomCharacterItemUpdate', 'ServerChatRoomGetAllowItem', 'CommandCombine'];
	const missing = () => NEEDS.filter((n) => typeof w[n] !== 'function');

	/**
	 * Serves `d` to `target` (yourself included): puts the crafted bottle in their hand and says so in the room.
	 * Answers why it couldn't, or ''.
	 * @param {Drink} d
	 * @param {any} target
	 */
	const serve = (d, target) => {
		if (w.CurrentScreen !== 'ChatRoom') {
			return 'Serve drinks in a chat room.';
		}
		const self = target.MemberNumber === w.Player.MemberNumber;
		if (!self && !w.ServerChatRoomGetAllowItem(w.Player, target)) {
			return `${nick(target)} doesn't allow you to use items on them.`;
		}
		if (w.InventoryGet(target, 'ItemHandheld')) {
			return `${nick(target)}'s hands are already full.`;
		}
		w.InventoryWear(target, d.item, 'ItemHandheld', 'Default', null, w.Player.MemberNumber, craftOf(d));
		if (!w.InventoryGet(target, 'ItemHandheld')) {
			return "The game wouldn't hand it over.";
		}
		if (self) {
			w.ChatRoomCharacterUpdate(w.Player);
		} else {
			w.ChatRoomCharacterItemUpdate(target, 'ItemHandheld');
		}
		emote(self ? `pours a glass of ${d.name} for themselves.` : `pours a glass of ${d.name} for ${nick(target)}.`);
		return '';
	};

	/**
	 * Drinks the G.O.A.T.S. bottle in your hand: the bottle goes, the room sees it, the effect plays on your screen.
	 * @param {Drink} d
	 * @param {number} by who served it
	 */
	const drink = (d, by) => {
		w.InventoryRemove(w.Player, 'ItemHandheld', false);
		w.ChatRoomCharacterUpdate(w.Player);
		w.ServerSend('ChatRoomChat', { Content: 'Beep', Type: 'Action', Dictionary: [{ Tag: 'Beep', Text: d.drinkLine.replace('{name}', nick(w.Player)) }] });
		play(`${AUDIO}${d.sound}`, d.volume);
		servedBy = by;
		d.effect();
	};

	// ---- The tavern menu
	const CSS = `
		#goats-menu { position: fixed; z-index: 2147483001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, 94vw);
			max-height: 90vh; overflow: auto; padding: 16px; border-radius: 16px; border: 2px solid #c9a227; background: linear-gradient(160deg, #2a1708, #160b03);
			color: #f3e2b8; font: 15px/1.4 Georgia, serif; box-shadow: 0 10px 40px #000c; }
		#goats-menu h2 { margin: 0 0 2px; text-align: center; font-size: 1.5em; color: #ffd76a; letter-spacing: 2px; }
		#goats-menu .sub { text-align: center; font-size: .8em; color: #c8a96a; margin-bottom: 10px; }
		#goats-menu .x { position: absolute; top: 8px; right: 10px; border: 0; background: none; color: #f3e2b8; font-size: 18px; cursor: pointer; }
		#goats-menu .drinks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
		#goats-menu .drink { border: 2px solid #5a3a14; border-radius: 12px; background: #3a210c; padding: 6px; cursor: pointer; text-align: center; color: inherit; font: inherit; }
		#goats-menu .drink img { width: 100%; height: 90px; object-fit: contain; }
		#goats-menu .drink.on, #goats-menu .who button.on { border-color: #ffd76a; background: #5a3510; }
		#goats-menu .about { margin: 8px 0; min-height: 2.8em; font-style: italic; font-size: .9em; color: #e9d29c; }
		#goats-menu .who { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
		#goats-menu .who button { border: 2px solid #5a3a14; border-radius: 999px; background: #3a210c; color: inherit; padding: 4px 10px; cursor: pointer; font: inherit; }
		#goats-menu .go { display: flex; gap: 8px; justify-content: center; }
		#goats-menu .go button { border: 0; border-radius: 999px; padding: 8px 18px; font: bold 15px Georgia, serif; cursor: pointer; background: #c9a227; color: #2a1708; }
		#goats-menu .go button.alt { background: #6b4a1c; color: #f3e2b8; }
		#goats-menu .msg { text-align: center; min-height: 1.4em; margin-top: 8px; color: #ffb36a; }
		#goats-offer { position: fixed; z-index: 2147483001; right: 16px; bottom: 16px; width: 290px; padding: 12px 14px; border-radius: 14px;
			border: 2px solid #c9a227; background: #241306; color: #f3e2b8; font: 14px/1.4 Georgia, serif; box-shadow: 0 6px 24px #000a; }
		#goats-offer img { float: left; width: 54px; height: 54px; object-fit: contain; margin-right: 8px; }
		#goats-offer .go { display: flex; gap: 8px; margin-top: 8px; clear: both; }
		#goats-offer button { flex: 1; border: 0; border-radius: 999px; padding: 6px; font: bold 14px Georgia, serif; cursor: pointer; background: #c9a227; color: #2a1708; }
		#goats-offer button.alt { background: #6b4a1c; color: #f3e2b8; }
	`;
	const style = () => {
		if (!document.getElementById('goats-style')) {
			const s = document.createElement('style');
			s.id = 'goats-style';
			s.textContent = CSS;
			document.head.append(s);
		}
	};
	/**
	 * A new element with a class and its text.
	 * @param {string} tag
	 * @param {string} [cls]
	 * @param {string} [text]
	 */
	const make = (tag, cls = '', text = '') => {
		const el = document.createElement(tag);
		if (cls) {
			el.className = cls;
		}
		el.textContent = text;
		return el;
	};
	/** Keys typed in G.O.A.T.S. stay out of the game. */
	const keepKeys = (/** @type {HTMLElement} */ el) => {
		for (const t of ['keydown', 'keyup', 'keypress']) {
			el.addEventListener(t, (e) => e.stopPropagation());
		}
	};

	const closeMenu = () => document.getElementById('goats-menu')?.remove();
	const openMenu = () => {
		style();
		closeMenu();
		play(BLEAT, 0.35);
		const box = make('div');
		box.id = 'goats-menu';
		keepKeys(box);
		const close = make('button', 'x', '✕');
		close.title = 'Close';
		close.addEventListener('click', closeMenu);
		const drinks = make('div', 'drinks');
		const about = make('div', 'about', 'Pick a drink.');
		const who = make('div', 'who');
		const msg = make('div', 'msg');
		/** @type {Drink | null} */
		let picked = null;
		/** @type {any} */
		let target = null;
		const say = (/** @type {string} */ text) => {
			msg.textContent = text;
		};
		for (const d of DRINKS) {
			const b = make('button', 'drink');
			const img = /** @type {HTMLImageElement} */ (make('img'));
			img.src = IMAGES + d.image;
			img.alt = '';
			b.append(img, make('div', '', d.name));
			b.addEventListener('click', () => {
				picked = d;
				for (const x of drinks.children) x.classList.toggle('on', x === b);
				about.textContent = d.description;
				say('');
			});
			drinks.append(b);
		}
		const people = Array.isArray(w.ChatRoomCharacter) ? w.ChatRoomCharacter.filter((C) => C.MemberNumber !== w.Player.MemberNumber) : [];
		for (const C of people) {
			const b = make('button', '', nick(C));
			b.addEventListener('click', () => {
				target = C;
				for (const x of who.children) x.classList.toggle('on', x === b);
				say('');
			});
			who.append(b);
		}
		if (!people.length) {
			who.append(make('span', '', 'Nobody else is here to serve.'));
		}
		const go = make('div', 'go');
		const serveBtn = make('button', '', '🍷 Serve');
		const selfBtn = make('button', 'alt', '🥂 Drink myself');
		const run = (/** @type {any} */ to) =>
			guard(() => {
				if (!picked) {
					say('Pick a drink first.');
					return;
				}
				if (!to) {
					say('Pick who to serve.');
					return;
				}
				const gone = missing();
				if (gone.length) {
					say(`⚠ The game changed (${gone.join(', ')} is gone): G.O.A.T.S. is off until it's updated.`);
					return;
				}
				const why = serve(picked, to);
				if (why) {
					say(why);
					return;
				}
				closeMenu();
			}, say);
		serveBtn.addEventListener('click', () => run(target));
		selfBtn.addEventListener('click', () => run(w.Player));
		go.append(serveBtn, selfBtn);
		box.append(
			close,
			make('h2', '', '🐐 G.O.A.T.S.'),
			make('div', 'sub', "Gangriel's Otherworldly Alcohol Transport System"),
			drinks,
			about,
			make('div', '', 'Serve to:'),
			who,
			go,
			msg,
		);
		document.body.append(box);
	};

	// ---- Being served: a card to drink it or not
	/** The bottle you were last offered (the worn item object), so the card shows once per bottle. */
	let offered = null;
	const offer = (/** @type {Drink} */ d, /** @type {any} */ item) => {
		style();
		document.getElementById('goats-offer')?.remove();
		const by = Number(item.Craft.MemberNumber) || 0;
		const from = by === w.Player.MemberNumber ? 'You poured yourself' : `${item.Craft.MemberName || 'Someone'} served you`;
		const card = make('div');
		card.id = 'goats-offer';
		keepKeys(card);
		const img = /** @type {HTMLImageElement} */ (make('img'));
		img.src = IMAGES + d.image;
		img.alt = '';
		const yes = make('button', '', '🍷 Drink it');
		const no = make('button', 'alt', 'Not now');
		const go = make('div', 'go');
		go.append(yes, no);
		card.append(img, make('div', '', `🐐 ${from} a ${d.name}.`), make('div', '', d.description), go);
		yes.addEventListener('click', () => {
			card.remove();
			guard(() => {
				// Still holding it?
				if (drinkOf(w.InventoryGet(w.Player, 'ItemHandheld')) === d) {
					drink(d, by);
				}
			});
		});
		no.addEventListener('click', () => card.remove());
		document.body.append(card);
	};
	/** Every second: a G.O.A.T.S. bottle newly in your hand gets its card. */
	const watch = () =>
		guard(() => {
			if (!w.Player || typeof w.InventoryGet !== 'function' || w.CurrentScreen !== 'ChatRoom') {
				return;
			}
			const item = w.InventoryGet(w.Player, 'ItemHandheld');
			const d = drinkOf(item);
			if (!d) {
				offered = null;
				document.getElementById('goats-offer')?.remove();
				return;
			}
			if (item !== offered) {
				offered = item;
				offer(d, item);
			}
		});

	/**
	 * Runs fn; if it throws, the error goes to `say` (or the console) and the game carries on.
	 * @param {() => void} fn
	 * @param {(text: string) => void} [say]
	 */
	function guard(fn, say) {
		try {
			fn();
		} catch (e) {
			const text = `⚠ G.O.A.T.S. hit a problem: ${/** @type {Error} */ (e)?.message || e}`;
			if (say) {
				say(text);
			} else {
				console.warn(text);
			}
		}
	}

	// ---- Start: once the game is ready, /goats opens the tavern.
	const start = setInterval(() => {
		if (!w.Player || !w.Player.MemberNumber || typeof w.CommandCombine !== 'function') {
			return;
		}
		clearInterval(start);
		guard(() => {
			w.CommandCombine([{ Tag: 'goats', Description: ': Open the G.O.A.T.S. tavern menu', Action: () => guard(openMenu) }]);
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					closeMenu();
				}
			});
			setInterval(watch, 1000);
		});
	}, 500);
})();
