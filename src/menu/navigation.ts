"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { Transition } from "./transition.js";
import { History } from "./history.js";
import { intro } from "@clack/prompts";

//#region Navigator
export class Navigator {
	#routes: Map<string, Menu> = new Map();

	register(path: string, menu: Menu): this {
		if (!this.#routes.add(path, menu)) throw new Error(`Already registered menu at '${path}' path`);
		return this;
	}

	async launch(path: string): Promise<void> {
		intro("Status line");

		const initial = ReferenceError.suppress(this.#routes.get(path), `No menu registered at '${path}' path`);
		const history = new History(initial);
		let transition: Transition = Transition.reload;
		while (true) {
			const menu = transition.apply(this.#routes, history);
			if (menu === null) break;
			transition = await menu.build();
		}
	}
}
//#endregion
