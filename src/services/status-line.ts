"use strict";

import "adaptive-extender/node";
import { execSync, type StdioOptions } from "child_process";
import { Bar, BranchSegment, ContextSegment, DirectorySegment, FiveHourSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { type RateLimit, type RateLimits, type StatusLineInput } from "../models/status-line-input.js";

const { round, max, trunc } = Math;

//#region Status line
export class StatusLine {
	static #RESET: string = "\x1b[0m";
	static #BOLD: string = "\x1b[1m";
	static #DIM: string = "\x1b[2m";
	static #SEPARATOR: string = ` \x1b[2m \x1b[0m `;

	#input: StatusLineInput;
	#settings: Settings;

	constructor(input: StatusLineInput, settings: Settings) {
		this.#input = input;
		this.#settings = settings;
	}

	static #paint(name: string): string {
		switch (name) {
		case "cyan": return "\x1b[36m";
		case "magenta": return "\x1b[35m";
		case "blue": return "\x1b[34m";
		case "green": return "\x1b[32m";
		case "yellow": return "\x1b[33m";
		case "red": return "\x1b[31m";
		case "white": return "\x1b[37m";
		default: return StatusLine.#RESET;
		}
	}

	static #colorOf(available: number, thresholds: Thresholds): string {
		if (available <= thresholds.red) return "\x1b[31m";
		if (available <= thresholds.yellow) return "\x1b[33m";
		return "\x1b[32m";
	}

	static #makeBar(percent: number, bar: Bar): string {
		const count = round((percent / 100 * bar.width).clamp(0, bar.width));
		return bar.filled.repeat(count) + bar.empty.repeat(bar.width - count);
	}

	static #renderAvailability(available: number, thresholds: Thresholds, bar: Bar): string {
		const color = this.#colorOf(available, thresholds);
		return `${color}${this.#makeBar(available, bar)}${this.#RESET} ${color}${available}%${this.#RESET}`;
	}

	static #renderCountdown(resetsAt: number, divisor: number, label: string): string {
		const seconds = max(0, resetsAt - trunc(Date.now() / 1000));
		const value = (seconds / divisor).toFixed(1).replace(/\.0$/, String.empty);
		return ` ${this.#DIM}for ${value}/${label}${this.#RESET}`;
	}

	static #renderRateLimit(limit: RateLimit | null, divisor: number, label: string, thresholds: Thresholds, bar: Bar): string | null {
		if (limit?.usedPercentage == null) return null;
		const available = 100 - round(limit.usedPercentage);
		const countdown = limit.resetsAt != null ? this.#renderCountdown(limit.resetsAt, divisor, label) : String.empty;
		return this.#renderAvailability(available, thresholds, bar) + countdown;
	}

	static #renderContextWindow(percent: number | null, thresholds: Thresholds, bar: Bar): string | null {
		if (percent === null) return null;
		const available = 100 - round(percent);
		return `${this.#renderAvailability(available, thresholds, bar)} ${this.#DIM}#${this.#RESET}`;
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

	#renderSegment(segment: Segment, folder: string | null, branch: string | null, agent: string | null, rateLimits: RateLimits | null | undefined): string | null {
		if (segment instanceof DirectorySegment) return `${StatusLine.#paint(segment.color)}${StatusLine.#BOLD}${folder ?? String.empty}${StatusLine.#RESET}`;
		if (segment instanceof BranchSegment) return branch !== null ? `${StatusLine.#paint(segment.color)}${branch}${StatusLine.#RESET}` : null;
		if (segment instanceof ModelSegment) return agent !== null ? `${StatusLine.#paint(segment.color)}${agent}${StatusLine.#RESET}` : null;
		if (segment instanceof SevenDaySegment) return StatusLine.#renderRateLimit(rateLimits?.sevenDay ?? null, 86_400, "7 d", segment.thresholds, segment.bar);
		if (segment instanceof FiveHourSegment) return StatusLine.#renderRateLimit(rateLimits?.fiveHour ?? null, 3_600, "5 h", segment.thresholds, segment.bar);
		if (segment instanceof ContextSegment) return StatusLine.#renderContextWindow(this.#input.contextWindow?.usedPercentage ?? null, segment.thresholds, segment.bar);
		return null;
	}

	render(): string {
		const { workspace, model, rateLimits } = this.#input;
		const { segments } = this.#settings;

		const directory = workspace?.currentDir ?? null;
		const folder = directory?.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
		const branch = directory !== null ? StatusLine.#readBranch(directory) : null;
		const agent = model?.displayName ?? null;

		const result: string[] = [];
		for (const segment of segments) {
			if (!segment.enabled) continue;
			const rendered = this.#renderSegment(segment, folder, branch, agent, rateLimits);
			if (rendered === null) continue;
			result.push(rendered);
		}
		return result.join(StatusLine.#SEPARATOR);
	}
}
//#endregion
