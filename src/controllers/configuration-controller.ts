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
	#menuSettings: SingleSelectionMenu<Menu> = new SingleSelectionMenu();
	#menuEnableSegments: MultiSelectionMenu<Segment> = new MultiSelectionMenu();
	#menuExit: SingleSelectionMenu<boolean> = new SingleSelectionMenu();
	#menuOrderFirst: SingleSelectionMenu<Segment> = new SingleSelectionMenu();
	#menuOrderSecond: SingleSelectionMenu<Segment, Segment> = new SingleSelectionMenu();
	#menuColors: SingleSelectionMenu<LabelSegment> = new SingleSelectionMenu();
	#menuColorPick: SingleSelectionMenu<Color, LabelSegment> = new SingleSelectionMenu();
	#menuThresholds: SingleSelectionMenu<string> = new SingleSelectionMenu();
	#menuWarn: InputNumberMenu = new InputNumberMenu();
	#menuAlert: InputNumberMenu = new InputNumberMenu();
	#menuBar: SingleSelectionMenu<string> = new SingleSelectionMenu();
	#menuWidth: InputNumberMenu = new InputNumberMenu();
	#menuFilled: InputCharacterMenu = new InputCharacterMenu();
	#menuEmpty: InputCharacterMenu = new InputCharacterMenu();
	#navigator: Navigator = new Navigator();

	static #labelOf(segment: Segment): string {
		if (segment instanceof DirectorySegment) return "Directory";
		if (segment instanceof BranchSegment) return "Branch";
		if (segment instanceof ModelSegment) return "Model";
		if (segment instanceof SevenDaySegment) return "7-day limit";
		if (segment instanceof FiveHourSegment) return "5-hour limit";
		if (segment instanceof ContextSegment) return "Context";
		throw new TypeError(`Unknown segment type '${typename(segment)}'`);
	}

	#buildEnableSegments(settings: Settings): void {
		const menuEnableSegments = this.#menuEnableSegments;
		const { segments } = settings;

		menuEnableSegments.title = "Enable segments";
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

		menuOrderFirst.title = "Swap — first segment";
		for (const segment of settings.segments) {
			menuOrderFirst.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuOrderFirst.onContinue(first => Transition.to(this.#menuOrderSecond, first));
	}

	#buildOrderSecond(settings: Settings): void {
		const menuOrderSecond = this.#menuOrderSecond;
		const { segments } = settings;

		menuOrderSecond.title = "Swap — second segment";
		for (const segment of segments) {
			menuOrderSecond.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuOrderSecond.onContinue((second, first) => {
			const index1 = segments.indexOf(first);
			const index2 = segments.indexOf(second);
			segments[index1] = second;
			segments[index2] = first;
			return Transition.back;
		});
	}

	#buildColors(settings: Settings): void {
		const menuColors = this.#menuColors;
		const menuColorPick = this.#menuColorPick;

		menuColors.title = "Colors";
		const labels = settings.segments.filter(segment => segment instanceof LabelSegment);
		for (const segment of labels) {
			menuColors.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuColors.onContinue((segment) => {
			menuColorPick.initial = segment.color;
			return Transition.to(menuColorPick, segment);
		});
	}

	#buildColorPick(): void {
		const menuColorPick = this.#menuColorPick;

		menuColorPick.title = "Color";
		for (const color of Object.values(Color)) {
			menuColorPick.atCase(ColorSystem.paint(String(color), color), color);
		}
		menuColorPick.onContinue((color, segment) => {
			segment.color = color;
			return Transition.back;
		});
	}

	#buildThresholds(settings: Settings): void {
		const menuThresholds = this.#menuThresholds;
		const menuWarn = this.#menuWarn;
		const menuAlert = this.#menuAlert;

		menuThresholds.title = "Thresholds";
		menuThresholds.atCase("Warn below %", "warn");
		menuThresholds.atCase("Alert below %", "alert");
		menuThresholds.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			const { thresholds } = gauge;
			switch (key) {
			case "warn": {
				menuWarn.value = thresholds.warn;
				menuWarn.minimum = 1;
				menuWarn.maximum = 99;
				return Transition.to(menuWarn);
			}
			case "alert": {
				menuAlert.value = thresholds.alert;
				menuAlert.minimum = 1;
				menuAlert.maximum = thresholds.warn;
				menuAlert.exclusive = true;
				return Transition.to(menuAlert);
			}
			default: throw new TypeError(`Unknown thresholds key '${key}'`);
			}
		});
	}

	#buildWarn(settings: Settings): void {
		const menuWarn = this.#menuWarn;

		menuWarn.title = "Warn below %";
		menuWarn.onContinue((warn) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			for (const gauge of gauges) {
				gauge.thresholds.warn = warn;
			}
			return Transition.back;
		});
	}

	#buildAlert(settings: Settings): void {
		const menuAlert = this.#menuAlert;

		menuAlert.title = "Alert below %";
		menuAlert.onContinue((alert) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			for (const gauge of gauges) {
				gauge.thresholds.alert = alert;
			}
			return Transition.back;
		});
	}

	#buildBar(settings: Settings): void {
		const menuBar = this.#menuBar;
		const menuWidth = this.#menuWidth;
		const menuFilled = this.#menuFilled;
		const menuEmpty = this.#menuEmpty;

		menuBar.title = "Bar";
		menuBar.atCase("Bar width", "width");
		menuBar.atCase("Filled string", "filled");
		menuBar.atCase("Empty string", "empty");
		menuBar.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			const [gauge] = gauges;
			const { bar } = gauge;
			switch (key) {
			case "width": {
				menuWidth.value = bar.width;
				menuWidth.minimum = 1;
				menuWidth.maximum = 99;
				return Transition.to(menuWidth);
			}
			case "filled": {
				menuFilled.value = bar.filled;
				return Transition.to(menuFilled);
			}
			case "empty": {
				menuEmpty.value = bar.empty;
				return Transition.to(menuEmpty);
			}
			default: throw new TypeError(`Unknown bar key '${key}'`);
			}
		});
	}

	#buildWidth(settings: Settings): void {
		const menuWidth = this.#menuWidth;

		menuWidth.title = "Bar width";
		menuWidth.onContinue((width) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			for (const gauge of gauges) {
				gauge.bar.width = width;
			}
			return Transition.back;
		});
	}

	#buildFilled(settings: Settings): void {
		const menuFilled = this.#menuFilled;

		menuFilled.title = "Filled string";
		menuFilled.onContinue((filled) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			for (const gauge of gauges) {
				gauge.bar.filled = filled;
			}
			return Transition.back;
		});
	}

	#buildEmpty(settings: Settings): void {
		const menuEmpty = this.#menuEmpty;

		menuEmpty.title = "Empty string";
		menuEmpty.onContinue((empty) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
			for (const gauge of gauges) {
				gauge.bar.empty = empty;
			}
			return Transition.back;
		});
	}

	#buildExit(settings: Settings): void {
		const menuExit = this.#menuExit;
		menuExit.title = "Exit";

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
		menuSettings.title = "Settings";
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

		await this.#navigator.launch("Status line", this.#menuSettings);
	}

	async catch(error: Error): Promise<void> {
		stderr.write(`${error}\n`);
	}
}
//#endregion
