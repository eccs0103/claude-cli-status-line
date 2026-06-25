"use strict";

import "adaptive-extender/node";

//#region History
export class History<T> {
	#stack: T[];
	#index: number = 0;

	constructor(begin: T) {
		this.#stack = [begin];
	}

	get current(): T {
		return this.#stack[this.#index];
	}

	open(item: T): void {
		const stack = this.#stack;
		const feature = this.#index + 1;
		stack.splice(feature, stack.length - feature);
		stack.push(item);
		this.#index = stack.length - 1;
	}

	forward(): void {
		if (this.#index >= this.#stack.length - 1) return;
		this.#index++;
	}

	back(): void {
		if (this.#index <= 0) return;
		this.#index--;
	}
}
//#endregion
