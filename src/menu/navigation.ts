"use strict";

import "adaptive-extender/node";
import { type Menu } from "./menu.js";
import { Transition } from "./transition.js";
import { History } from "./history.js";
import { intro } from "@clack/prompts";

const { stdin, stderr, stdout } = process;

//#region Navigator
export class Navigator {
	#registry: Set<Menu> = new Set();

	register(menu: Menu<any>): void {
		const registry = this.#registry;
		const { size } = registry;
		if (size === registry.add(menu).size) throw new Error(`The menu '${menu.title}' already exists at registy`);
	}

	async #build(menu: Menu<any>): Promise<void> {
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

	async launch(menu: Menu<any>): Promise<void> {
		if (!stdout.isTTY) {
			stderr.write("Run 'claude-cli-status-line config' in an interactive terminal.\n");
			return;
		}

		// Workaround for Node.js #38663 (Windows): toggling raw mode off while closing
		// the readline interface on Escape drops the next keypress. Hold raw mode on for
		// the whole session so clack's per-prompt setRawMode(false) is a no-op.
		const restore = stdin.setRawMode.bind(stdin);
		stdin.setRawMode = mode => (mode && restore(true), stdin);
		restore(true);
		try {
			await this.#build(menu);
		} finally {
			stdin.setRawMode = restore;
			restore(false);
		}
	}
}
//#endregion
