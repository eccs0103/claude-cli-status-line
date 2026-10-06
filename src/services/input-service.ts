"use strict";

import "adaptive-extender/node";
import StreamConsumers from "node:stream/consumers";
import { StatusLineInput } from "../models/status-line-input.js";

const { stdin } = process;

//#region Input service
export class InputService {
	async read(): Promise<StatusLineInput> {
		const raw = await StreamConsumers.text(stdin);
		return StatusLineInput.import(JSON.parse(raw), "input");
	}
}
//#endregion
