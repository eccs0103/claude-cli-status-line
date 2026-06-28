"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { SettingsService } from "../services/settings-service.js";
import { StatusLine } from "../services/status-line.js";
import { InputService } from "../services/input-service.js";

const { stdout } = process;

//#region Status line controller
export class StatusLineController extends Controller<[boolean]> {
	#serviceInput: InputService = new InputService();

	async run(isDevelopment: boolean): Promise<void> {
		const serviceInput = this.#serviceInput;

		const serviceSettings = new SettingsService(isDevelopment);
		const settings = await serviceSettings.read();
		const input = await serviceInput.read();
		const output = new StatusLine(input, settings).render();
		stdout.write(`${output}\n`);
	}
}
//#endregion
