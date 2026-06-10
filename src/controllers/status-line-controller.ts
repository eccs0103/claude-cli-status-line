"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { StatusLineInput } from "../models/status-line-input.js";
import { SettingsService } from "../services/settings-service.js";
import { StatusLine } from "../services/status-line.js";

const { stdin, stdout, stderr } = process;

//#region Status line controller
export class StatusLineController extends Controller {
	static async #readInput(): Promise<string> {
		return await new Promise((resolve) => {
			let raw = String.empty;
			stdin.setEncoding("utf8");
			stdin.on("data", chunk => raw += chunk);
			stdin.on("end", () => resolve(raw));
		});
	}

	async run(): Promise<void> {
		const [raw, settings] = await Promise.all([
			StatusLineController.#readInput(),
			new SettingsService().read(),
		]);
		const input = StatusLineInput.import(JSON.parse(raw), "input");
		stdout.write(`${new StatusLine(input, settings).render()}\n`);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
