"use strict";

import "adaptive-extender/node";
import { ArrayOf, Deferred, Descendant, Field, Model } from "adaptive-extender/node";

//#region Thresholds
export interface ThresholdsScheme {
	yellow: number;
	red: number;
}

export class Thresholds extends Model {
	@Field(Number, "yellow")
	yellow: number;

	@Field(Number, "red")
	red: number;

	constructor();
	constructor(yellow: number, red: number);
	constructor(yellow?: number, red?: number) {
		if (yellow === undefined || red === undefined) {
			super();
			return;
		}

		super();
		this.yellow = yellow;
		this.red = red;
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
	@Field(Number, "width")
	width: number;

	@Field(String, "filled")
	filled: string;

	@Field(String, "empty")
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
}

@Descendant(Deferred(_ => DirectorySegment))
@Descendant(Deferred(_ => BranchSegment))
@Descendant(Deferred(_ => ModelSegment))
@Descendant(Deferred(_ => SevenDaySegment))
@Descendant(Deferred(_ => FiveHourSegment))
@Descendant(Deferred(_ => ContextSegment))
export abstract class Segment extends Model {
	abstract enabled: boolean;

	constructor() {
		super();
		if (new.target === Segment) throw new TypeError("Unable to create an instance of an abstract class");
	}
}
//#endregion
//#region Directory segment
export interface DirectorySegmentDiscriminator {
	"DirectorySegment": DirectorySegment;
}

export interface DirectorySegmentScheme extends SegmentScheme {
	$type: keyof DirectorySegmentDiscriminator;
	enabled: boolean;
	color: string;
}

export class DirectorySegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(String, "color")
	color: string;

	constructor();
	constructor(enabled: boolean, color: string);
	constructor(enabled?: boolean, color?: string) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.color = color;
	}

	static get newDefault(): DirectorySegment {
		return new DirectorySegment(true, "cyan");
	}
}
//#endregion
//#region Branch segment
export interface BranchSegmentDiscriminator {
	"BranchSegment": BranchSegment;
}

export interface BranchSegmentScheme extends SegmentScheme {
	$type: keyof BranchSegmentDiscriminator;
	enabled: boolean;
	color: string;
}

export class BranchSegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(String, "color")
	color: string;

	constructor();
	constructor(enabled: boolean, color: string);
	constructor(enabled?: boolean, color?: string) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.color = color;
	}

	static get newDefault(): BranchSegment {
		return new BranchSegment(true, "magenta");
	}
}
//#endregion
//#region Model segment
export interface ModelSegmentDiscriminator {
	"ModelSegment": ModelSegment;
}

export interface ModelSegmentScheme extends SegmentScheme {
	$type: keyof ModelSegmentDiscriminator;
	enabled: boolean;
	color: string;
}

export class ModelSegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(String, "color")
	color: string;

	constructor();
	constructor(enabled: boolean, color: string);
	constructor(enabled?: boolean, color?: string) {
		if (enabled === undefined || color === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.color = color;
	}

	static get newDefault(): ModelSegment {
		return new ModelSegment(true, "blue");
	}
}
//#endregion
//#region Seven day segment
export interface SevenDaySegmentDiscriminator {
	"SevenDaySegment": SevenDaySegment;
}

export interface SevenDaySegmentScheme extends SegmentScheme {
	$type: keyof SevenDaySegmentDiscriminator;
	enabled: boolean;
	thresholds: ThresholdsScheme;
	bar: BarScheme;
}

export class SevenDaySegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(Thresholds, "thresholds")
	thresholds: Thresholds;

	@Field(Bar, "bar")
	bar: Bar;

	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.thresholds = thresholds;
		this.bar = bar;
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

export interface FiveHourSegmentScheme extends SegmentScheme {
	$type: keyof FiveHourSegmentDiscriminator;
	enabled: boolean;
	thresholds: ThresholdsScheme;
	bar: BarScheme;
}

export class FiveHourSegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(Thresholds, "thresholds")
	thresholds: Thresholds;

	@Field(Bar, "bar")
	bar: Bar;

	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.thresholds = thresholds;
		this.bar = bar;
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

export interface ContextSegmentScheme extends SegmentScheme {
	$type: keyof ContextSegmentDiscriminator;
	enabled: boolean;
	thresholds: ThresholdsScheme;
	bar: BarScheme;
}

export class ContextSegment extends Segment {
	@Field(Boolean, "enabled")
	enabled: boolean;

	@Field(Thresholds, "thresholds")
	thresholds: Thresholds;

	@Field(Bar, "bar")
	bar: Bar;

	constructor();
	constructor(enabled: boolean, thresholds: Thresholds, bar: Bar);
	constructor(enabled?: boolean, thresholds?: Thresholds, bar?: Bar) {
		if (enabled === undefined || thresholds === undefined || bar === undefined) {
			super();
			return;
		}

		super();
		this.enabled = enabled;
		this.thresholds = thresholds;
		this.bar = bar;
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
	@Field(ArrayOf(Segment), "segments")
	segments: Segment[];

	constructor();
	constructor(segments: Segment[]);
	constructor(segments?: Segment[]) {
		if (segments === undefined) {
			super();
			return;
		}

		super();
		this.segments = segments;
	}

	static get newDefault(): Settings {
		return new Settings([DirectorySegment.newDefault, BranchSegment.newDefault, ModelSegment.newDefault, SevenDaySegment.newDefault, FiveHourSegment.newDefault, ContextSegment.newDefault]);
	}
}
//#endregion
