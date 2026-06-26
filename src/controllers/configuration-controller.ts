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

	async run(): Promise<void> {
		const settings = await this.#service.read();

		const menuSettings = this.#menuSettings;
		const menuEnableSegments = this.#menuEnableSegments;
		const menuExit = this.#menuExit;
		const menuOrderFirst = this.#menuOrderFirst;
		const menuOrderSecond = this.#menuOrderSecond;
		const menuColors = this.#menuColors;
		const menuColorPick = this.#menuColorPick;
		const menuThresholds = this.#menuThresholds;
		const menuWarn = this.#menuWarn;
		const menuAlert = this.#menuAlert;
		const menuBar = this.#menuBar;
		const menuWidth = this.#menuWidth;
		const menuFilled = this.#menuFilled;
		const menuEmpty = this.#menuEmpty;
		const navigator = this.#navigator;

		// Settings — top level
		menuSettings.atCase("Enable segments", menuEnableSegments);
		menuSettings.atCase("Order segments", menuOrderFirst);
		menuSettings.atCase("Colors", menuColors);
		menuSettings.atCase("Thresholds", menuThresholds);
		menuSettings.atCase("Bar", menuBar);
		menuSettings.onContinue((key) => {
			switch (key) {
			case menuEnableSegments: return Transition.to(menuEnableSegments);
			case menuOrderFirst: return Transition.to(menuOrderFirst);
			case menuColors: {
				const labels = settings.segments.filter(segment => segment.enabled).filter(segment => segment instanceof LabelSegment);
				if (labels.length < 1) return Transition.reload;
				return Transition.to(menuColors);
			}
			case menuThresholds: {
				const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
				if (gauges.length < 1) return Transition.reload;
				return Transition.to(menuThresholds);
			}
			case menuBar: {
				const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment);
				if (gauges.length < 1) return Transition.reload;
				return Transition.to(menuBar);
			}
			default: throw new TypeError(`Unknown settings key '${key}'`);
			}
		});
		menuSettings.onCancel(() => Transition.to(menuExit));

		// Enable segments
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

		// Order — swap
		for (const segment of settings.segments) {
			menuOrderFirst.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuOrderFirst.onContinue((first) => {
			this.#orderFirst = first;
			return Transition.to(menuOrderSecond);
		});

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

		// Colors
		const labels = settings.segments.filter(segment => segment instanceof LabelSegment) as LabelSegment[];
		for (const segment of labels) {
			menuColors.atCase(ConfigurationController.#labelOf(segment), segment);
		}
		menuColors.onContinue((segment) => {
			this.#editingColor = segment;
			menuColorPick.setInitial(segment.color);
			return Transition.to(menuColorPick);
		});

		for (const color of Object.values(Color)) {
			menuColorPick.atCase(ColorSystem.paint(color, color), color);
		}
		menuColorPick.onContinue((color) => {
			this.#editingColor.color = color;
			return Transition.back;
		});

		// Thresholds
		menuThresholds.atCase("Warn below %", "warn");
		menuThresholds.atCase("Alert below %", "alert");
		menuThresholds.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			switch (key) {
			case "warn":
				menuWarn.value(gauge.thresholds.warn);
				menuWarn.bounds(1, 99);
				return Transition.to(menuWarn);
			case "alert":
				menuAlert.value(gauge.thresholds.alert);
				menuAlert.bounds(1, gauge.thresholds.warn, true);
				return Transition.to(menuAlert);
			default: throw new TypeError(`Unknown thresholds key '${key}'`);
			}
		});
		menuWarn.onContinue((warn) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			for (const g of gauges) {
				g.thresholds = new Thresholds(warn, gauge.thresholds.alert);
			}
			return Transition.back;
		});
		menuAlert.onContinue((alert) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			for (const g of gauges) {
				g.thresholds = new Thresholds(gauge.thresholds.warn, alert);
			}
			return Transition.back;
		});

		// Bar
		menuBar.atCase("Bar width", "width");
		menuBar.atCase("Filled string", "filled");
		menuBar.atCase("Empty string", "empty");
		menuBar.onContinue((key) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			switch (key) {
			case "width":
				menuWidth.value(gauge.bar.width);
				menuWidth.bounds(1, 99);
				return Transition.to(menuWidth);
			case "filled":
				menuFilled.value(gauge.bar.filled);
				return Transition.to(menuFilled);
			case "empty":
				menuEmpty.value(gauge.bar.empty);
				return Transition.to(menuEmpty);
			default: throw new TypeError(`Unknown bar key '${key}'`);
			}
		});
		menuWidth.onContinue((width) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			for (const g of gauges) {
				g.bar = new Bar(width, gauge.bar.filled, gauge.bar.empty);
			}
			return Transition.back;
		});
		menuFilled.onContinue((filled) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			for (const g of gauges) {
				g.bar = new Bar(gauge.bar.width, filled, gauge.bar.empty);
			}
			return Transition.back;
		});
		menuEmpty.onContinue((empty) => {
			const gauges = settings.segments.filter(segment => segment instanceof GaugeSegment) as GaugeSegment[];
			const [gauge] = gauges;
			for (const g of gauges) {
				g.bar = new Bar(gauge.bar.width, gauge.bar.filled, empty);
			}
			return Transition.back;
		});

		// Exit
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
