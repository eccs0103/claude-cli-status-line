"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { Bar, BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, GaugeSegment, LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, Thresholds } from "../models/settings.js";
import { ColorSystem } from "../services/color-system.js";
import { SettingsService } from "../services/settings-service.js";
import { InputCharacterMenu, InputNumberMenu, Menu, MultiSelectionMenu, Navigator, SingleSelectionMenu, Transition } from "../menu/index.js";

const { stderr } = process;

//#region Configuration controller
export class ConfigurationController extends Controller {
	#service: SettingsService = new SettingsService();
	#menuSettings: SingleSelectionMenu<Menu> = new SingleSelectionMenu("Settings");
	#menuEnableSegments: MultiSelectionMenu<Segment> = new MultiSelectionMenu("Enable segments");
	#menuExit: SingleSelectionMenu<boolean> = new SingleSelectionMenu("Exit");
	#menuOrderFirst: SingleSelectionMenu<Segment> = new SingleSelectionMenu("Swap — first segment");
	#menuOrderSecond: SingleSelectionMenu<Segment> = new SingleSelectionMenu("Swap — second segment");
	#menuColors: SingleSelectionMenu<LabelSegment> = new SingleSelectionMenu("Colors");
	#menuColorPick: SingleSelectionMenu<Color> = new SingleSelectionMenu("Color");
	#menuThresholds: SingleSelectionMenu<string> = new SingleSelectionMenu("Thresholds");
	#menuWarn: InputNumberMenu = new InputNumberMenu("Warn below %");
	#menuAlert: InputNumberMenu = new InputNumberMenu("Alert below %");
	#menuBar: SingleSelectionMenu<string> = new SingleSelectionMenu("Bar");
	#menuWidth: InputNumberMenu = new InputNumberMenu("Bar width");
	#menuFilled: InputCharacterMenu = new InputCharacterMenu("Filled string");
	#menuEmpty: InputCharacterMenu = new InputCharacterMenu("Empty string");
	#navigator: Navigator = new Navigator();
	#orderFirst: Segment = undefined!;
	#editingColor: LabelSegment = undefined!;

	static #labelOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return "Directory";
		if (segment instanceof BranchSegment) return "Branch";
		if (segment instanceof ModelSegment) return "Model";
		if (segment instanceof SevenDaySegment) return "7-day limit";
		if (segment instanceof FiveHourSegment) return "5-hour limit";
		if (segment instanceof ContextSegment) return "Context";
		throw new TypeError(`Unknown segment type '${typename(segment)}'`);
	}

	// #gauges(settings: Settings): GaugeSegment[] {
	// 	return settings.segments.filter(segment => segment instanceof GaugeSegment);
	// }

	#buildEnableSegments(settings: Settings): void {
		const menuEnableSegments = this.#menuEnableSegments;
		const { segments } = settings;

		for (const segment of segments) {
			menuEnableSegments.atCase(ConfigurationController.#labelOf(segment), segment, segment.enabled);
		}
		menuEnableSegments.onContinue((chosen) => {
			const set = new Set(chosen);
			for (const segment of segments) {
				segment.enabled = set.has(segment);
			}
			return Transition.back;
		});
	}

	#buildOrderFirst(settings: Settings): void {
		const menuOrderFirst = this.#menuOrderFirst;

		for (const segment of settings.segments) {
			menuOrderFirst.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuOrderFirst.onContinue((first) => {
			this.#orderFirst = first;
			return Transition.to(this.#menuOrderSecond);
		});
	}

	#buildOrderSecond(settings: Settings): void {
		const menuOrderSecond = this.#menuOrderSecond;

		for (const segment of settings.segments) {
			menuOrderSecond.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuOrderSecond.onContinue((second) => {
			const first = this.#orderFirst;
			const segments = [...settings.segments];
			const firstIndex = segments.indexOf(first);
			const secondIndex = segments.indexOf(second);
			segments[firstIndex] = second;
			segments[secondIndex] = first;
			settings.segments = segments;
			return Transition.back;
		});
	}

	#buildColors(settings: Settings): void {
		const menuColors = this.#menuColors;
		const menuColorPick = this.#menuColorPick;

		const labels = settings.segments.filter(segment => segment instanceof LabelSegment);
		for (const segment of labels) {
			menuColors.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuColors.onContinue((segment) => {
			this.#editingColor = segment;
			menuColorPick.setInitial(segment.color);
			return Transition.to(menuColorPick);
		});
	}

	#buildColorPick(): void {
		const menuColorPick = this.#menuColorPick;

		for (const color of Object.values(Color)) {
			menuColorPick.atCase(ColorSystem.paint(color, color), color);
		}
		menuColorPick.onContinue((color) => {
			this.#editingColor.color = color;
			return Transition.back;
		});
	}

	#buildThresholds(settings: Settings): void {
		const menuThresholds = this.#menuThresholds;

		menuThresholds.atCase("Warn below %", "warn");
		menuThresholds.atCase("Alert below %", "alert");
		menuThresholds.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			switch (key) {
			case "warn":
				this.#menuWarn.value(gauge.thresholds.warn);
				this.#menuWarn.bounds(1, 99);
				return Transition.to(this.#menuWarn);
			case "alert":
				this.#menuAlert.value(gauge.thresholds.alert);
				this.#menuAlert.bounds(1, gauge.thresholds.warn, true);
				return Transition.to(this.#menuAlert);
			default: throw new TypeError(`Unknown thresholds key '${key}'`);
			}
		});
	}

	#buildWarn(settings: Settings): void {
		this.#menuWarn.onContinue((warn) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			for (const gauge2 of gauges) {
				gauge2.thresholds = new Thresholds(warn, gauge.thresholds.alert);
			}
			return Transition.back;
		});
	}

	#buildAlert(settings: Settings): void {
		this.#menuAlert.onContinue((alert) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			for (const gauge2 of gauges) {
				gauge2.thresholds = new Thresholds(gauge.thresholds.warn, alert);
			}
			return Transition.back;
		});
	}

	#buildBar(settings: Settings): void {
		const menuBar = this.#menuBar;
		menuBar.atCase("Bar width", "width");
		menuBar.atCase("Filled string", "filled");
		menuBar.atCase("Empty string", "empty");
		menuBar.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			switch (key) {
			case "width":
				this.#menuWidth.value(gauge.bar.width);
				this.#menuWidth.bounds(1, 99);
				return Transition.to(this.#menuWidth);
			case "filled":
				this.#menuFilled.value(gauge.bar.filled);
				return Transition.to(this.#menuFilled);
			case "empty":
				this.#menuEmpty.value(gauge.bar.empty);
				return Transition.to(this.#menuEmpty);
			default: throw new TypeError(`Unknown bar key '${key}'`);
			}
		});
	}

	#buildWidth(settings: Settings): void {
		this.#menuWidth.onContinue((width) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			for (const gauge2 of gauges) {
				gauge2.bar = new Bar(width, gauge.bar.filled, gauge.bar.empty);
			}
			return Transition.back;
		});
	}

	#buildFilled(settings: Settings): void {
		this.#menuFilled.onContinue((filled) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			for (const gauge2 of gauges) {
				gauge2.bar = new Bar(gauge.bar.width, filled, gauge.bar.empty);
			}
			return Transition.back;
		});
	}

	#buildEmpty(settings: Settings): void {
		this.#menuEmpty.onContinue((empty) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [target] = gauges;
			for (const gauge of gauges) {
				gauge.bar = new Bar(target.bar.width, target.bar.filled, empty);
			}
			return Transition.back;
		});
	}

	#buildExit(settings: Settings): void {
		const menuExit = this.#menuExit;

		menuExit.atCase("Save & exit", true);
		menuExit.atCase("Discard changes", false);
		menuExit.onContinue(async (save) => {
			if (!save) return Transition.fail("Discarded");
			await this.#service.write(settings);
			return Transition.success("Saved");
		});
	}

	#buildSettings(settings: Settings): void {
		const menuSettings = this.#menuSettings;
		const { segments } = settings;
		const hasLabels = segments.some(segment => segment instanceof LabelSegment);
		const hasGauges = segments.some(segment => segment instanceof GaugeSegment);

		menuSettings.atCase("Enable segments", this.#menuEnableSegments);
		if (segments.length > 1) menuSettings.atCase("Order segments", this.#menuOrderFirst);
		if (hasLabels) menuSettings.atCase("Colors", this.#menuColors);
		if (hasGauges) menuSettings.atCase("Thresholds", this.#menuThresholds);
		if (hasGauges) menuSettings.atCase("Bar", this.#menuBar);
		menuSettings.onContinue(menu => Transition.to(menu));
		menuSettings.onCancel(() => Transition.to(this.#menuExit));
	}

	async run(): Promise<void> {
		const settings = await this.#service.read();
		this.#buildEnableSegments(settings);
		this.#buildOrderFirst(settings);
		this.#buildOrderSecond(settings);
		this.#buildColors(settings);
		this.#buildColorPick();
		this.#buildThresholds(settings);
		this.#buildWarn(settings);
		this.#buildAlert(settings);
		this.#buildBar(settings);
		this.#buildWidth(settings);
		this.#buildFilled(settings);
		this.#buildEmpty(settings);
		this.#buildExit(settings);
		this.#buildSettings(settings);
		await this.#navigator.launch(this.#menuSettings);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
