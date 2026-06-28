"use strict";

import "adaptive-extender/node";
import { Deferred, Descendant, Enum, Field, Model } from "adaptive-extender/node";

//#region Color
export enum Color {
	cyan = "cyan",
	magenta = "magenta",
	blue = "blue",
	green = "green",
	yellow = "yellow",
	red = "red",
	white = "white",
}
//#endregion
//#region Time format
export enum TimeFormat {
	fractional = "fractional",
	clock = "clock",
}
//#endregion
//#region Thresholds
export interface ThresholdsScheme {
	warn: number;
	alert: number;
}

export class Thresholds extends Model {
	@Field(Number, { name: "warn" })
	warn: number;

	@Field(Number, { name: "alert" })
	alert: number;

	constructor();
	constructor(warn: number, alert: number);
	constructor(warn?: number, alert?: number) {
		if (warn === undefined || alert === undefined) {
			super();
			return;
		}

		super();
		this.warn = warn;
		this.alert = alert;
	}

	static get newDefault(): Thresholds {
		return new Thresholds(30, 10);
	}
}
//#endregion
//#region Bar
export interface BarScheme {
	width: number;
	filled: string;
	empty: string;
}

export class Bar extends Model {
	@Field(Number, { name: "width" })
	width: number;

	@Field(String, { name: "filled" })
	filled: string;

	@Field(String, { name: "empty" })
	empty: string;

	constructor();
	constructor(width: number, filled: string, empty: string);
	constructor(width?: number, filled?: string, empty?: string) {
		if (width === undefined || filled === undefined || empty === undefined) {
			super();
			return;
		}

		super();
		this.width = width;
		this.filled = filled;
		this.empty = empty;
	}

	static get newDefault(): Bar {
		return new Bar(10, "█", "░");
	}
}
//#endregion

//#region Segment
export interface SegmentDiscriminator extends DirectorySegmentDiscriminator, BranchSegmentDiscriminator, ModelSegmentDiscriminator, SevenDaySegmentDiscriminator, FiveHourSegmentDiscriminator, ContextSegmentDiscriminator {
}

export interface SegmentScheme {
	$type: keyof SegmentDiscriminator;
	enabled: boolean;
}

@Descendant(Deferred(_ => DirectorySegment))
@Descendant(Deferred(_ => BranchSegment))
@Descendant(Deferred(_ => ModelSegment))
@Descendant(Deferred(_ => SevenDaySegment))
@Descendant(Deferred(_ => FiveHourSegment))
@Descendant(Deferred(_ => ContextSegment))
export abstract class Segment extends Model {
	@Field(Boolean, { name: "enabled" })
	enabled: boolean;

	constructor();
	constructor(enabled: boolean);
	constructor(enabled?: boolean) {
		if (new.target === Segment) throw new TypeError("Unable to create an instance of an abstract class");

		if (enabled === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
	}
}
//#endregion

//#region Label segment
export interface LabelSegmentScheme extends SegmentScheme {
	color: Color;
}

@Descendant(Deferred(_ => DirectorySegment))
@Descendant(Deferred(_ => BranchSegment))
@Descendant(Deferred(_ => ModelSegment))
export abstract class LabelSegment extends Segment {
	@Field(Enum.Of(Color), { name: "color" })
	color: Color;

	constructor();
	constructor(enabled: boolean, color: Color);
	constructor(enabled?: boolean, color?: Color) {
		if (new.target === LabelSegment) throw new TypeError("Unable to create an instance of an abstract class");

		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super(enabled);
		this.color = color;
	}
}
//#endregion
//#region Gauge segment
export interface GaugeSegmentScheme extends SegmentScheme {
	thresholds: ThresholdsScheme;
	bar: BarScheme;
}

@Descendant(Deferred(_ => SevenDaySegment))
@Descendant(Deferred(_ => FiveHourSegment))
@Descendant(Deferred(_ => ContextSegment))
export abstract class GaugeSegment extends Segment {
	@Field(Thresholds, { name: "thresholds" })
	thresholds: Thresholds;

	@Field(Bar, { name: "bar" })
	bar: Bar;

	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (new.target === GaugeSegment) throw new TypeError("Unable to create an instance of an abstract class");

		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super(enabled);
		this.thresholds = thresholds;
		this.bar = bar;
	}
}
//#endregion

//#region Directory segment
export interface DirectorySegmentDiscriminator {
	"DirectorySegment": DirectorySegment;
}

export interface DirectorySegmentScheme extends LabelSegmentScheme {
	$type: keyof DirectorySegmentDiscriminator;
}

export class DirectorySegment extends LabelSegment {
	constructor();
	constructor(enabled: boolean, color: Color);
	constructor(enabled?: boolean, color?: Color) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super(enabled, color);
	}

	static get newDefault(): DirectorySegment {
		return new DirectorySegment(true, Color.cyan);
	}
}
//#endregion
//#region Branch segment
export interface BranchSegmentDiscriminator {
	"BranchSegment": BranchSegment;
}

export interface BranchSegmentScheme extends LabelSegmentScheme {
	$type: keyof BranchSegmentDiscriminator;
}

export class BranchSegment extends LabelSegment {
	constructor();
	constructor(enabled: boolean, color: Color);
	constructor(enabled?: boolean, color?: Color) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super(enabled, color);
	}

	static get newDefault(): BranchSegment {
		return new BranchSegment(true, Color.magenta);
	}
}
//#endregion
//#region Model segment
export interface ModelSegmentDiscriminator {
	"ModelSegment": ModelSegment;
}

export interface ModelSegmentScheme extends LabelSegmentScheme {
	$type: keyof ModelSegmentDiscriminator;
}

export class ModelSegment extends LabelSegment {
	constructor();
	constructor(enabled: boolean, color: Color);
	constructor(enabled?: boolean, color?: Color) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super(enabled, color);
	}

	static get newDefault(): ModelSegment {
		return new ModelSegment(true, Color.blue);
	}
}
//#endregion
//#region Seven day segment
export interface SevenDaySegmentDiscriminator {
	"SevenDaySegment": SevenDaySegment;
}

export interface SevenDaySegmentScheme extends GaugeSegmentScheme {
	$type: keyof SevenDaySegmentDiscriminator;
}

export class SevenDaySegment extends GaugeSegment {
	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super(enabled, thresholds, bar);
	}

	static get newDefault(): SevenDaySegment {
		return new SevenDaySegment(true, Thresholds.newDefault, Bar.newDefault);
	}
}
//#endregion
//#region Five hour segment
export interface FiveHourSegmentDiscriminator {
	"FiveHourSegment": FiveHourSegment;
}

export interface FiveHourSegmentScheme extends GaugeSegmentScheme {
	$type: keyof FiveHourSegmentDiscriminator;
}

export class FiveHourSegment extends GaugeSegment {
	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super(enabled, thresholds, bar);
	}

	static get newDefault(): FiveHourSegment {
		return new FiveHourSegment(true, Thresholds.newDefault, Bar.newDefault);
	}
}
//#endregion
//#region Context segment
export interface ContextSegmentDiscriminator {
	"ContextSegment": ContextSegment;
}

export interface ContextSegmentScheme extends GaugeSegmentScheme {
	$type: keyof ContextSegmentDiscriminator;
}

export class ContextSegment extends GaugeSegment {
	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super(enabled, thresholds, bar);
	}

	static get newDefault(): ContextSegment {
		return new ContextSegment(true, Thresholds.newDefault, Bar.newDefault);
	}
}
//#endregion

//#region Settings
export interface SettingsScheme {
	segments: SegmentScheme[];
}

export class Settings extends Model {
	@Field(Array.Of(Segment), { name: "segments" })
	segments: Segment[];

	@Field(Enum.Of(TimeFormat), { name: "time_format" })
	timeFormat: TimeFormat = TimeFormat.fractional;

	constructor();
	constructor(segments: Segment[], timeFormat: TimeFormat);
	constructor(segments?: Segment[], timeFormat?: TimeFormat) {
		if (segments === undefined || timeFormat === undefined) {
			super();
			return;
		}

		super();
		this.segments = segments;
		this.timeFormat = timeFormat;
	}

	static get newDefault(): Settings {
		return new Settings([DirectorySegment.newDefault, BranchSegment.newDefault, ModelSegment.newDefault, SevenDaySegment.newDefault, FiveHourSegment.newDefault, ContextSegment.newDefault], TimeFormat.clock);
	}
}
//#endregion
