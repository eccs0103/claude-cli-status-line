"use strict";

import "adaptive-extender/node";
import { StatusLineInput } from "../models/status-line-input.js";

const { stdin } = process;

//#region Input service
export class InputService {
	async read(): Promise<StatusLineInput> {
		const raw = await new Promise<string>((resolve) => {
			let raw = String.empty;
			stdin.setEncoding("utf8");
			stdin.on("data", chunk => raw += chunk);
			stdin.on("end", () => resolve(raw));
		});

		return StatusLineInput.import(JSON.parse(raw), "input");
	}
}
//#endregion
