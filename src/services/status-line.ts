"use strict";

import "adaptive-extender/node";
import { execSync, type StdioOptions } from "child_process";
import { type RateLimit, type StatusLineInput } from "../models/status-line-input.js";

const { round, max, trunc } = Math;

//#region Status line
export class StatusLine {
	static #RESET: string = "\x1b[0m";
	static #BOLD: string = "\x1b[1m";
	static #DIM: string = "\x1b[2m";
	static #CYAN: string = "\x1b[36m";
	static #MAGENTA: string = "\x1b[35m";
	static #BLUE: string = "\x1b[34m";
	static #GREEN: string = "\x1b[32m";
	static #YELLOW: string = "\x1b[33m";
	static #RED: string = "\x1b[31m";
	static #BLOCK: string = "█";
	static #SHADE: string = "░";
	static #SEPARATOR: string = ` \x1b[2m \x1b[0m `;

	#input: StatusLineInput;

	constructor(input: StatusLineInput) {
		this.#input = input;
	}

	static #colorOf(available: number): string {
		if (available <= 10) return this.#RED;
		if (available <= 30) return this.#YELLOW;
		return this.#GREEN;
	}

	static #makeBar(percent: number, width: number = 10): string {
		const filled = round((percent / 100 * width).clamp(0, width));
		return this.#BLOCK.repeat(filled) + this.#SHADE.repeat(width - filled);
	}

	static #renderAvailability(available: number): string {
		const color = this.#colorOf(available);
		return `${color}${this.#makeBar(available)}${this.#RESET} ${color}${available}%${this.#RESET}`;
	}

	static #renderCountdown(resetsAt: number, divisor: number, label: string): string {
		const seconds = max(0, resetsAt - trunc(Date.now() / 1000));
		const value = (seconds / divisor).toFixed(1).replace(/\.0$/, String.empty);
		return ` ${this.#DIM}for ${value}/${label}${this.#RESET}`;
	}

	static #renderRateLimit(limit: RateLimit | null, divisor: number, label: string): string | null {
		if (limit?.usedPercentage == null) return null;
		const available = 100 - round(limit.usedPercentage);
		const countdown = limit.resetsAt != null ? this.#renderCountdown(limit.resetsAt, divisor, label) : String.empty;
		return this.#renderAvailability(available) + countdown;
	}

	static #renderContextWindow(percent: number | null): string | null {
		if (percent === null) return null;
		const available = 100 - round(percent);
		return `${this.#renderAvailability(available)} ${this.#DIM}#${this.#RESET}`;
	}

	static #readBranch(directory: string): string | null {
		try {
			const stdio: StdioOptions = ["pipe", "pipe", "pipe"];
			return execSync(`git -C "${directory.replace(/"/g, '\\"')}" --no-optional-locks rev-parse --abbrev-ref HEAD`, { stdio })
				.toString()
				.trim()
				.insteadEmpty(null);
		} catch {
			return null;
		}
	}

	render(): string {
		const { workspace, model, rateLimits, contextWindow } = this.#input;

		const directory = workspace?.currentDir ?? null;
		const folder = directory?.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
		const branch = directory !== null ? StatusLine.#readBranch(directory) : null;
		const agent = model?.displayName ?? null;
		const segments: string[] = [];

		segments.push(`${StatusLine.#CYAN}${StatusLine.#BOLD}${folder ?? String.empty}${StatusLine.#RESET}`);

		if (branch !== null) segments.push(`${StatusLine.#MAGENTA}${branch}${StatusLine.#RESET}`);

		if (agent === null) return segments.join(StatusLine.#SEPARATOR);
		segments.push(`${StatusLine.#BLUE}${agent}${StatusLine.#RESET}`);

		const fiveHour = StatusLine.#renderRateLimit(rateLimits?.fiveHour ?? null, 3_600, "5 h");
		if (fiveHour !== null) segments.push(fiveHour);

		const sevenDay = StatusLine.#renderRateLimit(rateLimits?.sevenDay ?? null, 86_400, "7 d");
		if (sevenDay !== null) segments.push(sevenDay);

		const context = StatusLine.#renderContextWindow(contextWindow?.usedPercentage ?? null);
		if (context !== null) segments.push(context);

		return segments.join(StatusLine.#SEPARATOR);
	}
}
//#endregion
