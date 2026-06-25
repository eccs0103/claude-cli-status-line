"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text, type Option } from "@clack/prompts";
import { History } from "./history-service.js";

//#region Menu
export interface PathCallback {
	(): Promisable<Menu>;
}

export abstract class Menu {
	#title: string;

	constructor(title: string) {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
		this.#title = title;
	}

	get title(): string { return this.#title; }

	abstract build(): Promise<Menu>;
}
//#endregion

//#region Selection menu
export abstract class SelectionMenu extends Menu {
	constructor(title: string) {
		if (new.target === SelectionMenu) throw new TypeError("Unable to create an instance of an abstract class");
		super(title);
	}
}
//#endregion

//#region Single selection menu
export class SingleSelectionMenu extends SelectionMenu {
	#options: (readonly [string, PathCallback])[] = [];

	constructor(title: string) {
		super(title);
	}

	atOption(label: string, callback: PathCallback): void {
		this.#options.push([label, callback]);
	}

	async build(): Promise<Menu> {
		const message = this.title;
		const options = this.#options.map(([label, value]) => ({ value, label }) as Option<PathCallback>);
		const path = await select({ message, options });
		if (isCancel(path)) throw new Error("Method not implemented");
		return await path();
	}
}
//#endregion

//#region Navigator
export class Navigator {
	#history: History<Menu>;

	navigate(menu: Menu): void {
		this.#history.open(menu);
	}
}
//#endregion

const ssm = new SingleSelectionMenu("Exit");
ssm.atOption("Save & exit", () => {
	// await this.#service.write(settings);
	throw new Error("Method not implemented"); // outro("Saved");
});
ssm.atOption("Discard changes", () => {
	throw new Error("Method not implemented"); // cancel("Discarded");
});
