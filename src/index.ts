"use strict";

import "adaptive-extender/node";
import { ConfigController } from "./controllers/config-controller.js";
import { StatusLineController } from "./controllers/status-line-controller.js";

const { argv } = process;
const [, , section] = argv;
if (section === "config") await ConfigController.launch();
else await StatusLineController.launch();
