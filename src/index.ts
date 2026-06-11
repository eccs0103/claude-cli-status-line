"use strict";

import "adaptive-extender/node";
import { ConfigurationController } from "./controllers/configuration-controller.js";
import { StatusLineController } from "./controllers/status-line-controller.js";

const [, , section] = process.argv;
switch (section) {
case "config": await ConfigurationController.launch(); break;
default: await StatusLineController.launch(); break;
}
