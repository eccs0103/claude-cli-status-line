"use strict";

import "adaptive-extender/core";
import { Deferred, Descendant, Enum, Field, Model } from "adaptive-extender/core";

const { round } = Math;

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
	warn: number = 30;

	@Field(Number, { name: "alert" })
	alert: number = 10;

	color(available: number): Color {
		if (available <= this.alert) return Color.red;
		if (available <= this.warn) return Color.yellow;
		return Color.green;
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
	width: number = 10;

	@Field(String, { name: "filled" })
	filled: string = "█";

	@Field(String, { name: "empty" })
	empty: string = "░";

	draw(percent: number): string {
		const { width } = this;
		const count = round((percent / 100 * width).clamp(0, width));
		return this.filled.repeat(count) + this.empty.repeat(width - count);
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
	enabled: boolean = true;

	constructor() {
		if (new.target === Segment) throw new TypeError("Unable to create an instance of an abstract class");
		super();
	}

	abstract get label(): string;
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
	constructor(color: Color);
	constructor(color?: Color) {
		if (new.target === LabelSegment) throw new TypeError("Unable to create an instance of an abstract class");
		super();
		if (color === undefined) return;
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
	thresholds: Thresholds = new Thresholds();

	@Field(Bar, { name: "bar" })
	bar: Bar = new Bar();

	constructor() {
		if (new.target === GaugeSegment) throw new TypeError("Unable to create an instance of an abstract class");
		super();
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
	constructor() {
		super(Color.cyan);
	}

	get label(): string { return "Directory"; }
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
	constructor() {
		super(Color.magenta);
	}

	get label(): string { return "Branch"; }
}
//#endregion
//#region Model segment
export interface ModelSegmentDiscriminator {
	"ModelSegment": ModelSegment;
}

export interface ModelSegmentScheme extends LabelSegmentScheme {
	$type: keyof ModelSegmentDiscriminator;
	effort: boolean;
}

export class ModelSegment extends LabelSegment {
	@Field(Boolean, { name: "effort" })
	effort: boolean = true;

	constructor() {
		super(Color.blue);
	}

	get label(): string { return "Model"; }
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
	get label(): string { return "7-day limit"; }
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
	get label(): string { return "5-hour limit"; }
}
//#endregion
//#region Context segment
export interface ContextSegmentDiscriminator {
	"ContextSegment": ContextSegment;
}

export interface ContextSegmentScheme extends GaugeSegmentScheme {
	$type: keyof ContextSegmentDiscriminator;
	cache: boolean;
}

export class ContextSegment extends GaugeSegment {
	@Field(Boolean, { name: "cache" })
	cache: boolean = true;

	get label(): string { return "Context"; }
}
//#endregion

//#region Settings
export interface SettingsScheme {
	segments: SegmentScheme[];
}

export class Settings extends Model {
	@Field(Array.Of(Segment), { name: "segments" })
	segments: Segment[] = [new DirectorySegment(), new BranchSegment(), new ModelSegment(), new SevenDaySegment(), new FiveHourSegment(), new ContextSegment()];

	@Field(Enum.Of(TimeFormat), { name: "time_format" })
	timeFormat: TimeFormat = TimeFormat.clock;

	get model(): ModelSegment | null {
		return this.segments.find(segment => segment instanceof ModelSegment) ?? null;
	}

	get context(): ContextSegment | null {
		return this.segments.find(segment => segment instanceof ContextSegment) ?? null;
	}

	get labels(): LabelSegment[] {
		return this.segments.filter(segment => segment instanceof LabelSegment);
	}

	get gauges(): GaugeSegment[] {
		return this.segments.filter(segment => segment instanceof GaugeSegment);
	}

	swap(segment: Segment, segment2: Segment): void {
		const { segments } = this;
		const index = segments.indexOf(segment);
		const index2 = segments.indexOf(segment2);
		if (index < 0 || index2 < 0) throw new ReferenceError("Segment is not part of the settings");
		segments[index] = segment2;
		segments[index2] = segment;
	}
}
//#endregion
