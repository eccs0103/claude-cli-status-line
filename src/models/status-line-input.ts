"use strict";

import "adaptive-extender/node";
import { Model, Field, Optional, Nullable } from "adaptive-extender/node";

//#region Workspace
export class Workspace extends Model {
	@Field(Optional.Of(String), { name: "current_dir" })
	currentDir: string | undefined;
}
//#endregion

//#region Model info
export class ModelInfo extends Model {
	@Field(Optional.Of(String), { name: "display_name" })
	displayName: string | undefined;
}
//#endregion

//#region Rate limit
export class RateLimit extends Model {
	@Field(Optional.Of(Nullable.Of(Number)), { name: "used_percentage" })
	usedPercentage: number | null | undefined;

	@Field(Optional.Of(Nullable.Of(Number)), { name: "resets_at" })
	resetsAt: number | null | undefined;
}
//#endregion

//#region Rate limits
export class RateLimits extends Model {
	@Field(Optional.Of(Nullable.Of(RateLimit)), { name: "five_hour" })
	fiveHour: RateLimit | null | undefined;

	@Field(Optional.Of(Nullable.Of(RateLimit)), { name: "seven_day" })
	sevenDay: RateLimit | null | undefined;
}
//#endregion

//#region Context window
export class ContextWindow extends Model {
	@Field(Optional.Of(Nullable.Of(Number)), { name: "used_percentage" })
	usedPercentage: number | null | undefined;
}
//#endregion

//#region Status line input
export class StatusLineInput extends Model {
	@Field(Optional.Of(Nullable.Of(Workspace)), { name: "workspace" })
	workspace: Workspace | null | undefined;

	@Field(Optional.Of(Nullable.Of(String)), { name: "git_branch" })
	gitBranch: string | null | undefined;

	@Field(Optional.Of(Nullable.Of(ModelInfo)), { name: "model" })
	model: ModelInfo | null | undefined;

	@Field(Optional.Of(Nullable.Of(RateLimits)), { name: "rate_limits" })
	rateLimits: RateLimits | null | undefined;

	@Field(Optional.Of(Nullable.Of(ContextWindow)), { name: "context_window" })
	contextWindow: ContextWindow | null | undefined;
}
//#endregion
