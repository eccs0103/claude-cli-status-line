"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { SettingsService } from "../services/settings-service.js";
import { StatusLine } from "../view/status-line.js";
import { InputService } from "../services/input-service.js";

const { stdout } = process;

//#region Status line controller
export class StatusLineController extends Controller<[boolean]> {
	#inputService: InputService = new InputService();

	async run(isDevelopment: boolean): Promise<void> {
		const settingsService = new SettingsService(isDevelopment);
		const settings = await settingsService.read();
		const input = await this.#inputService.read();
		const output = new StatusLine(input, settings).render();
		stdout.write(`${output}\n`);
	}
}
//#endregion
