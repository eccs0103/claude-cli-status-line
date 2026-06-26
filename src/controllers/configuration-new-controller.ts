"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { isCancel, select, text } from "@clack/prompts";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, GaugeSegment, LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { ColorSystem } from "../services/color-system.js";
import { SettingsService } from "../services/settings-service.js";
import { MultiSelectionMenu, Navigator, SingleSelectionMenu, Transition } from "../menu/index.js";

const { stderr } = process;

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

	async #runOrderSegments(settings: Settings): Promise<void> {
		const enabled = settings.segments.filter(segment => segment.enabled);
		if (enabled.length <= 1) return;

		const ordered: Segment[] = [];
		const remaining = [...enabled];
		while (remaining.length > 1) {
			const position = ordered.length + 1;
			const chosen = await select({
				message: `Position ${position}`,
				options: remaining.map(segment => ({ value: segment, label: ConfigurationController.#labelOf(segment) })),
			});
			if (isCancel(chosen)) return;
			ordered.push(chosen);
			remaining.remove(chosen);
		}
		ordered.push(remaining[0]);

		const disabled = settings.segments.filter(segment => !segment.enabled);
		settings.segments = [...ordered, ...disabled];
	}

	async #runEditColors(settings: Settings): Promise<void> {
		const labels = settings.segments.filter(segment => segment.enabled).filter(segment => segment instanceof LabelSegment);
		if (labels.length < 1) return;

		while (true) {
			const chosen = await select({
				message: "Colors",
				options: labels.map(segment => ({ value: segment, label: ConfigurationController.#labelOf(segment) })),
			});
			if (isCancel(chosen)) return;

			const color = await select({
				message: ConfigurationController.#labelOf(chosen),
				options: Object.values(Color).map(color => ({ value: color, label: ColorSystem.paint(color, color) })),
				initialValue: chosen.color,
			});
			if (isCancel(color)) continue;
			chosen.color = color;
		}
	}

	async #runEditThresholds(settings: Settings): Promise<void> {
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

	async #runEditBar(settings: Settings): Promise<void> {
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
		const width = Number(widthResult);

		const filled = await text({
			message: "Filled string",
			defaultValue: current.filled,
			placeholder: current.filled,
			validate(value): Error | undefined {
				if (value?.length !== 1) return new Error(`The filled string must be a single character`);
			},
		});
		if (isCancel(filled)) return;

		const empty = await text({
			message: "Empty string",
			defaultValue: current.empty,
			placeholder: current.empty,
			validate(value): Error | undefined {
				if (value?.length !== 1) return new Error(`The empty string must be a single character`);
			},
		});
		if (isCancel(empty)) return;

		for (const segment of gauges) {
			segment.bar = new Bar(width, filled, empty);
		}
	}

	#menuSettings: SingleSelectionMenu<string> = new SingleSelectionMenu("Settings");
	#menuEnableSegments: MultiSelectionMenu<Segment> = new MultiSelectionMenu("Enable segments");
	#menuExit: SingleSelectionMenu<boolean> = new SingleSelectionMenu("Exit");
	#navigator: Navigator = new Navigator();

	async run(): Promise<void> {
		const settings = await this.#service.read();

		const menuSettings = this.#menuSettings;
		const menuEnableSegments = this.#menuEnableSegments;
		const menuExit = this.#menuExit;
		const navigator = this.#navigator;

		menuSettings.atCase("Enable segments", menuEnableSegments.title);
		menuSettings.atCase("Order segments", "order");
		menuSettings.atCase("Colors", "colors");
		menuSettings.atCase("Thresholds", "thresholds");
		menuSettings.atCase("Bar", "bar");
		menuSettings.onContinue(async (key) => {
			switch (key) {
			case "enable": return Transition.toMenu(menuEnableSegments);
			case "order": await this.#runOrderSegments(settings); break;
			case "colors": await this.#runEditColors(settings); break;
			case "thresholds": await this.#runEditThresholds(settings); break;
			case "bar": await this.#runEditBar(settings); break;
			}
			return Transition.reload;
		});
		menuSettings.onCancel(() => Transition.toMenu(menuExit));

		for (const segment of settings.segments) {
			menuEnableSegments.atCase(ConfigurationController.#labelOf(segment), segment, segment.enabled);
		}
		menuEnableSegments.onContinue((chosen) => {
			const { segments } = settings;
			for (const segment of segments) {
				segment.enabled = chosen.includes(segment);
			}
			return Transition.back;
		});

		menuExit.atCase("Save & exit", true);
		menuExit.atCase("Discard changes", false);
		menuExit.onContinue(async (save) => {
			if (save) await this.#service.write(settings);
			return save ? Transition.success("Saved") : Transition.fail("Discarded");
		});

		await navigator.launch(menuSettings);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
