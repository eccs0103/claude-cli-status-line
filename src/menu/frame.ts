"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { type Console } from "./console.js";
import { type Transition } from "./transition.js";

//#region Frame
export class Frame<V = any, C = void> {
	#menu: Menu<V, C>;
	#context: C;

	constructor(menu: Menu<V, C>, context: C) {
		this.#menu = menu;
		this.#context = context;
	}

	build(console: Console): Promise<Transition> {
		return this.#menu.build(console, this.#context);
	}
}
//#endregion
