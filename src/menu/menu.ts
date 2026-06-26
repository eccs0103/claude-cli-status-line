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
	#cases: (readonly [string, T, boolean])[] = [];

	constructor(title: string) {
		if (new.target !== SingleSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	atCase(label: string, value: T, initial: boolean = false): void {
		this.#cases.push([label, value, initial]);
	}

	setInitial(value: T): void {
		this.#cases = this.#cases.map(([label, value2]) => [label, value2, value2 === value] as const);
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

//#region Input number menu
export class InputNumberMenu extends Menu<number> {
	#value: number = 0;
	#minimum: number = 0;
	#maximum: number = 0;
	#exclusive: boolean = false;

	constructor(title: string) {
		if (new.target !== InputNumberMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	value(value: number): void {
		this.#value = value;
	}

	bounds(minimum: number, maximum: number, exclusive: boolean = false): void {
		this.#minimum = minimum;
		this.#maximum = maximum;
		this.#exclusive = exclusive;
	}

	#validate(input: string | undefined): Error | undefined {
		const number = Number(input);
		if (!Number.isInteger(number)) return new Error(`The value ${number} must be a finite integer number`);
		const minimum = this.#minimum;
		const maximum = this.#maximum;
		const exclusive = this.#exclusive;
		if (minimum > number || number > maximum || (exclusive && number === maximum)) return new RangeError(`The value ${number} is out of range [${minimum} - ${maximum}${exclusive ? ")" : "]"}`);
	}

	async input(console: Console): Promise<number | symbol> {
		const result = await console.text(this.title, String(this.#value), this.#validate.bind(this));
		if (console.isCancel(result)) return result;
		return Number(result);
	}
}
//#endregion

//#region Input character menu
export class InputCharacterMenu extends Menu<string> {
	#value: string = String.empty;

	constructor(title: string) {
		if (new.target !== InputCharacterMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super(title);
	}

	value(value: string): void {
		this.#value = value;
	}

	#validate(input: string | undefined): Error | undefined {
		const string = input ?? String.empty;
		if (string.length !== 1) return new Error(`The string must be a single character`);
	}

	async input(console: Console): Promise<string | symbol> {
		return await console.text(this.title, this.#value, this.#validate.bind(this));
	}
}
//#endregion
