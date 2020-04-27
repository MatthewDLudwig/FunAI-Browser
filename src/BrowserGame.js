const puppeteer = require("puppeteer");
const pngjs = require("pngjs");
const fs = require("fs");

const AIGame = require("funai-framework").AIGame;
const TestPlayer = require("funai-framework").TestPlayer;

const BrowserPlayer = require("./BrowserPlayer.js");

class BrowserGame extends AIGame {
	constructor(url, definition, headless = false) {
		super();
		this.gameURL = url;
		this.aiDefinition = definition;
		this.headlessBrowser = headless;
	}

	async initGame() {
		this.stopped = false;
		this.browser = await puppeteer.launch({
			headless : this.headlessBrowser
		});

		this.page = await this.browser.newPage();
		await this.page.goto(this.gameURL);
	}

	async click(selector, expectingPopup = false) {
		return new Promise(async (resolve, reject) => {
			let arr = [];
			if (expectingPopup) arr.push(new Promise(resolve => this.page.once("popup", resolve)));
			arr.push(this.page.click(selector));

			let res = await Promise.all(arr).catch(reject);
			resolve(res ? res[0] : res);
		});
	};

	async initPlayer() {
		this.player = new BrowserPlayer(this.page, this.aiDefinition);
	}

	async beforeRealRun() {
		await this.initGame();
		await this.initPlayer();
		this.page.on("close", () => {
			this.player.running = false;
		});

		this.player.silent = true;
	}

	async doRealRun(targetTicksPerSecond = 1) {
		await this.player.run(targetTicksPerSecond);
	}

	async doTestRun(paths) {
		if (!Array.isArray(paths)) paths = [ paths ];

		const player = new TestPlayer(null, this.aiDefinition);

		for (let i = 0; i < paths.length; i++) {
			fs.createReadStream(paths[i]).pipe(new pngjs.PNG({
				filterType : 4
			})).on("parsed", async function () {
				player.testImage = this;
				console.log(i.toString().padStart(3, "0"));
				console.log(player.run());
			});
		}
	}
}

module.exports = BrowserGame;
