"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text, type Option } from "@clack/prompts";
import { History } from "./history-service.js";
import type { Menu } from "./menu.js";

//#region Transition
export abstract class Transition {
	constructor() {
		if (new.target === Transition) throw new TypeError("Unable to create an instance of an abstract class");
	}

	abstract apply(routes: Map<string, Menu>, history: History<Menu>): Menu | null;

	static get back(): Transition { return NavigationTransition.back; }

	static success(message: string): Transition {
		return TerminationTransition.success(message);
	}

	static fail(message: string): Transition {
		return TerminationTransition.fail(message);
	}

	static toMenu(path: string): Transition {
		return new PathTransition(path);
	}
}
//#endregion

//#region Navigation transition
export class NavigationTransition extends Transition {
	static #lock: boolean = true;
	static #back = NavigationTransition.#construct();

	constructor() {
		if (NavigationTransition.#lock) throw new TypeError("Illegal constructor");
		super();
	}

	static #construct(...args: ConstructorParameters<typeof NavigationTransition>): NavigationTransition {
		NavigationTransition.#lock = false;
		const self = new NavigationTransition(...args);
		NavigationTransition.#lock = true;
		return self;
	}

	static get back(): NavigationTransition { return this.#back; }

	apply(routes: Map<string, Menu>, history: History<Menu>): Menu | null {
		void routes;
		switch (this) {
		case NavigationTransition.#back: {
			history.back();
			return history.current;
		}
		default: throw new TypeError(`Invalid navigation instance of transition`);
		}
	}
}
//#endregion
//#region Termination transition
export class TerminationTransition extends Transition {
	#success: boolean;
	#message: string;

	constructor(success: boolean, message: string) {
		super();
		this.#success = success;
		this.#message = message;
	}

	get success(): boolean { return this.#success; }
	get message(): string { return this.#message; }

	apply(routes: Map<string, Menu>, history: History<Menu>): Menu | null {
		void routes, history;
		const message = this.#message;
		!this.#success ? cancel(message) : outro(message);
		return null;
	}

	static success(message: string): TerminationTransition {
		return new TerminationTransition(true, message);
	}

	static fail(message: string): TerminationTransition {
		return new TerminationTransition(false, message);
	}
}
//#endregion
//#region Path transition
export class PathTransition extends Transition {
	#path: string;

	constructor(path: string) {
		super();
		this.#path = path;
	}

	get path(): string { return this.#path; }

	apply(routes: Map<string, Menu>, history: History<Menu>): Menu | null {
		const { path } = this;

		const menu = ReferenceError.suppress(routes.get(path), `No menu registered at '${path}' path`);
		history.insert(menu);
		return menu;
	}
}
//#endregion

//#region Navigator
export class Navigator {
	#routes: Map<string, Menu> = new Map();
	#history: History<Menu>;

	register(path: string, menu: Menu): void {
		if (!this.#routes.add(path, menu)) throw new Error(`Already registered menu at '${path}' path`);
	}

	async launch(path: string): Promise<void> {
		let transition: Transition = new PathTransition(path);
		while (true) {
			const menu = transition.apply(this.#routes, this.#history);
			if (menu === null) break;
			transition = await menu.build();
		}
	}
}
//#endregion
