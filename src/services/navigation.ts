"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text, type Option } from "@clack/prompts";
import { History } from "./history-service.js";
import { PathTransition, Transition } from "./transition.js";
import { type Menu } from "./new-menu.js";

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
