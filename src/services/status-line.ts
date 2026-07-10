"use strict";

import "adaptive-extender/node";
import { execSync, type StdioOptions } from "child_process";
import { Timespan } from "adaptive-extender/node";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds, TimeFormat } from "../models/settings.js";
import { type RateLimit, type RateLimits, type StatusLineInput } from "../models/status-line-input.js";
import { ColorSystem, Style } from "./color-system.js";

const { round, max, trunc } = Math;

//#region Status line
export class StatusLine {
	static #SEPARATOR: string = ` ${ColorSystem.paint(" ", Style.dim)} `;

	#folder: string | null;
	#branch: string | null;
	#agent: string | null;
	#rateLimits: RateLimits | null;
	#usedPercentage: number | null;
	#timeFormat: TimeFormat;

	constructor(input: StatusLineInput, settings: Settings) {
		const { workspace, gitBranch, model, rateLimits, contextWindow } = input;
		const { segments, timeFormat } = settings;

		const path = workspace?.currentDir ?? null;
		this.#folder = path?.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
		this.#branch = StatusLine.#resolveBranch(gitBranch, path);
		this.#agent = model?.displayName ?? null;
		this.#rateLimits = rateLimits ?? null;
		this.#usedPercentage = contextWindow?.usedPercentage ?? null;
		this.#timeFormat = timeFormat;
	}

	static #colorOf(available: number, thresholds: Thresholds): Color {
		if (available <= thresholds.alert) return Color.red;
		if (available <= thresholds.warn) return Color.yellow;
		return Color.green;
	}

	static #makeBar(percent: number, bar: Bar): string {
		const count = round((percent / 100 * bar.width).clamp(0, bar.width));
		return bar.filled.repeat(count) + bar.empty.repeat(bar.width - count);
	}

	static #renderAvailability(available: number, thresholds: Thresholds, bar: Bar): string {
		const color = StatusLine.#colorOf(available, thresholds);
		return `${ColorSystem.paint(this.#makeBar(available, bar), color)} ${ColorSystem.paint(`${available}%`, color)}`;
	}

	static #makeClock(seconds: number): string {
		const { days, hours, minutes } = Timespan.fromValue(seconds * 1000);
		const parts: string[] = [];
		if (days > 0) parts.push(`${days}d`);
		if (hours > 0) parts.push(`${hours}h`);
		if (minutes > 0) parts.push(`${minutes}m`);
		return parts.slice(0, 2).join(" ").insteadEmpty("0m");
	}

	static #renderCountdown(resetsAt: number, divisor: number, label: string, format: TimeFormat): string {
		const seconds = max(0, resetsAt - trunc(Date.now() / 1000));
		if (format === TimeFormat.clock) return ` ${ColorSystem.paint(`for ${StatusLine.#makeClock(seconds)}`, Style.dim)}`;
		const value = (seconds / divisor).toFixed(1).replace(/\.0$/, String.empty);
		return ` ${ColorSystem.paint(`for ${value}/${label}`, Style.dim)}`;
	}

	static #renderRateLimit(limit: RateLimit | null, divisor: number, label: string, thresholds: Thresholds, bar: Bar, format: TimeFormat): string | null {
		if (limit?.usedPercentage == null) return null;
		const available = 100 - round(limit.usedPercentage);
		const countdown = limit.resetsAt != null ? this.#renderCountdown(limit.resetsAt, divisor, label, format) : String.empty;
		return this.#renderAvailability(available, thresholds, bar) + countdown;
	}

	static #renderContextWindow(percent: number | null, thresholds: Thresholds, bar: Bar): string | null {
		if (percent === null) return null;
		const available = 100 - round(percent);
		return `${this.#renderAvailability(available, thresholds, bar)} ${ColorSystem.paint("#", Style.dim)}`;
	}

	static #readBranch(path: string): string | null {
		try {
			const stdio: StdioOptions = ["pipe", "pipe", "pipe"];
			return execSync(`git -C "${path.replace(/"/g, '\\"')}" --no-optional-locks rev-parse --abbrev-ref HEAD`, { stdio })
				.toString()
				.trim()
				.insteadEmpty(null);
		} catch {
			return null;
		}
	}

	static #resolveBranch(branch: string | null | undefined, path: string | null): string | null {
		if (branch != null) return branch;
		if (path === null) return null;
		return StatusLine.#readBranch(path);
	}

	#renderSegment(segment: Segment, folder: string | null, branch: string | null, agent: string | null, rateLimits: RateLimits | null | undefined, format: TimeFormat): string | null {
		if (segment instanceof DirectorySegment) return ColorSystem.paint(ColorSystem.paint(folder ?? String.empty, Style.bold), segment.color);
		if (segment instanceof BranchSegment) return branch !== null ? ColorSystem.paint(branch, segment.color) : null;
		if (segment instanceof ModelSegment) return agent !== null ? ColorSystem.paint(agent, segment.color) : null;
		if (segment instanceof SevenDaySegment) return StatusLine.#renderRateLimit(rateLimits?.sevenDay ?? null, 86_400, "7 d", segment.thresholds, segment.bar, format);
		if (segment instanceof FiveHourSegment) return StatusLine.#renderRateLimit(rateLimits?.fiveHour ?? null, 3_600, "5 h", segment.thresholds, segment.bar, format);
		if (segment instanceof ContextSegment) return StatusLine.#renderContextWindow(this.#input.contextWindow?.usedPercentage ?? null, segment.thresholds, segment.bar);
		return null;
	}

	render(): string {
		const result: string[] = [];
		for (const segment of segments) {
			if (!segment.enabled) continue;
			const rendered = this.#renderSegment(segment);
			if (rendered === null) continue;
			result.push(rendered);
		}
		return result.join(StatusLine.#SEPARATOR);
	}
}
//#endregion
