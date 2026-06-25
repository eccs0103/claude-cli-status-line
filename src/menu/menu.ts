"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { isCancel, multiselect, select, type Option } from "@clack/prompts";
import { Transition } from "./transition.js";

//#region Menu
export interface ContinueHandler<T> {
	(value: T): Promisable<Transition>;
}

export interface CancelHandler {
	(): Promisable<Transition>;
}

export abstract class Menu<T = unknown> {
	#title: string;
	#onContinue: ContinueHandler<T> = this.#continue.bind(this);
	#onCancel: CancelHandler = this.#cancel.bind(this);

	constructor(title: string) {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
		this.#title = title;
	}

	get title(): string { return this.#title; }

	abstract input(): Promisable<T | symbol>;

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

	async build(): Promise<Transition> {
		const value = await this.input();
		if (isCancel(value)) return await this.#onCancel();
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

	async input(): Promise<T | symbol> {
		const message = this.title;
		const cases = this.#cases;
		const options = cases.map(([label, value]) => ({ label, value }) as Option<T>);
		return await select({ message, options });
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

	async input(): Promise<T[] | symbol> {
		const message = this.title;
		const cases = this.#cases;
		const options = cases.map(([label, value]) => ({ label, value }) as Option<T>);
		const initialValues = cases.filter(([, , selected]) => selected).map(([, value]) => value);
		const required = false;
		return await multiselect({ message, options, initialValues, required });
	}
}
//#endregion
