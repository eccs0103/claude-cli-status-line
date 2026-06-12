"use strict";

import "adaptive-extender/node";
import { Color } from "../models/settings.js";

//#region Style
export enum Style {
	bold = "bold",
	dim = "dim",
}
//#endregion
//#region Color system
export abstract class ColorSystem {
	static #RESET: string = "\x1b[0m";

	static #CODES: Map<Color | Style, string> = new Map<Color | Style, string>([
		[Color.cyan, "\x1b[36m"],
		[Color.magenta, "\x1b[35m"],
		[Color.blue, "\x1b[34m"],
		[Color.green, "\x1b[32m"],
		[Color.yellow, "\x1b[33m"],
		[Color.red, "\x1b[31m"],
		[Color.white, "\x1b[37m"],
		[Style.bold, "\x1b[1m"],
		[Style.dim, "\x1b[2m"],
	]);

	constructor() {
		if (new.target === ColorSystem) throw new TypeError("Unable to create an instance of an abstract class");
	}

	static paint(text: string, color: Color): string;
	static paint(text: string, style: Style): string;
	static paint(text: string, token: Color | Style): string {
		return `${ColorSystem.#CODES.get(token) ?? ColorSystem.#RESET}${text}${ColorSystem.#RESET}`;
	}
}
//#endregion
