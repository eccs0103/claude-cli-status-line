"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { isCancel, multiselect, select, type Option } from "@clack/prompts";
import { Transition } from "./transition.js";

//#region Menu
export interface ContinueHandler<T> { (value: T): Promisable<Transition>; }
export interface CancelHandler { (): Promisable<Transition>; }

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
export abstract class SelectionMenu<T> extends Menu {
	#continue: ContinueHandler<T> | null = null;
	#cancel: CancelHandler | null = null;

	constructor(title: string) {
		if (new.target === SelectionMenu) throw new TypeError("Unable to create an instance of an abstract class");
		super(title);
	}

	onContinue(handler: ContinueHandler<T>): this {
		if (this.#continue !== null) throw new TypeError("Continue handler is already set");
		this.#continue = handler;
		return this;
	}

	onCancel(handler: CancelHandler): this {
		if (this.#cancel !== null) throw new TypeError("Cancel handler is already set");
		this.#cancel = handler;
		return this;
	}

	abstract input(): Promisable<T | symbol>;

	#continueDefault(value: T): Transition { void value; return Transition.reload; }
	#cancelDefault(): Transition { return Transition.back; }

	async build(): Promise<Transition> {
		const value = await this.input();
		if (isCancel(value)) {
			const handler = this.#cancel;
			return await (handler !== null ? handler() : this.#cancelDefault());
		}
		const handler = this.#continue;
		return await (handler !== null ? handler(value) : this.#continueDefault(value));
	}
}
//#endregion

//#region Single selection menu
export class SingleSelectionMenu<T> extends SelectionMenu<T> {
	#options: (readonly [string, T])[] = [];

	constructor(title: string) {
		if (new.target !== SingleSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atOption(label: string, value: T): this {
		this.#options.push([label, value]);
		return this;
	}

	async input(): Promise<T | symbol> {
		const options = Array.from(this.#options, ([label, value]) => ({ label, value }) as Option<T>);
		return await select({ message: this.title, options });
	}
}
//#endregion

//#region Multi selection menu
export class MultiSelectionMenu<T> extends SelectionMenu<T[]> {
	#options: { label: string; value: T; selected: boolean; }[] = [];

	constructor(title: string) {
		if (new.target !== MultiSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atOption(label: string, value: T, selected: boolean = false): this {
		this.#options.push({ label, value, selected });
		return this;
	}

	async input(): Promise<T[] | symbol> {
		const message = this.title;
		const options = Array.from(this.#options, ({ label, value }) => ({ label, value }) as Option<T>);
		const initialValues = this.#options.filter(o => o.selected).map(o => o.value);
		const required = false;
		return await multiselect({ message, options, initialValues, required });
	}
}
//#endregion
