"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, GaugeSegment, LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { ColorSystem } from "../services/color-system.js";
import { SettingsService } from "../services/settings-service.js";
import { SingleSelectionMenu } from "../services/new-menu.js";

const { stdin, stderr, stdout } = process;

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

	async #runSelectEnabled(settings: Settings): Promise<void> {
		const { segments } = settings;
		const chosen = await multiselect({
			message: "Enabled segments",
			options: segments.map(segment => ({ value: segment, label: ConfigurationController.#labelOf(segment) })),
			initialValues: segments.filter(segment => segment.enabled),
			required: false,
		});
		if (isCancel(chosen)) return;

		for (const segment of segments) {
			segment.enabled = chosen.includes(segment);
		}
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

	async #runExitMenu(settings: Settings): Promise<void> {
		const menu = new SingleSelectionMenu("Exit");
		menu.atOption("Save & exit", async () => {
			await this.#service.write(settings);
			return Transition.success("Saved");
		});
		menu.atOption("Discard changes", () => {
			return Transition.fail("Discarded");
		});
	}

	async #runInteraction(settings: Settings): Promise<void> {
		intro("Status line");

		const menu = new SingleSelectionMenu("Settings");
		menu.atOption("Enable segments", async () => {
			await this.#runSelectEnabled(settings);
			// return Transition.toMenu("Saved");
		});
		menu.atOption("Order segments", async () => {
			await this.#runOrderSegments(settings);
			// return Transition.toMenu("Saved");
		});
		menu.atOption("Colors", async () => {
			await this.#runEditColors(settings);
			// return Transition.toMenu("Saved");
		});
		menu.atOption("Thresholds", async () => {
			await this.#runEditThresholds(settings);
			// return Transition.toMenu("Saved");
		});
		menu.atOption("Bar", async () => {
			await this.#runEditBar(settings);
			// return Transition.toMenu("Saved");
		});
	}

	async run(): Promise<void> {
		if (!stdout.isTTY) {
			stderr.write("Run 'claude-cli-status-line config' in an interactive terminal.\n");
			return;
		}

		// Workaround for Node.js #38663 (Windows): toggling raw mode off while closing
		// the readline interface on Escape drops the next keypress. Hold raw mode on for
		// the whole session so clack's per-prompt setRawMode(false) is a no-op.
		const restore = stdin.setRawMode.bind(stdin);
		stdin.setRawMode = mode => (mode && restore(true), stdin);
		restore(true);
		try {
			const settings = await this.#service.read();
			await this.#runInteraction(settings);
		} finally {
			stdin.setRawMode = restore;
			restore(false);
		}
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
