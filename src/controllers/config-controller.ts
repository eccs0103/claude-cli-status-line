"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { cancel, confirm, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, type GaugeSegment, type LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { SettingsService } from "../services/settings-service.js";

const { stderr, stdout } = process;

//#region Configuration controller
class CancellationError extends Error {
}

export class ConfigurationController extends Controller {
	static #ANSI_DEFAULT: string = "\x1b[0m";
	static #ANSI_CYAN = "\x1b[36m";
	static #ANSI_MAGENTA = "\x1b[35m";
	static #ANSI_BLUE = "\x1b[34m";
	static #ANSI_GREEN = "\x1b[32m";
	static #ANSI_YELLOW = "\x1b[33m";
	static #ANSI_RED = "\x1b[31m";
	static #ANSI_WHITE = "\x1b[37m";

	static #unwrap<Value>(result: Value | symbol): Value {
		if (isCancel(result)) throw new CancellationError();
		return result;
	}

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

	async #selectEnabled(segments: Segment[]): Promise<Segment[]> {
		const chosen = ConfigurationController.#unwrap(await multiselect({
			message: "Segments",
			options: segments.map(segment => ({
				value: segment,
				label: ConfigurationController.#labelOf(segment)
			})),
			initialValues: segments.filter(segment => segment.enabled),
			required: false,
		}));

		for (const segment of segments) {
			segment.enabled = chosen.includes(segment);
		}
		return chosen;
	}

	async #orderSegments(enabled: readonly Segment[]): Promise<Segment[]> {
		if (enabled.length <= 1) return [...enabled];
		const ordered: Segment[] = [];
		const remaining = [...enabled];
		while (remaining.length > 1) {
			const position = ordered.length + 1;
			const chosen = ConfigurationController.#unwrap(await select({
				message: `Position ${position}`,
				options: remaining.map(segment => ({
					value: segment,
					label: ConfigurationController.#labelOf(segment)
				})),
			}));
			ordered.push(chosen);
			remaining.splice(remaining.indexOf(chosen), 1);
		}
		ordered.push(remaining[0]);
		return ordered;
	}

	async #editColors(segments: Segment[]): Promise<void> {
		const labels = segments.filter(segment => segment.enabled).filter(ConfigurationController.#isLabel);
		if (labels.length < 1) return;

		const customize = ConfigurationController.#unwrap(await confirm({
			message: "Customize colors?",
			initialValue: false
		}));
		if (!customize) return;

		for (const segment of labels) {
			segment.color = ConfigurationController.#unwrap(await select({
				message: ConfigurationController.#labelOf(segment),
				options: Object.values(Color).map((color) => ({
					value: color,
					label: `${ConfigurationController.#ansiOf(color)}${color}${ConfigurationController.#ANSI_DEFAULT}`,
				})),
				initialValue: segment.color,
			}));
		}
	}

	async #editThresholds(segments: Segment[]): Promise<void> {
		const gauges = segments.filter(ConfigurationController.#isGauge);
		if (gauges.length < 1) return;
		const [gauge] = gauges;
		const current = gauge.thresholds;

		const customize = ConfigurationController.#unwrap(await confirm({
			message: "Customize thresholds?",
			initialValue: false
		}));
		if (!customize) return;

		const warn = Number(ConfigurationController.#unwrap(await text({
			message: "Warn below %",
			defaultValue: String(current.warn),
			placeholder: String(current.warn),
			validate(value): Error | undefined {
				const percent = Number(value);
				if (!Number.isInteger(percent)) return new Error(`The percent ${percent} must be a finite integer number`);
				if (1 > percent || percent > 99) return new RangeError(`The percent ${percent} is out of range [1 - 99]`);
			},
		})));
		const alert = Number(ConfigurationController.#unwrap(await text({
			message: "Alert below %",
			defaultValue: String(current.alert),
			placeholder: String(current.alert),
			validate(value): Error | undefined {
				const percent = Number(value);
				if (!Number.isInteger(percent)) return new Error(`The percent ${percent} must be a finite integer number`);
				if (1 > percent || percent >= warn) return new RangeError(`The percent ${percent} is out of range [1 - ${warn})`);
			},
		})));
		for (const segment of gauges) {
			segment.thresholds = new Thresholds(warn, alert);
		}
	}

	async #editBar(segments: Segment[]): Promise<void> {
		const gauges = segments.filter(ConfigurationController.#isGauge);
		if (gauges.length < 1) return;
		const [gauge] = gauges;
		const current = gauge.bar;

		const customize = ConfigurationController.#unwrap(await confirm({
			message: "Customize bar?",
			initialValue: false
		}));
		if (!customize) return;

		const widthString = ConfigurationController.#unwrap(await text({
			message: "Bar width",
			defaultValue: String(current.width),
			placeholder: String(current.width),
			validate(value): Error | undefined {
				const width = Number(value);
				if (!Number.isInteger(width)) return new Error(`The width ${width} must be a finite integer number`);
				if (1 > width || width > 99) return new RangeError(`The width ${width} is out of range [1 - 30]`);
			},
		}));
		const filled = ConfigurationController.#unwrap(await text({
			message: "Filled string",
			defaultValue: current.filled,
			placeholder: current.filled
		}));
		const empty = ConfigurationController.#unwrap(await text({
			message: "Empty string",
			defaultValue: current.empty,
			placeholder: current.empty
		}));

		for (const segment of gauges) {
			segment.bar = new Bar(Number(widthString) || current.width, filled || current.filled, empty || current.empty);
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

		const enabled = await this.#selectEnabled(settings.segments);
		const ordered = await this.#orderSegments(enabled);
		await this.#editColors(settings.segments);
		await this.#editThresholds(settings.segments);
		await this.#editBar(settings.segments);

		const disabled = settings.segments.filter(segment => !segment.enabled);
		await service.write(new Settings([...ordered, ...disabled]));
		outro("Saved");
	}

	async catch(error: Error): Promise<void> {
		if (error instanceof CancellationError) return cancel();
		stderr.write(`${error}\n`);
	}
}
//#endregion
