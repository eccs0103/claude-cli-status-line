#!/usr/bin/env node
"use strict";

import "adaptive-extender/node";
import { ConfigurationController } from "./controllers/configuration-controller.js";
import { StatusLineController } from "./controllers/status-line-controller.js";
import { SingleSelectionMenu } from "./services/menu.js";

const [, , section] = process.argv;
switch (section) {
case undefined: await StatusLineController.launch(); break;
case "config": await ConfigurationController.launch(); break;
default: throw new TypeError(`Invalid '${section}' argument for section`);
}















const ssm = new SingleSelectionMenu("Exit");
ssm.atOption("Save & exit", () => {
	// await this.#service.write(settings);
	throw new Error("Method not implemented"); // outro("Saved");
});
ssm.atOption("Discard changes", () => {
	throw new Error("Method not implemented"); // cancel("Discarded");
});
