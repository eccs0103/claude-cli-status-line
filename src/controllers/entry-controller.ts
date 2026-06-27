"use strict";

import "adaptive-extender/node";
import { ConfigurationController } from "./configuration-controller.js";
import { StatusLineController } from "./status-line-controller.js";
import { Controller } from "adaptive-extender/node";

const { argv, stderr } = process;

//#region Entry controller
export class EntryController extends Controller {
	async run(): Promise<void> {
		const [, , section] = argv;
		switch (section) {
		case undefined: return await StatusLineController.launch();
		case "config": return await ConfigurationController.launch();
		default: throw new TypeError(`Invalid '${section}' argument for section`);
		}
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
