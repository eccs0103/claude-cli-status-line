"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { StatusLineInput } from "../models/status-line-input.js";
import { StatusLine } from "../services/status-line.js";

const { stdin, stdout, stderr } = process;

//#region Status line controller
export class StatusLineController extends Controller {
	async run(): Promise<void> {
		const raw = await StatusLineController.#readInput();
		const input = StatusLineInput.import(JSON.parse(raw), "input");
		stdout.write(`${new StatusLine(input).render()}\n`);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}

	static async #readInput(): Promise<string> {
		return await new Promise(resolve => {
			let raw = String.empty;
			stdin.setEncoding("utf8");
			stdin.on("data", chunk => raw += chunk);
			stdin.on("end", () => resolve(raw));
		});
	}
}
//#endregion
