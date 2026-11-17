"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import StreamConsumers from "node:stream/consumers";
import { SettingsService } from "../services/settings-service.js";
import { StatusLine } from "../view/status-line.js";
import { StatusLineInput } from "../models/status-line-input.js";

const { stdin, stdout } = process;

//#region Status line controller
export class StatusLineController extends Controller<[boolean]> {
	async run(isDevelopment: boolean): Promise<void> {
		const service = new SettingsService(isDevelopment);
		const settings = await service.read();
		const raw = await StreamConsumers.text(stdin);
		const input = StatusLineInput.import(JSON.parse(raw), "input");
		const output = new StatusLine(input, settings).render();
		stdout.write(`${output}\n`);
	}
}
//#endregion
