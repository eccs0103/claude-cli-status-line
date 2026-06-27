#!/usr/bin/env node
"use strict";

import "adaptive-extender/node";
import { EntryController } from "./controllers/entry-controller.js";

await EntryController.launch<[]>();
