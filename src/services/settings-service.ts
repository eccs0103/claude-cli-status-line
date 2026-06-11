"use strict";

import "adaptive-extender/node";
import AsyncFileSystem from "fs/promises";
import OperationSystem from "os";
import path from "path";
import { Settings } from "../models/settings.js";

//#region Settings service
export class SettingsService {
	static #directory: string = path.join(OperationSystem.homedir(), ".claude");
	static #path: string = path.join(SettingsService.#directory, "status-line.config.json");

	async read(): Promise<Settings> {
		try {
			const raw = await AsyncFileSystem.readFile(SettingsService.#path, "utf8");
			return Settings.import(JSON.parse(raw), "settings");
		} catch {
			const settings = Settings.newDefault;
			void this.write(settings);
			return settings;
		}
	}

	async write(settings: Settings): Promise<void> {
		await AsyncFileSystem.mkdir(SettingsService.#directory, { recursive: true });
		await AsyncFileSystem.writeFile(SettingsService.#path, JSON.stringify(Settings.export(settings), undefined, "\t"), "utf8");
	}
}
//#endregion
