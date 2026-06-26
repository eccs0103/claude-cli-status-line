"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { Transition } from "./transition.js";
import { type Console } from "./console.js";

//#region Menu
export interface ContinueHandler<T> {
	(value: T): Promisable<Transition>;
}

export interface CancelHandler {
	(): Promisable<Transition>;
}

export abstract class Menu<T = any> {
	#title: string;
	#onContinue: ContinueHandler<T> = this.#continue.bind(this);
	#onCancel: CancelHandler = this.#cancel.bind(this);

	constructor(title: string) {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
		this.#title = title;
	}

	get title(): string { return this.#title; }

	abstract input(console: Console): Promisable<T | symbol>;

	#continue(value: T): Promisable<Transition> {
		void value;
		return Transition.reload;
	}

	#cancel(): Promisable<Transition> {
		return Transition.back;
	}

	onContinue(handler: ContinueHandler<T>): void {
		this.#onContinue = handler;
	}

	onCancel(handler: CancelHandler): void {
		this.#onCancel = handler;
	}

	async build(console: Console): Promise<Transition> {
		const value = await this.input(console);
		if (console.isCancel(value)) return await this.#onCancel();
		return await this.#onContinue(value);
	}
}
//#endregion

//#region Single selection menu
export class SingleSelectionMenu<T> extends Menu<T> {
	#cases: (readonly [string, T])[] = [];

	constructor(title: string) {
		if (new.target !== SingleSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atCase(label: string, value: T): void {
		this.#cases.push([label, value]);
	}

	async input(console: Console): Promise<T | symbol> {
		return await console.select(this.title, this.#cases);
	}
}
//#endregion

//#region Multi selection menu
export class MultiSelectionMenu<T> extends Menu<T[]> {
	#cases: (readonly [string, T, boolean])[] = [];

	constructor(title: string) {
		if (new.target !== MultiSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atCase(label: string, value: T, selected: boolean = false): void {
		this.#cases.push([label, value, selected]);
	}

	async input(console: Console): Promise<T[] | symbol> {
		return await console.multiselect(this.title, this.#cases);
	}
}
//#endregion
