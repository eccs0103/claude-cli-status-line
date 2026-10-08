"use strict";

import "adaptive-extender/node";
import { Field, Model, Nullable } from "adaptive-extender/node";

const { round, trunc } = Math;

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

//#region Prompt cache
export interface PromptCacheScheme {
	warm: boolean | null;
	expires_at: number | null;
}

export class PromptCache extends Model {
	@Field(Nullable.Of(Boolean), { name: "warm" })
	warm: boolean | null = null;

	@Field(Nullable.Of(Number), { name: "expires_at" })
	expiry: number | null = null;

	constructor();
	constructor(warm: boolean | null, expiry: number | null);
	constructor(warm?: boolean | null, expiry?: number | null) {
		if (warm === undefined || expiry === undefined) {
			super();
			return;
		}

		super();
		this.warm = warm;
		this.expiry = expiry;
	}

	get remaining(): number | null {
		const { warm, expiry } = this;
		if (warm !== true || expiry === null) return null;
		const seconds = expiry - trunc(Date.now() / 1000);
		if (seconds <= 0) return null;
		return seconds;
	}
}
//#endregion

//#region Effort
export interface EffortScheme {
	level: string | null;
}

export class Effort extends Model {
	@Field(Nullable.Of(String), { name: "level" })
	level: string | null = null;

	constructor();
	constructor(level: string | null);
	constructor(level?: string | null) {
		if (level === undefined) {
			super();
			return;
		}

		super();
		this.level = level;
	}
}
//#endregion

//#region Worktree
export interface WorktreeScheme {
	branch: string | null;
}

export class Worktree extends Model {
	@Field(Nullable.Of(String), { name: "branch" })
	branch: string | null = null;

	constructor();
	constructor(branch: string | null);
	constructor(branch?: string | null) {
		if (branch === undefined) {
			super();
			return;
		}

		super();
		this.branch = branch;
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
	prompt_cache: PromptCacheScheme | null;
	effort: EffortScheme | null;
	fast_mode: boolean | null;
	worktree: WorktreeScheme | null;
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

	@Field(Nullable.Of(PromptCache), { name: "prompt_cache" })
	cache: PromptCache | null = null;

	@Field(Nullable.Of(Effort), { name: "effort" })
	effort: Effort | null = null;

	@Field(Nullable.Of(Boolean), { name: "fast_mode" })
	fast: boolean | null = null;

	@Field(Nullable.Of(Worktree), { name: "worktree" })
	worktree: Worktree | null = null;

	constructor();
	constructor(workspace: Workspace | null, branch: string | null, model: ModelInfo | null, limits: RateLimits | null, context: ContextWindow | null, cache: PromptCache | null, effort: Effort | null, fast: boolean | null, worktree: Worktree | null);
	constructor(workspace?: Workspace | null, branch?: string | null, model?: ModelInfo | null, limits?: RateLimits | null, context?: ContextWindow | null, cache?: PromptCache | null, effort?: Effort | null, fast?: boolean | null, worktree?: Worktree | null) {
		if (workspace === undefined || branch === undefined || model === undefined || limits === undefined || context === undefined || cache === undefined || effort === undefined || fast === undefined || worktree === undefined) {
			super();
			return;
		}

		super();
		this.workspace = workspace;
		this.branch = branch;
		this.model = model;
		this.limits = limits;
		this.context = context;
		this.cache = cache;
		this.effort = effort;
		this.fast = fast;
		this.worktree = worktree;
	}
}
//#endregion
