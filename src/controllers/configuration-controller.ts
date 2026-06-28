"use strict";

import "adaptive-extender/node";
import { Controller } from "adaptive-extender/node";
import { BranchSegment, Color, ContextSegment, DirectorySegment, FiveHourSegment, GaugeSegment, LabelSegment, ModelSegment, type Segment, SevenDaySegment, Settings, TimeFormat } from "../models/settings.js";
import { ColorSystem } from "../services/color-system.js";
import { SettingsService } from "../services/settings-service.js";
import { InputCharacterMenu, InputNumberMenu, Menu, MultiSelectionMenu, Navigator, SingleSelectionMenu, Transition } from "../menu/index.js";

//#region Configuration controller
export class ConfigurationController extends Controller<[boolean]> {
	#service: SettingsService;
	#menuSettings: SingleSelectionMenu<Menu> = new SingleSelectionMenu();
	#menuEnableSegments: MultiSelectionMenu<Segment> = new MultiSelectionMenu();
	#menuColors: SingleSelectionMenu<LabelSegment> = new SingleSelectionMenu();
	#menuColorPick: SingleSelectionMenu<Color, LabelSegment> = new SingleSelectionMenu();
	#menuThresholds: SingleSelectionMenu<string> = new SingleSelectionMenu();
	#menuWarn: InputNumberMenu = new InputNumberMenu();
	#menuAlert: InputNumberMenu = new InputNumberMenu();
	#menuBar: SingleSelectionMenu<string> = new SingleSelectionMenu();
	#menuWidth: InputNumberMenu = new InputNumberMenu();
	#menuFilled: InputCharacterMenu = new InputCharacterMenu();
	#menuEmpty: InputCharacterMenu = new InputCharacterMenu();
	#menuTimeFormat: SingleSelectionMenu<TimeFormat> = new SingleSelectionMenu();
	#menuReset: SingleSelectionMenu<boolean> = new SingleSelectionMenu();
	#menuExit: SingleSelectionMenu<boolean> = new SingleSelectionMenu();
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

	#buildOrder(settings: Settings, held: Segment | null): SingleSelectionMenu<Segment> {
		const menuOrder: SingleSelectionMenu<Segment> = new SingleSelectionMenu();
		const { segments } = settings;

		menuOrder.title = "Order segments";
		for (const segment of segments) {
			const label = ConfigurationController.#labelOf(segment);
			if (segment === held) {
				menuOrder.atCase(ColorSystem.paint(label, Color.green), segment);
				continue;
			}
			menuOrder.atCase(label, segment);
		}
		if (held !== null) menuOrder.initial = held;
		menuOrder.onContinue((chosen) => {
			if (held === null) return Transition.to(this.#buildOrder(settings, chosen));
			const index1 = segments.indexOf(held);
			const index2 = segments.indexOf(chosen);
			segments[index1] = chosen;
			segments[index2] = held;
			return Transition.to(this.#buildOrder(settings, null));
		});
		return menuOrder;
	}

	#buildSettings(settings: Settings): void {
		const menuSettings = this.#menuSettings;
		const { segments } = settings;

		const hasLabels = segments.some(segment => segment instanceof LabelSegment);
		const hasGauges = segments.some(segment => segment instanceof GaugeSegment);
		menuSettings.title = "Settings";
		menuSettings.atCase("Enable segments", this.#menuEnableSegments);
		if (segments.length > 1) menuSettings.atCase("Order segments", this.#buildOrder(settings, null));
		if (hasLabels) menuSettings.atCase("Colors", this.#menuColors);
		if (hasGauges) menuSettings.atCase("Thresholds", this.#menuThresholds);
		if (hasGauges) menuSettings.atCase("Bar", this.#menuBar);
		if (hasGauges) menuSettings.atCase("Time format", this.#menuTimeFormat);
		menuSettings.atCase("Reset to defaults", this.#menuReset);
		menuSettings.onContinue(Transition.to);
		menuSettings.onCancel(() => Transition.to(this.#menuExit));
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

	#buildColors(settings: Settings): void {
		const menuColors = this.#menuColors;
		const menuColorPick = this.#menuColorPick;

		menuColors.title = "Colors";
		const labels = settings.segments.filter(segment => segment instanceof LabelSegment);
		for (const segment of labels) {
			menuColors.atCase(`${ConfigurationController.#labelOf(segment)} · ${ColorSystem.paint(String(segment.color), segment.color)}`, segment);
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

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		const [gauge] = gauges;
		const { thresholds } = gauge;
		menuThresholds.title = "Thresholds";
		menuThresholds.atCase(`Warn below ${thresholds.warn}%`, "warn");
		menuThresholds.atCase(`Alert below ${thresholds.alert}%`, "alert");
		menuThresholds.onContinue((key) => {
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

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		menuWarn.title = "Warn below %";
		menuWarn.onContinue((warn) => {
			for (const gauge of gauges) {
				gauge.thresholds.warn = warn;
			}
			return Transition.back;
		});
	}

	#buildAlert(settings: Settings): void {
		const menuAlert = this.#menuAlert;

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		menuAlert.title = "Alert below %";
		menuAlert.onContinue((alert) => {
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

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		const [gauge] = gauges;
		const { bar } = gauge;
		menuBar.title = "Bar";
		menuBar.atCase(`Width · ${bar.width}`, "width");
		menuBar.atCase(`Filled · ${bar.filled}`, "filled");
		menuBar.atCase(`Empty · ${bar.empty}`, "empty");
		menuBar.onContinue((key) => {
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

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		menuWidth.title = "Bar width";
		menuWidth.onContinue((width) => {
			for (const gauge of gauges) {
				gauge.bar.width = width;
			}
			return Transition.back;
		});
	}

	#buildFilled(settings: Settings): void {
		const menuFilled = this.#menuFilled;

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		menuFilled.title = "Filled string";
		menuFilled.onContinue((filled) => {
			for (const gauge of gauges) {
				gauge.bar.filled = filled;
			}
			return Transition.back;
		});
	}

	#buildEmpty(settings: Settings): void {
		const menuEmpty = this.#menuEmpty;

		const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
		menuEmpty.title = "Empty string";
		menuEmpty.onContinue((empty) => {
			for (const gauge of gauges) {
				gauge.bar.empty = empty;
			}
			return Transition.back;
		});
	}

	#buildTimeFormat(settings: Settings): void {
		const menuTimeFormat = this.#menuTimeFormat;

		menuTimeFormat.title = "Time format";
		menuTimeFormat.atCase("Fractional  (e.g. 0.5d, 0.3h)", TimeFormat.fractional);
		menuTimeFormat.atCase("Clock  (e.g. 12h 46m, 18m)", TimeFormat.clock);
		menuTimeFormat.initial = settings.timeFormat;
		menuTimeFormat.onContinue((format) => {
			settings.timeFormat = format;
			return Transition.back;
		});
	}

	#buildReset(settings: Settings): void {
		const menuReset = this.#menuReset;

		menuReset.title = "Reset to defaults";
		menuReset.atCase("Reset & save", true);
		menuReset.atCase("Keep current", false);
		menuReset.onContinue(async (reset) => {
			if (!reset) return Transition.back;
			await this.#service.write(Settings.newDefault);
			return Transition.success("Reset");
		});
	}

	#buildExit(settings: Settings): void {
		const menuExit = this.#menuExit;

		menuExit.title = "Exit";
		menuExit.atCase("Save & exit", true);
		menuExit.atCase("Discard changes", false);
		menuExit.onContinue(async (save) => {
			if (!save) return Transition.success("Discarded");
			await this.#service.write(settings);
			return Transition.success("Saved");
		});
	}

	async run(isDevelopment: boolean): Promise<void> {
		this.#service = new SettingsService(isDevelopment);
		const settings = await this.#service.read();

		this.#buildSettings(settings);
		this.#buildEnableSegments(settings);
		this.#buildColors(settings);
		this.#buildColorPick();
		this.#buildThresholds(settings);
		this.#buildWarn(settings);
		this.#buildAlert(settings);
		this.#buildBar(settings);
		this.#buildWidth(settings);
		this.#buildFilled(settings);
		this.#buildEmpty(settings);
		this.#buildTimeFormat(settings);
		this.#buildReset(settings);
		this.#buildExit(settings);

		await this.#navigator.launch("Status line", this.#menuSettings);
	}
}
//#endregion
