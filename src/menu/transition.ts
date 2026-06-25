"use strict";

import "adaptive-extender/node";
import { cancel, outro } from "@clack/prompts";
import { type Menu } from "./menu.js";
import { History } from "./history.js";

//#region Transition
export abstract class Transition {
	constructor() {
		if (new.target === Transition) throw new TypeError("Unable to create an instance of an abstract class");
	}

	abstract apply(registry: Set<Menu>, history: History<Menu>): Menu | null;

	static get reload(): Transition { return NavigationTransition.reload; }
	static get back(): Transition { return NavigationTransition.back; }

	static success(message: string): Transition {
		return TerminationTransition.success(message);
	}

	static fail(message: string): Transition {
		return TerminationTransition.fail(message);
	}

	static toMenu(menu: Menu<any>): Transition {
		return new PathTransition(menu);
	}
}
//#endregion

//#region Navigation transition
export class NavigationTransition extends Transition {
	static #lock: boolean = true;
	static #back = NavigationTransition.#construct();
	static #reload = NavigationTransition.#construct();

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
	static get reload(): NavigationTransition { return this.#reload; }

	apply(registry: Set<Menu>, history: History<Menu>): Menu | null {
		void registry;
		switch (this) {
		case NavigationTransition.#back: {
			history.back();
			return history.current;
		}
		case NavigationTransition.#reload: {
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

	apply(registry: Set<Menu>, history: History<Menu>): Menu | null {
		void registry, history;
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
	#menu: Menu;

	constructor(menu: Menu) {
		super();
		this.#menu = menu;
	}

	get menu(): Menu { return this.#menu; }

	apply(registry: Set<Menu>, history: History<Menu>): Menu | null {
		const menu = this.#menu;
		if (!registry.has(menu)) throw new Error(`No menu '${menu.title}' exists at registy`);
		history.insert(menu);
		return menu;
	}
}
//#endregion
