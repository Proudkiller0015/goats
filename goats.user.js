// ==UserScript==
// @name         G.O.A.T.S.
// @namespace    https://github.com/Proudkiller0015/goats
// @version      1.0.0
// @description  Gangriel's Otherworldly Alcohol Transport System: serve otherworldly drinks in Bondage Club chat rooms with /goats. Always runs the newest version.
// @author       Gangriel, SlimeQueenSamantha
// @icon         https://raw.githubusercontent.com/Proudkiller0015/goats/main/icon-64.png
// @homepageURL  https://github.com/Proudkiller0015/goats
// @downloadURL  https://raw.githubusercontent.com/Proudkiller0015/goats/main/goats.user.js
// @updateURL    https://raw.githubusercontent.com/Proudkiller0015/goats/main/goats.user.js
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondageprojects.elementfx.com/*
// @match        https://bondageprojects.com/*
// @match        https://www.bondageprojects.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-asia.com/*
// @match        http://localhost:8130/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/*
 * The G.O.A.T.S. loader, like SlimeBeep's. It never needs updating: on every game load it fetches the
 * newest G.O.A.T.S. from GitHub (goats.js) and runs it, so an update reaches everybody the next time
 * they reload or log in.
 */
(function () {
	'use strict';

	const SOURCE = 'https://raw.githubusercontent.com/Proudkiller0015/goats/main/goats.js';
	// GitHub may hand out a copy up to five minutes old, so an update lands within about five minutes.
	fetch(`${SOURCE}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' })
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.text();
		})
		.then((code) => {
			const script = document.createElement('script');
			script.textContent = `${code}
//# sourceURL=goats.js`;
			document.head.appendChild(script);
			script.remove();
		})
		.catch((err) => console.warn('[G.O.A.T.S.] could not load:', err.message));
})();
