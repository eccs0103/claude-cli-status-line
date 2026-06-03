#!/usr/bin/env node
"use strict";

import "adaptive-extender/node";
import { StatusLineController } from "./controllers/status-line-controller.js";

await StatusLineController.launch();
