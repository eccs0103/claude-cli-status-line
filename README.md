# @eccs0103/claude-cli-status-line

A Claude CLI status line command that renders an ANSI-colored status bar showing your workspace directory, git branch, active model, rate limit usage, and context window consumption.

![example](./resources/images/status-line-render.svg)

[Change log](./CHANGELOG.md)

## Setup

1. Install

	```
	npm install -g @eccs0103/claude-cli-status-line
	```

2. Connect

	Add to your `~/.claude/settings.json`:

	```json
	{
		"statusLine": {
			"type": "command",
			"command": "claude-cli-status-line"
		}
	}
	```

Or run via the Claude CLI:

```
claude config set statusLine.type command
claude config set statusLine.command "claude-cli-status-line"
```

## What it shows

Directory · Branch · Model · 7-day limit · 5-hour limit · Context window

Color thresholds: green (>30%), yellow (10–30%), red (≤10%).

## Configuring

```
claude-cli-status-line config
```

Lets you toggle segments, reorder them, change colors, adjust thresholds, and customize the progress bar. Settings are saved to `~/.claude/status-line.config.json`.
