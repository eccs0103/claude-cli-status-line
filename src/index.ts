"use strict";

import "adaptive-extender/node";
import { ConfigurationController } from "./controllers/config-controller.js";
import { StatusLineController } from "./controllers/status-line-controller.js";

const { argv } = process;
const [, , section] = argv;
if (section === "config") await ConfigurationController.launch();
else await StatusLineController.launch();
