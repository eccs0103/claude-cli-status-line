"use strict";

import "adaptive-extender/node";
import { Model, Field, Optional, Nullable } from "adaptive-extender/node";

//#region Workspace
export class Workspace extends Model {
	@Field(Optional(String), "current_dir")
	currentDir: string | undefined;
}
//#endregion

//#region Model info
export class ModelInfo extends Model {
	@Field(Optional(String), "display_name")
	displayName: string | undefined;
}
//#endregion

//#region Rate limit
export class RateLimit extends Model {
	@Field(Optional(Nullable(Number)), "used_percentage")
	usedPercentage: number | null | undefined;

	@Field(Optional(Nullable(Number)), "resets_at")
	resetsAt: number | null | undefined;
}
//#endregion

//#region Rate limits
export class RateLimits extends Model {
	@Field(Optional(Nullable(RateLimit)), "five_hour")
	fiveHour: RateLimit | null | undefined;

	@Field(Optional(Nullable(RateLimit)), "seven_day")
	sevenDay: RateLimit | null | undefined;
}
//#endregion

//#region Context window
export class ContextWindow extends Model {
	@Field(Optional(Nullable(Number)), "used_percentage")
	usedPercentage: number | null | undefined;
}
//#endregion

//#region Status line input
export class StatusLineInput extends Model {
	@Field(Optional(Nullable(Workspace)), "workspace")
	workspace: Workspace | null | undefined;

	@Field(Optional(Nullable(ModelInfo)), "model")
	model: ModelInfo | null | undefined;

	@Field(Optional(Nullable(RateLimits)), "rate_limits")
	rateLimits: RateLimits | null | undefined;

	@Field(Optional(Nullable(ContextWindow)), "context_window")
	contextWindow: ContextWindow | null | undefined;
}
//#endregion
