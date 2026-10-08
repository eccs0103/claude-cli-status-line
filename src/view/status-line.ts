"use strict";

import "adaptive-extender/node";
import ChildProcess, { type StdioOptions } from "node:child_process";
import { Timespan } from "adaptive-extender/node";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds, TimeFormat } from "../models/settings.js";
import { type ContextWindow, type Effort, type PromptCache, type RateLimit, type StatusLineInput } from "../models/status-line-input.js";
import { ColorSystem, Style } from "./color-system.js";

const { max, trunc } = Math;

//#region Status line
export class StatusLine {
	static #separator: string = ` ${ColorSystem.paint(" ", Style.dim)} `;

	#input: StatusLineInput;
	#settings: Settings;

	constructor(input: StatusLineInput, settings: Settings) {
		this.#input = input;
		this.#settings = settings;
	}

	static #renderAvailability(available: number, thresholds: Thresholds, bar: Bar): string {
		const color = thresholds.color(available);
		return `${ColorSystem.paint(bar.draw(available), color)} ${ColorSystem.paint(`${available}%`, color)}`;
	}

	static #formatClock(seconds: number): string {
		const span = Timespan.fromValue(seconds * 1000);
		const parts: string[] = [];
		if (span.days > 0) parts.push(`${span.days}d`);
		if (span.hours > 0) parts.push(`${span.hours}h`);
		if (span.minutes > 0) parts.push(`${span.minutes}m`);
		return parts.slice(0, 2).join(" ").insteadEmpty("0m");
	}

	static #renderCountdown(reset: number, divisor: number, label: string, format: TimeFormat): string {
		const seconds = max(0, reset - trunc(Date.now() / 1000));
		if (format === TimeFormat.clock) return ` ${ColorSystem.paint(`for ${StatusLine.#formatClock(seconds)}`, Style.dim)}`;
		const value = (seconds / divisor).toFixed(1).replace(/\.0$/, String.empty);
		return ` ${ColorSystem.paint(`for ${value}/${label}`, Style.dim)}`;
	}

	static #renderRateLimit(limit: RateLimit | null, divisor: number, label: string, thresholds: Thresholds, bar: Bar, format: TimeFormat): string | null {
		if (limit === null) return null;
		const { available, reset } = limit;
		if (available === null) return null;
		const countdown = reset !== null ? StatusLine.#renderCountdown(reset, divisor, label, format) : String.empty;
		return StatusLine.#renderAvailability(available, thresholds, bar) + countdown;
	}

	static #drawCache(cache: PromptCache | null): string | null {
		if (cache === null) return null;
		const { remaining } = cache;
		if (remaining === null) return ColorSystem.paint("cold", Color.red);
		return ColorSystem.paint(StatusLine.#formatClock(remaining), Style.dim);
	}

	static #renderContextWindow(context: ContextWindow | null, cache: PromptCache | null, segment: ContextSegment): string | null {
		if (context === null) return null;
		const { available } = context;
		if (available === null) return null;
		const gauge = `${StatusLine.#renderAvailability(available, segment.thresholds, segment.bar)} ${ColorSystem.paint("#", Style.dim)}`;
		const tail = segment.cache ? StatusLine.#drawCache(cache) : null;
		if (tail === null) return gauge;
		return `${gauge} ${tail}`;
	}

	static #drawModel(agent: string | null, effort: Effort | null, fast: boolean | null, segment: ModelSegment): string | null {
		if (agent === null) return null;
		const { color } = segment;
		if (!segment.effort) return ColorSystem.paint(agent, color);
		const level = effort?.level ?? null;
		let text = agent;
		if (level !== null) text += ` (${level})`;
		if (fast === true) text += "⚡";
		return ColorSystem.paint(text, color);
	}

	static #readBranch(directory: string): string | null {
		try {
			const stdio: StdioOptions = ["pipe", "pipe", "pipe"];
			return ChildProcess.execSync(`git -C "${directory.replace(/"/g, '\\"')}" --no-optional-locks rev-parse --abbrev-ref HEAD`, { stdio }).toString().insteadWhitespace(null);
		} catch {
			return null;
		}
	}

	static #resolveBranch(branch: string | null, directory: string | null): string | null {
		if (branch !== null) return branch;
		if (directory === null) return null;
		return StatusLine.#readBranch(directory);
	}

	#renderSegment(segment: Segment, folder: string | null, branch: string | null, agent: string | null, format: TimeFormat): string | null {
		const { limits, context, cache, effort, fast } = this.#input;
		if (segment instanceof DirectorySegment) return folder !== null ? ColorSystem.paint(ColorSystem.paint(folder, Style.bold), segment.color) : null;
		if (segment instanceof BranchSegment) return branch !== null ? ColorSystem.paint(branch, segment.color) : null;
		if (segment instanceof ModelSegment) return StatusLine.#drawModel(agent, effort, fast, segment);
		if (segment instanceof SevenDaySegment) return StatusLine.#renderRateLimit(limits?.sevenDay ?? null, 86_400, "7 d", segment.thresholds, segment.bar, format);
		if (segment instanceof FiveHourSegment) return StatusLine.#renderRateLimit(limits?.fiveHour ?? null, 3_600, "5 h", segment.thresholds, segment.bar, format);
		if (segment instanceof ContextSegment) return StatusLine.#renderContextWindow(context, cache, segment);
		return null;
	}

	render(): string {
		const { workspace, branch, model, worktree } = this.#input;
		const { segments, timeFormat } = this.#settings;

		const directory = workspace?.directory ?? null;
		const folder = workspace?.folder ?? null;
		const fallback = branch ?? worktree?.branch ?? null;
		const resolved = StatusLine.#resolveBranch(fallback, directory);
		const agent = model?.name ?? null;

		const result: string[] = [];
		for (const segment of segments) {
			if (!segment.enabled) continue;
			const rendered = this.#renderSegment(segment, folder, resolved, agent, timeFormat);
			if (rendered === null) continue;
			result.push(rendered);
		}
		return result.join(StatusLine.#separator);
	}
}
//#endregion
