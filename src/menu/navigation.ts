"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { Frame } from "./frame.js";
import { History } from "./history.js";
import { Console } from "./console.js";

//#region Router
export interface Router {
	back(): void;
	goto(frame: Frame<any, any>): void;
	terminate(success: boolean, message: string): void;
}
//#endregion
//#region Navigator
export class Navigator implements Router {
	#console: Console = new Console();
	#history: History<Frame<any, any>>;
	#running: boolean = false;

	back(): void {
		this.#history.back();
	}

	goto(frame: Frame<any, any>): void {
		this.#history.insert(frame);
	}

	terminate(success: boolean, message: string): void {
		const console = this.#console;
		success ? console.outro(message) : console.cancel(message);
		this.#running = false;
	}

	async #build<V, C>(title: string, menu: Menu<V, C>, context: C): Promise<void> {
		const console = this.#console;
		console.intro(title);
		const history = this.#history = new History(new Frame(menu, context));
		this.#running = true;
		while (this.#running) {
			const current = history.current;
			const transition = await current.build(console);
			transition.apply(this);
		}
	}

	async launch<V>(title: string, menu: Menu<V, void>, context: void): Promise<void>;
	async launch<V, C>(title: string, menu: Menu<V, C>, context: C): Promise<void>;
	async launch<V, C>(title: string, menu: Menu<V, C>, context: C): Promise<void> {
		await this.#console.session(() => this.#build(title, menu, context));
	}
}
//#endregion
