"use strict";

import "adaptive-extender/node";

//#region History
export class History<T> {
	#stack: T[];
	#index: number = 0;

	constructor(begin: T) {
		this.#stack = [begin];
	}

	get current(): T { return this.#stack[this.#index]; }

	insert(item: T): void {
		const stack = this.#stack;
		const next = this.#index + 1;
		stack.splice(next, stack.length - next);
		stack.push(item);
		this.#index = stack.length - 1;
	}

	forward(): void {
		const next = this.#index + 1;
		if (next > this.#stack.length - 1) return;
		this.#index = next;
	}

	back(): void {
		const previous = this.#index - 1;
		if (previous < 0) return;
		this.#index = previous;
	}
}
//#endregion
