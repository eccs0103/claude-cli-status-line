"use strict";

import "adaptive-extender/node";
import { URI } from "adaptive-extender/node";
import { defineConfig } from "vite";
import { type ViteConfig } from "./environment/configs/vite-config.js";
import { NodeConfig } from "./environment/configs/node-config.js";
import { type VitePlugin } from "./environment/plugins/vite-plugin.js";

export default defineConfig(async (env) => {
	const root: URI = new URI(import.meta.url);
	const inputs: URI[] = [
		new URI("./src/index.ts", root),
	];
	const source: URI = new URI("./src/", root);
	const output: URI = new URI("./dist", root);
	const externals: string[] = [];
	const plugins: VitePlugin[] = [];
	const config: ViteConfig = await NodeConfig.construct(inputs, source, output, externals, plugins);
	return config.build();
});
