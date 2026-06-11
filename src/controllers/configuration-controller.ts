"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, type GaugeSegment, type LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { SettingsService } from "../services/settings-service.js";

const { stderr, stdout } = process;

//#region Configuration controller
export class ConfigurationController extends Controller {
	static #ANSI_DEFAULT: string = "\x1b[0m";
	static #ANSI_CYAN = "\x1b[36m";
	static #ANSI_MAGENTA = "\x1b[35m";
	static #ANSI_BLUE = "\x1b[34m";
	static #ANSI_GREEN = "\x1b[32m";
	static #ANSI_YELLOW = "\x1b[33m";
	static #ANSI_RED = "\x1b[31m";
	static #ANSI_WHITE = "\x1b[37m";

	static #isLabel(segment: Segment): segment is LabelSegment {
		return segment instanceof DirectorySegment || segment instanceof BranchSegment || segment instanceof ModelSegment;
	}

	static #isGauge(segment: Segment): segment is GaugeSegment {
		return segment instanceof SevenDaySegment || segment instanceof FiveHourSegment || segment instanceof ContextSegment;
	}

	static #labelOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return "Directory";
		if (segment instanceof BranchSegment) return "Branch";
		if (segment instanceof ModelSegment) return "Model";
		if (segment instanceof SevenDaySegment) return "7-day limit";
		if (segment instanceof FiveHourSegment) return "5-hour limit";
		if (segment instanceof ContextSegment) return "Context";
		throw new TypeError(`Unknown segment type '${typename(segment)}'`);
	}

	static #ansiOf(color: Color): string {
		switch (color) {
		case Color.cyan: return ConfigurationController.#ANSI_CYAN;
		case Color.magenta: return ConfigurationController.#ANSI_MAGENTA;
		case Color.blue: return ConfigurationController.#ANSI_BLUE;
		case Color.green: return ConfigurationController.#ANSI_GREEN;
		case Color.yellow: return ConfigurationController.#ANSI_YELLOW;
		case Color.red: return ConfigurationController.#ANSI_RED;
		case Color.white: return ConfigurationController.#ANSI_WHITE;
		default: return ConfigurationController.#ANSI_DEFAULT;
		}
	}

	async #selectEnabled(segments: Segment[]): Promise<void> {
		const chosen = await multiselect({
			message: "Enabled segments",
			options: segments.map(segment => ({
				value: segment,
				label: ConfigurationController.#labelOf(segment),
			})),
			initialValues: segments.filter(segment => segment.enabled),
			required: false,
		});
		if (isCancel(chosen)) return;

		for (const segment of segments) {
			segment.enabled = chosen.includes(segment);
		}
	}

	async #orderSegments(settings: Settings): Promise<void> {
		const enabled = settings.segments.filter(segment => segment.enabled);
		if (enabled.length <= 1) return;

		const ordered: Segment[] = [];
		const remaining = [...enabled];
		while (remaining.length > 1) {
			const position = ordered.length + 1;
			const chosen = await select({
				message: `Position ${position}`,
				options: remaining.map(segment => ({
					value: segment,
					label: ConfigurationController.#labelOf(segment),
				})),
			});
			if (isCancel(chosen)) return;
			ordered.push(chosen);
			remaining.splice(remaining.indexOf(chosen), 1);
		}
		ordered.push(remaining[0]);

		const disabled = settings.segments.filter(segment => !segment.enabled);
		settings.segments = [...ordered, ...disabled];
	}

	async #editColors(segments: Segment[]): Promise<void> {
		const labels = segments.filter(segment => segment.enabled).filter(ConfigurationController.#isLabel);
		if (labels.length < 1) return;

		while (true) {
			const chosen = await select({
				message: "Colors",
				options: [
					...labels.map(segment => ({
						value: segment as LabelSegment | null,
						label: ConfigurationController.#labelOf(segment),
					})),
					{ value: null as LabelSegment | null, label: "Back" },
				],
			});
			if (isCancel(chosen) || chosen === null) return;

			const color = await select({
				message: ConfigurationController.#labelOf(chosen),
				options: Object.values(Color).map(color => ({
					value: color,
					label: `${ConfigurationController.#ansiOf(color)}${color}${ConfigurationController.#ANSI_DEFAULT}`,
				})),
				initialValue: chosen.color,
			});
			if (isCancel(color)) continue;
			chosen.color = color;
		}
	}

	async #editThresholds(segments: Segment[]): Promise<void> {
		const gauges = segments.filter(ConfigurationController.#isGauge);
		if (gauges.length < 1) return;
		const [gauge] = gauges;
		const current = gauge.thresholds;

		const warnResult = await text({
			message: "Warn below %",
			defaultValue: String(current.warn),
			placeholder: String(current.warn),
			validate(value): Error | undefined {
				const percent = Number(value);
				if (!Number.isInteger(percent)) return new Error(`The percent ${percent} must be a finite integer number`);
				if (1 > percent || percent > 99) return new RangeError(`The percent ${percent} is out of range [1 - 99]`);
			},
		});
		if (isCancel(warnResult)) return;
		const warn = Number(warnResult);

		const alertResult = await text({
			message: "Alert below %",
			defaultValue: String(current.alert),
			placeholder: String(current.alert),
			validate(value): Error | undefined {
				const percent = Number(value);
				if (!Number.isInteger(percent)) return new Error(`The percent ${percent} must be a finite integer number`);
				if (1 > percent || percent >= warn) return new RangeError(`The percent ${percent} is out of range [1 - ${warn})`);
			},
		});
		if (isCancel(alertResult)) return;
		const alert = Number(alertResult);

		for (const segment of gauges) {
			segment.thresholds = new Thresholds(warn, alert);
		}
	}

	async #editBar(segments: Segment[]): Promise<void> {
		const gauges = segments.filter(ConfigurationController.#isGauge);
		if (gauges.length < 1) return;
		const [gauge] = gauges;
		const current = gauge.bar;

		const widthResult = await text({
			message: "Bar width",
			defaultValue: String(current.width),
			placeholder: String(current.width),
			validate(value): Error | undefined {
				const width = Number(value);
				if (!Number.isInteger(width)) return new Error(`The width ${width} must be a finite integer number`);
				if (1 > width || width > 99) return new RangeError(`The width ${width} is out of range [1 - 99]`);
			},
		});
		if (isCancel(widthResult)) return;

		const filledResult = await text({
			message: "Filled string",
			defaultValue: current.filled,
			placeholder: current.filled,
		});
		if (isCancel(filledResult)) return;

		const emptyResult = await text({
			message: "Empty string",
			defaultValue: current.empty,
			placeholder: current.empty,
		});
		if (isCancel(emptyResult)) return;

		for (const segment of gauges) {
			segment.bar = new Bar(Number(widthResult) || current.width, filledResult || current.filled, emptyResult || current.empty);
		}
	}

	async #exitMenu(service: SettingsService, settings: Settings): Promise<boolean> {
		const choice = await select({
			message: "Exit",
			options: [
				{ value: "save", label: "Save & exit" },
				{ value: "discard", label: "Discard changes" },
			],
		});
		if (isCancel(choice)) return false;

		switch (choice) {
		case "save":
			await service.write(settings);
			outro("Saved");
			return true;
		case "discard":
			cancel("Discarded");
			return true;
		}
	}

	async run(): Promise<void> {
		if (!stdout.isTTY) {
			stderr.write("Run 'claude-cli-status-line config' in an interactive terminal.\n");
			return;
		}

		const service = new SettingsService();
		const settings = await service.read();

		intro("Status line");

		while (true) {
			const action = await select({
				message: "Settings",
				options: [
					{ value: "enable", label: "Enable segments" },
					{ value: "order", label: "Order segments" },
					{ value: "colors", label: "Colors" },
					{ value: "thresholds", label: "Thresholds" },
					{ value: "bar", label: "Bar" },
					{ value: "exit", label: "Exit" },
				],
			});

			if (isCancel(action) || action === "exit") {
				const done = await this.#exitMenu(service, settings);
				if (done) return;
				continue;
			}

			switch (action) {
			case "enable": await this.#selectEnabled(settings.segments); break;
			case "order": await this.#orderSegments(settings); break;
			case "colors": await this.#editColors(settings.segments); break;
			case "thresholds": await this.#editThresholds(settings.segments); break;
			case "bar": await this.#editBar(settings.segments); break;
			}
		}
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
