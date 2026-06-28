"use strict";

import "adaptive-extender/node";
import AsyncFileSystem from "fs/promises";
import OperationSystem from "os";
import path from "path";
import { Settings } from "../models/settings.js";

//#region Settings service
export class SettingsService {
	#directory: string;
	#file: string;

	constructor(isDevelopment: boolean) {
		this.#directory = SettingsService.#readDirectory(isDevelopment);
		this.#file = path.join(this.#directory, "status-line.config.json");
	}

	static #readDirectory(isDevelopment: boolean): string {
		if (isDevelopment) return path.join(process.cwd(), "resources", "data");
		return path.join(OperationSystem.homedir(), ".claude");
	}

	async read(): Promise<Settings> {
		try {
			const raw = await AsyncFileSystem.readFile(this.#file, "utf8");
			return Settings.import(JSON.parse(raw), "settings");
		} catch {
			const settings = Settings.newDefault;
			void this.write(settings);
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
