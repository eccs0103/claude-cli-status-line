"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { SettingsService } from "../services/settings-service.js";
import { StatusLine } from "../services/status-line.js";
import { InputService } from "../services/input-service.js";

const { stdout, stderr } = process;

//#region Status line controller
export class StatusLineController extends Controller {
	#serviceSettings: SettingsService = new SettingsService();
	#serviceInput: InputService = new InputService();

	async run(): Promise<void> {
		const serviceSettings = this.#serviceSettings;
		const serviceInput = this.#serviceInput;

		const settings = await serviceSettings.read();
		const input = await serviceInput.read();
		const output = new StatusLine(input, settings).render();
		stdout.write(`${output}\n`);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
