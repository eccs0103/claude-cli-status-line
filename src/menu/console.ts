"use strict";

import "adaptive-extender/node";
import { Optional, type Promisable } from "adaptive-extender/node";
import { cancel, intro, isCancel, multiselect, outro, select, text, type Option } from "@clack/prompts";

const { stdin, stderr, stdout } = process;

//#region Console
export class Console {
	intro(title: string): void {
		intro(title);
	}

	outro(message: string): void {
		outro(message);
	}

	cancel(message: string): void {
		cancel(message);
	}

	isCancel(value: unknown): value is symbol {
		return isCancel(value);
	}

	async select<T>(message: string, cases: readonly (readonly [string, T, boolean?])[]): Promise<T | symbol> {
		const options = cases.map(([label, value]) => ({ label, value }) as Option<T>);
		const initial = cases.find(([, , initial]) => initial);
		const initialValue = Optional.map(initial, ([, value]) => value);
		return await select({ message, options, initialValue });
	}

	async text(message: string, value: string, validate: (value: string | undefined) => Error | undefined): Promise<string | symbol> {
		return await text({ message, defaultValue: value, placeholder: value, validate });
	}

	async multiselect<T>(message: string, cases: readonly (readonly [string, T, boolean])[]): Promise<T[] | symbol> {
		const options = cases.map(([label, value]) => ({ label, value }) as Option<T>);
		const initialValues = cases.filter(([, , selected]) => selected).map(([, value]) => value);
		const required = false;
		return await multiselect({ message, options, initialValues, required });
	}

	async session(body: () => Promisable<void>): Promise<void> {
		if (!stdout.isTTY) {
			stderr.write("Run 'claude-cli-status-line config' in an interactive terminal.\n");
			return;
		}

		// Workaround for Node.js #38663 (Windows): toggling raw mode off while closing
		// the readline interface on Escape drops the next keypress. Hold raw mode on for
		// the whole session so clack's per-prompt setRawMode(false) is a no-op.
		const restore = stdin.setRawMode.bind(stdin);
		stdin.setRawMode = mode => (mode && restore(true), stdin);
		restore(true);
		try {
			await body();
		} finally {
			stdin.setRawMode = restore;
			restore(false);
		}
	}
}
//#endregion
