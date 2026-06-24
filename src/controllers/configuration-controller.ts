"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, GaugeSegment, LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { ColorSystem } from "../services/color-system.js";
import { SettingsService } from "../services/settings-service.js";

const { stderr, stdout } = process;

//#region Configuration controller
export class ConfigurationController extends Controller {
	#service: SettingsService = new SettingsService();

	static #labelOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return "Directory";
		if (segment instanceof BranchSegment) return "Branch";
		if (segment instanceof ModelSegment) return "Model";
		if (segment instanceof SevenDaySegment) return "7-day limit";
		if (segment instanceof FiveHourSegment) return "5-hour limit";
		if (segment instanceof ContextSegment) return "Context";
		throw new TypeError(`Unknown segment type '${typename(segment)}'`);
	}

	async #selectEnabled(settings: Settings): Promise<void> {
		const { segments } = settings;
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

	async #editColors(settings: Settings): Promise<void> {
		const labels = settings.segments.filter(segment => segment.enabled).filter(segment => segment instanceof LabelSegment);
		if (labels.length < 1) return;

		while (true) {
			const chosen = await select<LabelSegment | null>({
				message: "Colors",
				options: [
					...labels.map(segment => ({
						value: segment,
						label: ConfigurationController.#labelOf(segment),
					})),
					{ value: null, label: "Back" },
				],
			});
			if (isCancel(chosen) || chosen === null) return;

			const color = await select({
				message: ConfigurationController.#labelOf(chosen),
				options: Object.values(Color).map(color => ({
					value: color,
					label: ColorSystem.paint(color, color),
				})),
				initialValue: chosen.color,
			});
			if (isCancel(color)) continue;
			chosen.color = color;
		}
	}

	async #editThresholds(settings: Settings): Promise<void> {
		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
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

	async #editBar(settings: Settings): Promise<void> {
		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
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

	async #exitMenu(settings: Settings): Promise<boolean> {
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
			await this.#service.write(settings);
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

		const settings = await this.#service.read();

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
				],
			});

			if (isCancel(action)) {
				const done = await this.#exitMenu(settings);
				if (done) return;
				continue;
			}

			switch (action) {
			case "enable": await this.#selectEnabled(settings); break;
			case "order": await this.#orderSegments(settings); break;
			case "colors": await this.#editColors(settings); break;
			case "thresholds": await this.#editThresholds(settings); break;
			case "bar": await this.#editBar(settings); break;
			}
		}
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
