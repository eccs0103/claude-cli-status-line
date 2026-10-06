"use strict";

import "adaptive-extender/node";
import { Field, Model, Nullable } from "adaptive-extender/node";

const { round } = Math;

//#region Workspace
export interface WorkspaceScheme {
	current_dir: string | null;
}

export class Workspace extends Model {
	@Field(Nullable.Of(String), { name: "current_dir" })
	directory: string | null = null;

	constructor();
	constructor(directory: string | null);
	constructor(directory?: string | null) {
		if (directory === undefined) {
			super();
			return;
		}

		super();
		this.directory = directory;
	}

	get folder(): string | null {
		const { directory } = this;
		if (directory === null) return null;
		return directory.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
	}
}
//#endregion

//#region Model info
export interface ModelInfoScheme {
	display_name: string | null;
}

export class ModelInfo extends Model {
	@Field(Nullable.Of(String), { name: "display_name" })
	name: string | null = null;

	constructor();
	constructor(name: string | null);
	constructor(name?: string | null) {
		if (name === undefined) {
			super();
			return;
		}

		super();
		this.name = name;
	}
}
//#endregion

//#region Rate limit
export interface RateLimitScheme {
	used_percentage: number | null;
	resets_at: number | null;
}

export class RateLimit extends Model {
	@Field(Nullable.Of(Number), { name: "used_percentage" })
	used: number | null = null;

	@Field(Nullable.Of(Number), { name: "resets_at" })
	reset: number | null = null;

	constructor();
	constructor(used: number | null, reset: number | null);
	constructor(used?: number | null, reset?: number | null) {
		if (used === undefined || reset === undefined) {
			super();
			return;
		}

		super();
		this.used = used;
		this.reset = reset;
	}

	get available(): number | null {
		const { used } = this;
		if (used === null) return null;
		return 100 - round(used);
	}
}
//#endregion

//#region Rate limits
export interface RateLimitsScheme {
	five_hour: RateLimitScheme | null;
	seven_day: RateLimitScheme | null;
}

export class RateLimits extends Model {
	@Field(Nullable.Of(RateLimit), { name: "five_hour" })
	fiveHour: RateLimit | null = null;

	@Field(Nullable.Of(RateLimit), { name: "seven_day" })
	sevenDay: RateLimit | null = null;

	constructor();
	constructor(fiveHour: RateLimit | null, sevenDay: RateLimit | null);
	constructor(fiveHour?: RateLimit | null, sevenDay?: RateLimit | null) {
		if (fiveHour === undefined || sevenDay === undefined) {
			super();
			return;
		}

		super();
		this.fiveHour = fiveHour;
		this.sevenDay = sevenDay;
	}
}
//#endregion

//#region Context window
export interface ContextWindowScheme {
	used_percentage: number | null;
}

export class ContextWindow extends Model {
	@Field(Nullable.Of(Number), { name: "used_percentage" })
	used: number | null = null;

	constructor();
	constructor(used: number | null);
	constructor(used?: number | null) {
		if (used === undefined) {
			super();
			return;
		}

		super();
		this.used = used;
	}

	get available(): number | null {
		const { used } = this;
		if (used === null) return null;
		return 100 - round(used);
	}
}
//#endregion

//#region Status line input
export interface StatusLineInputScheme {
	workspace: WorkspaceScheme | null;
	git_branch: string | null;
	model: ModelInfoScheme | null;
	rate_limits: RateLimitsScheme | null;
	context_window: ContextWindowScheme | null;
}

export class StatusLineInput extends Model {
	@Field(Nullable.Of(Workspace), { name: "workspace" })
	workspace: Workspace | null = null;

	@Field(Nullable.Of(String), { name: "git_branch" })
	branch: string | null = null;

	@Field(Nullable.Of(ModelInfo), { name: "model" })
	model: ModelInfo | null = null;

	@Field(Nullable.Of(RateLimits), { name: "rate_limits" })
	limits: RateLimits | null = null;

	@Field(Nullable.Of(ContextWindow), { name: "context_window" })
	context: ContextWindow | null = null;

	constructor();
	constructor(workspace: Workspace | null, branch: string | null, model: ModelInfo | null, limits: RateLimits | null, context: ContextWindow | null);
	constructor(workspace?: Workspace | null, branch?: string | null, model?: ModelInfo | null, limits?: RateLimits | null, context?: ContextWindow | null) {
		if (workspace === undefined || branch === undefined || model === undefined || limits === undefined || context === undefined) {
			super();
			return;
		}

		super();
		this.workspace = workspace;
		this.branch = branch;
		this.model = model;
		this.limits = limits;
		this.context = context;
	}
}
//#endregion
