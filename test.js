// G.O.A.T.S. in the real game, headless, never logged in: a fake chat room, the menu, serving yourself, the
// "Drink it?" card, drinking, and the refusals. Run: node test.js   (serves the local BC checkout below)
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/Sam_0/Documents/Project/bc-plushies/node_modules/puppeteer-core');

const ROOT = process.env.ROOT || 'C:/Users/Sam_0/Documents/Project/bc-plushies/BondageClub/BondageClub';
const PORT = 8177;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.csv': 'text/csv', '.txt': 'text/plain', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
	const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
	fs.readFile(p, (err, data) => {
		if (err) {
			res.writeHead(404);
			return res.end();
		}
		res.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
		res.end(data);
	});
});
let failed = 0;
const check = (name, ok, got) => {
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`);
	if (!ok) failed++;
};

(async () => {
	await new Promise((r) => server.listen(PORT, r));
	const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1600, height: 900 });
		const errors = [];
		page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]));
		await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 120000 });
		await page.waitForFunction(() => typeof Asset !== 'undefined' && Asset.length > 1000 && typeof Player !== 'undefined' && !!Player, { timeout: 120000 });
		await new Promise((r) => setTimeout(r, 2000));
		// A fake chat room with the player and Gangriel; what would go to the server is kept.
		await page.evaluate(() => {
			cancelAnimationFrame(GameAnimationFrameId);
			GameRun = () => {};
			Player.Type = CharacterType.PLAYER;
			Player.MemberNumber = 1001;
			Player.Name = Player.Nickname = 'Rose';
			Player.GhostList = []; Player.BlackList = []; Player.WhiteList = []; Player.FriendList = [];
			CharacterAppearanceSetDefault(Player);
			InventoryRemove(Player, 'ItemHandheld', false);
			const other = CharacterLoadOnline({ ID: 'g', Name: 'Gangriel', Nickname: 'Gangriel', MemberNumber: 2002, AssetFamily: 'Female3DCG', Appearance: [], Title: '', Ownership: null, Lovership: [], ItemPermission: 1, BlockItems: [], LimitedItems: [], FavoriteItems: [], WhiteList: [], BlackList: [], OnlineSharedSettings: {}, ArousalSettings: {}, Game: {}, Inventory: [] }, 1001);
			ChatRoomData = { Name: 'Tavern', Admin: [1001], Whitelist: [], Ban: [], BlockCategory: [], Character: [], MapData: {} };
			ChatRoomCharacter = [Player, other];
			CurrentScreen = 'ChatRoom';
			window.sent = [];
			ServerSend = (msg, data) => window.sent.push([msg, data]);
			ServerChatRoomGetAllowItem = () => true;
		});
		await page.addScriptTag({ path: path.join(__dirname, 'goats.js') });
		await page.waitForFunction(() => Commands.some((c) => c.Tag === 'goats'), { timeout: 10000 });
		check('/goats is registered once the game is ready', true);

		// The menu: the goat, six drinks, Gangriel to serve.
		const menu = await page.evaluate(() => {
			const played = [];
			const RealAudio = window.Audio;
			window.Audio = function (src) { played.push(src); return new RealAudio(src); };
			Commands.find((c) => c.Tag === 'goats').Action('', '/goats', []);
			window.Audio = RealAudio;
			const m = document.getElementById('goats-menu');
			return {
				open: !!m,
				goat: played.some((s) => /GoatBAAAAAA\.mp3$/.test(s)),
				title: m.querySelector('.sub').textContent,
				drinks: [...m.querySelectorAll('.drink')].map((b) => b.textContent).join('|'),
				who: [...m.querySelectorAll('.who button')].map((b) => b.textContent).join('|'),
			};
		});
		check(
			'/goats opens the tavern with the goat, the six drinks and the people in the room',
			menu.open && menu.goat && menu.title === "Gangriel's Otherworldly Alcohol Transport System" &&
				menu.drinks === 'Void Absinthe|Rosé Cœur|Moonwalker Vodka|Firebite Cinnamon Whisky|Aphasia|Abaddon' && menu.who === 'Gangriel',
			menu,
		);

		await new Promise((r) => setTimeout(r, 1500));
		if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
		// Serving Gangriel: a crafted glass in her hand, named after the drink; the room is told.
		const served = await page.evaluate(() => {
			const m = document.getElementById('goats-menu');
			m.querySelectorAll('.drink')[1].click();
			m.querySelector('.who button').click();
			[...m.querySelectorAll('.go button')][0].click();
			const g = ChatRoomCharacter[1];
			const it = InventoryGet(g, 'ItemHandheld');
			return {
				closed: !document.getElementById('goats-menu'),
				item: it && it.Asset.Name,
				name: it && it.Craft && it.Craft.Name,
				mark: it && it.Craft && it.Craft.Description.startsWith('🐐 G.O.A.T.S.'),
				by: it && it.Craft && it.Craft.MemberNumber,
				sent: window.sent.map(([m, d]) => `${m}:${d.Type || ''}:${d.Content || ''}`),
			};
		});
		check(
			'serving Gangriel puts a crafted Rosé Cœur glass in her hand (made by me) and tells the room',
			served.closed && served.item === 'GlassFilled' && served.name === 'Rosé Cœur' && served.mark && served.by === 1001 &&
				served.sent.includes('ChatRoomCharacterItemUpdate::') && served.sent.includes('ChatRoomChat:Emote:pours a glass of Rosé Cœur for Gangriel.'),
			served,
		);
		// Her hands are full now: a second serve is refused in the menu.
		const full = await page.evaluate(() => {
			Commands.find((c) => c.Tag === 'goats').Action('', '/goats', []);
			const m = document.getElementById('goats-menu');
			m.querySelectorAll('.drink')[0].click();
			m.querySelector('.who button').click();
			[...m.querySelectorAll('.go button')][0].click();
			const t = m.querySelector('.msg').textContent;
			m.remove();
			return t;
		});
		check("a full hand is refused in the menu, nothing breaks", /hands are already full/.test(full), full);

		// Drinking it myself: the bottle, then the card a second later; Drink it plays the effect and the bottle goes.
		await page.evaluate(() => {
			window.sent = [];
			Commands.find((c) => c.Tag === 'goats').Action('', '/goats', []);
			const m = document.getElementById('goats-menu');
			m.querySelectorAll('.drink')[3].click();
			[...m.querySelectorAll('.go button')][1].click();
		});
		await page.waitForSelector('#goats-offer', { timeout: 5000 });
		const card = await page.evaluate(() => document.getElementById('goats-offer').textContent);
		check('my own bottle brings up the "Drink it?" card', /You poured yourself a Firebite Cinnamon Whisky/.test(card), card);
		const drank = await page.evaluate(async () => {
			let log = document.getElementById('TextAreaChatLog');
			if (!log) {
				log = document.createElement('div');
				log.id = 'TextAreaChatLog';
				document.body.append(log);
			}
			for (let i = 0; i < 3; i++) log.append(Object.assign(document.createElement('div'), { textContent: `line ${i}` }));
			window.sent = [];
			[...document.querySelectorAll('#goats-offer button')][0].click();
			await new Promise((r) => setTimeout(r, 300));
			return {
				gone: !InventoryGet(Player, 'ItemHandheld'),
				card: !!document.getElementById('goats-offer'),
				action: window.sent.find(([m, d]) => m === 'ChatRoomChat' && d.Type === 'Action'),
				overlay: [...document.body.children].some((e) => e.textContent === '🔥'),
				burning: [...log.children].filter((c) => /^line /.test(c.textContent)).every((c) => c.style.color === 'rgb(255, 68, 0)'),
			};
		});
		check(
			'Drink it: the bottle goes, the room sees the drink line, and the fire plays on my screen only',
			drank.gone && !drank.card && /throws back a shot of Firebite/.test(drank.action?.[1]?.Dictionary?.[0]?.Text || '') && drank.overlay && drank.burning,
			drank,
		);
		// Not now: the card goes, the bottle stays, and it doesn't come back for the same bottle.
		const later = await page.evaluate(async () => {
			Commands.find((c) => c.Tag === 'goats').Action('', '/goats', []);
			const m = document.getElementById('goats-menu');
			m.querySelectorAll('.drink')[2].click();
			[...m.querySelectorAll('.go button')][1].click();
			await new Promise((r) => setTimeout(r, 1500));
			[...document.querySelectorAll('#goats-offer button')][1].click();
			await new Promise((r) => setTimeout(r, 2500));
			return { kept: InventoryGet(Player, 'ItemHandheld')?.Craft?.Name, again: !!document.getElementById('goats-offer') };
		});
		check('Not now keeps the bottle and the card stays away', later.kept === 'Moonwalker Vodka' && !later.again, later);
		// A plain glass (not from G.O.A.T.S.) never gets a card.
		const plain = await page.evaluate(async () => {
			InventoryRemove(Player, 'ItemHandheld', false);
			InventoryWear(Player, 'GlassFilled', 'ItemHandheld');
			await new Promise((r) => setTimeout(r, 1500));
			return !!document.getElementById('goats-offer');
		});
		check('a normal glass gets no card', !plain);
		// The game without a function G.O.A.T.S. needs: a note in the menu, no error.
		const off = await page.evaluate(() => {
			const keep = window.InventoryWear;
			window.InventoryWear = undefined;
			InventoryRemove(Player, 'ItemHandheld', false);
			Commands.find((c) => c.Tag === 'goats').Action('', '/goats', []);
			const m = document.getElementById('goats-menu');
			m.querySelectorAll('.drink')[0].click();
			[...m.querySelectorAll('.go button')][1].click();
			const t = m.querySelector('.msg').textContent;
			window.InventoryWear = keep;
			m.remove();
			return t;
		});
		check('a missing game function turns G.O.A.T.S. off with a note', /The game changed \(InventoryWear/.test(off), off);
		check('no page errors', errors.length === 0, errors);
	} finally {
		await browser.close();
		server.close();
	}
	console.log(failed ? `${failed} FAILED` : 'All checks passed');
	process.exitCode = failed ? 1 : 0;
})();
