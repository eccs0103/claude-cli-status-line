"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { type Router } from "./navigation.js";

//#region Transition
export abstract class Transition {
	constructor() {
		if (new.target === Transition) throw new TypeError("Unable to create an instance of an abstract class");
	}

	abstract apply(router: Router): void;

	static get reload(): Transition { return NavigationTransition.reload; }
	static get back(): Transition { return NavigationTransition.back; }

	static success(message: string): Transition {
		return TerminationTransition.success(message);
	}

	static fail(message: string): Transition {
		return TerminationTransition.fail(message);
	}

	static toMenu(menu: Menu): Transition {
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

	apply(router: Router): void {
		switch (this) {
		case NavigationTransition.#back: { router.back(); break; }
		case NavigationTransition.#reload: { break; }
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

	apply(router: Router): void {
		router.terminate(this.#success, this.#message);
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

	apply(router: Router): void {
		router.goto(this.#menu);
	}
}
//#endregion
