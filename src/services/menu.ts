"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text, type Option } from "@clack/prompts";
import { Transition } from "./navigation.js";

//#region Menu
export interface PathCallback {
	(): Promisable<Transition>;
}

export abstract class Menu {
	#title: string;

	constructor(title: string) {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
		this.#title = title;
	}

	get title(): string { return this.#title; }

	abstract build(): Promise<Transition>;
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

	async build(): Promise<Transition> {
		const message = this.title;
		const options = this.#options.map(([label, value]) => ({ value, label }) as Option<PathCallback>);
		const path = await select({ message, options });
		if (isCancel(path)) return Transition.back;
		return await path();
	}
}
//#endregion

//#region Multy selection menu
export class MultySelectionMenu extends SelectionMenu {
	#options: (readonly [string, PathCallback])[] = [];

	constructor(title: string) {
		super(title);
	}

	atOption(label: string, callback: PathCallback): void {
		this.#options.push([label, callback]);
	}

	async build(): Promise<Transition> {
		const message = "Enabled segments";
		const options = this.#options.map(([label, value]) => ({ value, label }) as Option<PathCallback>);
		const initialValues = segments.filter(segment => segment.enabled);
		const required = false;
		const paths = await multiselect({ message, options, initialValues, required });
		if (isCancel(paths)) return Transition.back;
		return await paths();
	}
}
//#endregion
