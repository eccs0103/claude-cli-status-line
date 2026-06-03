#!/usr/bin/env node
"use strict";

import { execSync } from "child_process";

//#region Types

interface RateLimit {
	used_percentage?: number | null;
	resets_at?: number | null;
}

interface StatusLineInput {
	workspace?: { current_dir?: string };
	model?: { display_name?: string };
	rate_limits?: {
		five_hour?: RateLimit;
		seven_day?: RateLimit;
	};
	context_window?: { used_percentage?: number | null };
}

//#endregion

//#region ANSI

const ESC = "\x1b";
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const CYAN = `${ESC}[36m`;
const MAGENTA = `${ESC}[35m`;
const BLUE = `${ESC}[34m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const RED = `${ESC}[31m`;

const FULL = "█";
const LIGHT = "░";
const DOT = "·";
const SEP = ` ${DIM}${DOT}${RESET} `;

//#endregion

//#region Render

function makeBar(avail: number, width: number = 10): string {
	const filled = Math.max(0, Math.min(width, Math.round(avail / 100 * width)));
	return FULL.repeat(filled) + LIGHT.repeat(width - filled);
}

function availColor(avail: number): string {
	if (avail <= 10) return RED;
	if (avail <= 30) return YELLOW;
	return GREEN;
}

//#endregion

//#region Entry point

const { stdin, stdout } = process;

let raw = "";
stdin.setEncoding("utf8");
stdin.on("data", (chunk: string) => { raw += chunk; });
stdin.on("end", () => {
	const json = JSON.parse(raw) as StatusLineInput;

	const cwd = json.workspace?.current_dir ?? "";
	const parts = cwd.split(/[\\/]/).filter(Boolean);
	const dir = parts[parts.length - 1] ?? cwd;
	const model = json.model?.display_name ?? "";

	let branch = "";
	try {
		branch = execSync(
			`git -C "${cwd.replace(/"/g, '\\"')}" --no-optional-locks rev-parse --abbrev-ref HEAD`,
			{ stdio: ["pipe", "pipe", "pipe"] }
		).toString().trim();
	} catch { }

	let out = `${CYAN}${BOLD}${dir}${RESET}`;
	if (branch) out += `${SEP}${MAGENTA}${branch}${RESET}`;
	if (!model) { stdout.write(out + "\n"); return; }
	out += `${SEP}${BLUE}${model}${RESET}`;

	const now = Math.floor(Date.now() / 1000);

	const five = json.rate_limits?.five_hour;
	if (five != null && five.used_percentage != null) {
		const avail = 100 - Math.round(five.used_percentage);
		const col = availColor(avail);
		const bar = makeBar(avail);
		let timeStr = "";
		if (five.resets_at) {
			const h = Math.max(0, (five.resets_at - now) / 3600);
			const hFmt = h.toFixed(1).replace(/\.0$/, "");
			timeStr = ` ${DIM}for ${hFmt}/5 h${RESET}`;
		}
		out += `${SEP}${col}${bar}${RESET} ${col}${avail}%${RESET}${timeStr}`;
	}

	const week = json.rate_limits?.seven_day;
	if (week != null && week.used_percentage != null) {
		const avail = 100 - Math.round(week.used_percentage);
		const col = availColor(avail);
		const bar = makeBar(avail);
		let timeStr = "";
		if (week.resets_at) {
			const d = Math.max(0, (week.resets_at - now) / 86400);
			const dFmt = d.toFixed(1).replace(/\.0$/, "");
			timeStr = ` ${DIM}for ${dFmt}/7 d${RESET}`;
		}
		out += `${SEP}${col}${bar}${RESET} ${col}${avail}%${RESET}${timeStr}`;
	}

	const ctxPct = json.context_window?.used_percentage;
	if (ctxPct != null) {
		const avail = 100 - Math.round(ctxPct);
		const col = availColor(avail);
		const bar = makeBar(avail);
		out += `${SEP}${col}${bar}${RESET} ${col}${avail}%${RESET} ${DIM}ctx${RESET}`;
	}

	stdout.write(out + "\n");
});

//#endregion
