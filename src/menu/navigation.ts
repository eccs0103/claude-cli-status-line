"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { Transition } from "./transition.js";
import { History } from "./history.js";
import { intro } from "@clack/prompts";

//#region Navigator
export class Navigator {
	#registry: Set<Menu> = new Set();

	register(menu: Menu): this {
		const registry = this.#registry;
		const { size } = registry;
		if (size === registry.add(menu).size) throw new Error(`The menu '${menu.title}' already exists at registy`);
		return this;
	}

	async launch(menu: Menu): Promise<void> {
		intro("Status line");
		
		const registry = this.#registry;
		if (!registry.has(menu)) throw new Error(`No menu '${menu.title}' exists at registy`);
		const history = new History(menu);
		let transition: Transition = Transition.reload;
		while (true) {
			const menu = transition.apply(registry, history);
			if (menu === null) break;
			transition = await menu.build();
		}
	}
}
//#endregion
