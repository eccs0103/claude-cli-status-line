"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { ConfigurationController } from "./configuration-controller.js";
import { StatusLineController } from "./status-line-controller.js";

const { argv, stderr } = process;

//#region Entry controller
export class EntryController extends Controller {
	async run(): Promise<void> {
		const parameters = new Set(argv.slice(2));
		const isConfiguration = parameters.has("config");
		const isDevelopment = parameters.has("--dev");

		if (isConfiguration) return await ConfigurationController.launch(isDevelopment);
		return await StatusLineController.launch(isDevelopment);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
