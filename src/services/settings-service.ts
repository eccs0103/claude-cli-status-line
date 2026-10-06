"use strict";

import "adaptive-extender/node";
import AsyncFileSystem from "node:fs/promises";
import OperationSystem from "node:os";
import Path from "node:path";
import { Settings } from "../models/settings.js";

//#region Settings service
export class SettingsService {
	#directory: string;
	#file: string;

	constructor(isDevelopment: boolean) {
		this.#directory = SettingsService.#readDirectory(isDevelopment);
		this.#file = Path.join(this.#directory, "status-line.config.json");
	}

	static #readDirectory(isDevelopment: boolean): string {
		if (isDevelopment) return Path.join(process.cwd(), "resources", "data");
		return Path.join(OperationSystem.homedir(), ".claude");
	}

	static #isMissing(reason: unknown): boolean {
		return reason instanceof Error && "code" in reason && reason.code === "ENOENT";
	}

	async read(): Promise<Settings> {
		try {
			const raw = await AsyncFileSystem.readFile(this.#file, "utf8");
			return Settings.import(JSON.parse(raw), "settings");
		} catch (reason) {
			if (!SettingsService.#isMissing(reason)) throw Error.from(reason);
			const settings = Settings.newDefault;
			await this.write(settings);
			return settings;
		}
	}

	async write(settings: Settings): Promise<void> {
		await AsyncFileSystem.mkdir(this.#directory, { recursive: true });
		const raw = JSON.stringify(Settings.export(settings), undefined, "\t");
		await AsyncFileSystem.writeFile(this.#file, raw, "utf8");
	}
}
//#endregion
