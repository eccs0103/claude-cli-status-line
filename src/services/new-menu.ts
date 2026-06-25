"use strict";

import "adaptive-extender/node";
import { isCancel, select, type Option } from "@clack/prompts";
import { Transition } from "./transition.js";
import type { Promisable } from "adaptive-extender/node";

//#region Menu
export abstract class Menu<T = unknown> {
	#title: string;

	constructor(title: string) {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
		this.#title = title;
	}

	get title(): string { return this.#title; }

	abstract input(): Promisable<T | symbol>;

	runContinue(value: T): Promisable<Transition> {
		void value;
		return Transition.reload;
	}

	runCancel(): Promisable<Transition> {
		return Transition.back;
	}

	async build(): Promise<Transition> {
		const value = await this.input();
		if (isCancel(value)) return await this.runCancel();
		return await this.runContinue(value);
	}
}
//#endregion

//#region Single selection menu
export class SingleSelectionMenu<T> extends Menu<T> {
	#options: (readonly [string, T])[] = [];

	constructor(title: string) {
		if (new.target !== SingleSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atOption(label: string, value: T): void {
		this.#options.push([label, value]);
	}

	async input(): Promise<T | symbol> {
		const message = this.title;
		const options = Array.from(this.#options, ([label, value]) => ({ label, value }) as Option<T>);
		return await select({ message, options });
	}
}
//#endregion
