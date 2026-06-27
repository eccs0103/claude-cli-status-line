"use strict";

import "adaptive-extender/node";
import { type Promisable } from "adaptive-extender/node";
import { Transition } from "./transition.js";
import { type Console } from "./console.js";

//#region Menu
export interface ContinueHandler<V, C> {
	(value: V, context: C): Promisable<Transition>;
}

export interface CancelHandler {
	(): Promisable<Transition>;
}

export abstract class Menu<V = any, C = void> {
	#title: string = String.empty;
	#onContinue: ContinueHandler<V, C> = this.#continue.bind(this);
	#onCancel: CancelHandler = this.#cancel.bind(this);

	constructor() {
		if (new.target === Menu) throw new TypeError("Unable to create an instance of an abstract class");
	}

	get title(): string { return this.#title; }
	set title(value: string) { this.#title = value; }

	abstract input(console: Console): Promisable<V | symbol>;

	#continue(value: V, context: C): Promisable<Transition> {
		void value;
		void context;
		return Transition.reload;
	}

	#cancel(): Promisable<Transition> {
		return Transition.back;
	}

	onContinue(handler: ContinueHandler<V, C>): void {
		this.#onContinue = handler;
	}

	onCancel(handler: CancelHandler): void {
		this.#onCancel = handler;
	}

	async build(console: Console, context: C): Promise<Transition> {
		const value = await this.input(console);
		if (console.isCancel(value)) return await this.#onCancel();
		return await this.#onContinue(value, context);
	}
}
//#endregion

//#region Single selection menu
export class SingleSelectionMenu<V, C = void> extends Menu<V, C> {
	#cases: (readonly [string, V, boolean])[] = [];
	#initial: V | undefined = undefined;

	constructor() {
		if (new.target !== SingleSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super();
	}

	atCase(label: string, value: V): void {
		this.#cases.push([label, value, value === this.#initial]);
	}

	get initial(): V | undefined { return this.#initial; }
	set initial(value: V | undefined) {
		this.#initial = value;
		this.#cases = this.#cases.map(([label, value2]): readonly [string, V, boolean] => [label, value2, value !== undefined && value === value2]);
	}

	async input(console: Console): Promise<V | symbol> {
		return await console.select(this.title, this.#cases);
	}
}
//#endregion

//#region Multi selection menu
export class MultiSelectionMenu<V, C = void> extends Menu<V[], C> {
	#cases: (readonly [string, V, boolean])[] = [];

	constructor() {
		if (new.target !== MultiSelectionMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super();
	}

	atCase(label: string, value: V, selected: boolean = false): void {
		this.#cases.push([label, value, selected]);
	}

	async input(console: Console): Promise<V[] | symbol> {
		return await console.multiselect(this.title, this.#cases);
	}
}
//#endregion

//#region Input number menu
export class InputNumberMenu<C = void> extends Menu<number, C> {
	#value: number = 0;
	#minimum: number = 0;
	#maximum: number = 0;
	#exclusive: boolean = false;

	constructor() {
		if (new.target !== InputNumberMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super();
	}

	get value(): number { return this.#value; }
	set value(value: number) { this.#value = value; }

	get minimum(): number { return this.#minimum; }
	set minimum(value: number) { this.#minimum = value; }

	get maximum(): number { return this.#maximum; }
	set maximum(value: number) { this.#maximum = value; }

	get exclusive(): boolean { return this.#exclusive; }
	set exclusive(value: boolean) { this.#exclusive = value; }

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
export class InputCharacterMenu<C = void> extends Menu<string, C> {
	#value: string = String.empty;

	constructor() {
		if (new.target !== InputCharacterMenu) throw new TypeError("Unable to create an instance of sealed-extended class");
		super();
	}

	get value(): string { return this.#value; }
	set value(value: string) { this.#value = value; }

	#validate(input: string | undefined): Error | undefined {
		const string = input ?? String.empty;
		if (string.length !== 1) return new Error(`The string must be a single character`);
	}

	async input(console: Console): Promise<string | symbol> {
		return await console.text(this.title, this.#value, this.#validate.bind(this));
	}
}
//#endregion
