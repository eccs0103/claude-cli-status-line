"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { History } from "./history.js";
import { Console } from "./console.js";

//#region Router
export interface Router {
	back(): void;
	goto(menu: Menu): void;
	terminate(success: boolean, message: string): void;
}
//#endregion

//#region Navigator
export class Navigator implements Router {
	#console: Console = new Console();
	#history: History<Menu>;
	#running: boolean = false;

	back(): void {
		this.#history.back();
	}

	goto(menu: Menu): void {
		this.#history.insert(menu);
	}

	terminate(success: boolean, message: string): void {
		const console = this.#console;
		success ? console.outro(message) : console.cancel(message);
		this.#running = false;
	}

	async #build(menu: Menu<any>): Promise<void> {
		const console = this.#console;
		console.intro("Status line");
		const history = this.#history = new History(menu);
		this.#running = true;
		while (this.#running) {
			const current = history.current;
			const transition = await current.build(console);
			transition.apply(this);
		}
	}

	async launch(menu: Menu<any>): Promise<void> {
		await this.#console.session(() => this.#build(menu));
	}
}
//#endregion
