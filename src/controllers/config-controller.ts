"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { cancel, confirm, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import { Bar, BranchSegment, ContextSegment, DirectorySegment, FiveHourSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { SettingsService } from "../services/settings-service.js";

const { stderr, stdout } = process;

//#region Config controller
export class ConfigController extends Controller {
	static readonly #ALL_KINDS: readonly string[] = [
		"DirectorySegment",
		"BranchSegment",
		"ModelSegment",
		"SevenDaySegment",
		"FiveHourSegment",
		"ContextSegment",
	];

	static readonly #PALETTE: ReadonlyArray<{ value: string; label: string; }> = [
		{ value: "cyan", label: "\x1b[36mCyan\x1b[0m" },
		{ value: "magenta", label: "\x1b[35mMagenta\x1b[0m" },
		{ value: "blue", label: "\x1b[34mBlue\x1b[0m" },
		{ value: "green", label: "\x1b[32mGreen\x1b[0m" },
		{ value: "yellow", label: "\x1b[33mYellow\x1b[0m" },
		{ value: "red", label: "\x1b[31mRed\x1b[0m" },
		{ value: "white", label: "White" },
	];

	static #labelOf(kind: string): string {
		switch (kind) {
		case "DirectorySegment": return "Directory";
		case "BranchSegment": return "Branch";
		case "ModelSegment": return "Model";
		case "SevenDaySegment": return "7-day limit";
		case "FiveHourSegment": return "5-hour limit";
		case "ContextSegment": return "Context";
		default: throw new TypeError(`Unknown segment kind '${kind}'`);
		}
	}

	static #kindOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return "DirectorySegment";
		if (segment instanceof BranchSegment) return "BranchSegment";
		if (segment instanceof ModelSegment) return "ModelSegment";
		if (segment instanceof SevenDaySegment) return "SevenDaySegment";
		if (segment instanceof FiveHourSegment) return "FiveHourSegment";
		if (segment instanceof ContextSegment) return "ContextSegment";
		throw new TypeError(`Unknown segment type '${typename(segment)}'`);
	}

	static #colorOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return segment.color;
		if (segment instanceof BranchSegment) return segment.color;
		if (segment instanceof ModelSegment) return segment.color;
		return "cyan";
	}

	static #thresholdsOf(segment: Segment): Thresholds {
		if (segment instanceof SevenDaySegment) return segment.thresholds;
		if (segment instanceof FiveHourSegment) return segment.thresholds;
		if (segment instanceof ContextSegment) return segment.thresholds;
		return new Thresholds(30, 10);
	}

	static #barOf(segment: Segment): Bar {
		if (segment instanceof SevenDaySegment) return segment.bar;
		if (segment instanceof FiveHourSegment) return segment.bar;
		if (segment instanceof ContextSegment) return segment.bar;
		return new Bar(10, "█", "░");
	}

	static #buildSegment(kind: string, enabled: boolean, color: string, thresholds: Thresholds, bar: Bar): Segment {
		switch (kind) {
		case "DirectorySegment": return new DirectorySegment(enabled, color);
		case "BranchSegment": return new BranchSegment(enabled, color);
		case "ModelSegment": return new ModelSegment(enabled, color);
		case "SevenDaySegment": return new SevenDaySegment(enabled, thresholds, bar);
		case "FiveHourSegment": return new FiveHourSegment(enabled, thresholds, bar);
		case "ContextSegment": return new ContextSegment(enabled, thresholds, bar);
		default: throw new TypeError(`Unknown segment kind '${kind}'`);
		}
	}

	static #isLabelKind(kind: string): boolean {
		switch (kind) {
		case "DirectorySegment":
		case "BranchSegment":
		case "ModelSegment": return true;
		default: return false;
		}
	}

	async run(): Promise<void> {
		if (!stdout.isTTY) {
			stderr.write("Run 'claude-cli-status-line config' in an interactive terminal.\n");
			return;
		}

		const service = new SettingsService();
		const settings = await service.read();

		intro("Status line config");

		// --- Segments ---
		const currentByKind = new Map<string, Segment>(settings.segments.map(segment => [ConfigController.#kindOf(segment), segment]));
		const currentEnabledKinds = settings.segments.filter(s => s.enabled).map(s => ConfigController.#kindOf(s));

		const enabledResult = await multiselect<string>({
			message: "Segments",
			options: ConfigController.#ALL_KINDS.map(k => ({ value: k, label: ConfigController.#labelOf(k) })),
			initialValues: currentEnabledKinds,
			required: false,
		});
		if (isCancel(enabledResult)) { cancel(); return; }
		const enabledKinds = enabledResult;

		// --- Order (only when more than one segment is enabled) ---
		let orderedKinds: string[];
		if (enabledKinds.length <= 1) {
			orderedKinds = [...enabledKinds];
		} else {
			// Seed the remaining list from the current order (enabled first), appending newly toggled-on kinds
			const seeded = currentEnabledKinds.filter(k => enabledKinds.includes(k));
			for (const kind of enabledKinds) {
				if (!seeded.includes(kind)) seeded.push(kind);
			}

			orderedKinds = [];
			const remaining = [...seeded];

			for (let i = 0; i < enabledKinds.length - 1; i++) {
				if (remaining.length === 1) {
					orderedKinds.push(remaining[0]!);
					break;
				}
				const orderResult = await select<string>({
					message: `Position ${i + 1}`,
					options: remaining.map(k => ({ value: k, label: ConfigController.#labelOf(k) })),
				});
				if (isCancel(orderResult)) { cancel(); return; }
				orderedKinds.push(orderResult);
				remaining.splice(remaining.indexOf(orderResult), 1);
			}
			if (remaining.length === 1) orderedKinds.push(remaining[0]!);
		}

		// --- Colors (opt-in, label segments only) ---
		const colorByKind = new Map<string, string>();
		for (const kind of ConfigController.#ALL_KINDS) {
			const existing = currentByKind.get(kind);
			colorByKind.set(kind, existing !== undefined ? ConfigController.#colorOf(existing) : "cyan");
		}

		const customizeColors = await confirm({ message: "Customize colors?", initialValue: false });
		if (isCancel(customizeColors)) { cancel(); return; }

		if (customizeColors) {
			const labelKinds = orderedKinds.filter(k => ConfigController.#isLabelKind(k));
			for (const kind of labelKinds) {
				const colorResult = await select<string>({
					message: ConfigController.#labelOf(kind),
					options: ConfigController.#PALETTE as { value: string; label: string; }[],
					initialValue: colorByKind.get(kind),
				});
				if (isCancel(colorResult)) { cancel(); return; }
				colorByKind.set(kind, colorResult);
			}
		}

		// --- Thresholds (opt-in, applied to all gauge segments) ---
		const firstGauge = settings.segments.find(s => s instanceof SevenDaySegment || s instanceof FiveHourSegment || s instanceof ContextSegment);
		let sharedThresholds = firstGauge !== undefined ? ConfigController.#thresholdsOf(firstGauge) : new Thresholds(30, 10);

		const customizeThresholds = await confirm({ message: "Customize thresholds?", initialValue: false });
		if (isCancel(customizeThresholds)) { cancel(); return; }

		if (customizeThresholds) {
			const curYellow = sharedThresholds.yellow;
			const curRed = sharedThresholds.red;

			const yellowResult = await text({
				message: "Yellow below %",
				defaultValue: String(curYellow),
				placeholder: String(curYellow),
				validate: v => { const n = Number(v); if (isNaN(n) || n < 1 || n > 99) return "Enter 1–99"; },
			});
			if (isCancel(yellowResult)) { cancel(); return; }
			const yellow = Number(yellowResult || curYellow);

			const redResult = await text({
				message: "Red below %",
				defaultValue: String(curRed),
				placeholder: String(curRed),
				validate: v => { const n = Number(v); if (isNaN(n) || n < 1 || n >= yellow) return `Enter 1–${yellow - 1}`; },
			});
			if (isCancel(redResult)) { cancel(); return; }
			sharedThresholds = new Thresholds(yellow, Number(redResult || curRed));
		}

		// --- Bar (opt-in, applied to all gauge segments) ---
		const firstGaugeBar = firstGauge !== undefined ? ConfigController.#barOf(firstGauge) : new Bar(10, "█", "░");
		let sharedBar = firstGaugeBar;

		const customizeBar = await confirm({ message: "Customize bar?", initialValue: false });
		if (isCancel(customizeBar)) { cancel(); return; }

		if (customizeBar) {
			const curWidth = sharedBar.width;
			const curFilled = sharedBar.filled;
			const curEmpty = sharedBar.empty;

			const widthResult = await text({
				message: "Bar width",
				defaultValue: String(curWidth),
				placeholder: String(curWidth),
				validate: v => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 30) return "Enter 1–30"; },
			});
			if (isCancel(widthResult)) { cancel(); return; }

			const filledResult = await text({ message: "Filled char", defaultValue: curFilled, placeholder: curFilled });
			if (isCancel(filledResult)) { cancel(); return; }

			const emptyResult = await text({ message: "Empty char", defaultValue: curEmpty, placeholder: curEmpty });
			if (isCancel(emptyResult)) { cancel(); return; }

			sharedBar = new Bar(
				Number(widthResult || curWidth),
				(filledResult as string) || curFilled,
				(emptyResult as string) || curEmpty,
			);
		}

		// --- Assemble settings ---
		const disabledKinds = ConfigController.#ALL_KINDS.filter(k => !enabledKinds.includes(k));
		const finalKinds = [...orderedKinds, ...disabledKinds];
		const segments: Segment[] = finalKinds.map(k =>
			ConfigController.#buildSegment(k, enabledKinds.includes(k), colorByKind.get(k) ?? "cyan", sharedThresholds, sharedBar),
		);

		await service.write(new Settings(segments));
		outro("Saved");
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
