# @eccs0103/claude-cli-status-line

A Claude CLI status line command that renders an ANSI-colored status bar showing your workspace directory, git branch, active model, rate limit usage, and context window consumption.

## Preview

```
myproject · main · Sonnet 4.6 · █████████░ 85% for 2.5/5 h · ██████░░░░ 62% for 1.1/7 d · █████████░ 87% #
```

## Configure

Add to your `~/.claude/settings.json`:

```json
{
	"statusLine": {
		"type": "command",
		"command": "npx --yes --package=@eccs0103/claude-cli-status-line claude-cli-status-line"
	}
}
```

Or run via the Claude CLI:

```
claude config set statusLine.type command
claude config set statusLine.command "npx --yes --package=@eccs0103/claude-cli-status-line claude-cli-status-line"
```

No global install required — `npx` downloads and caches the package on first run.

## What it shows

| Segment | Color | Description |
|---|---|---|
| Directory | Cyan bold | Last component of the workspace path |
| Branch | Magenta | Current git branch (omitted if not a git repo) |
| Model | Blue | Active Claude model display name |
| 5-hour rate limit | Green/Yellow/Red | Usage bar + percentage + time to reset |
| 7-day rate limit | Green/Yellow/Red | Usage bar + percentage + time to reset |
| Context window | Green/Yellow/Red | Remaining context as a usage bar + percentage |

Color thresholds: green (>30% remaining), yellow (10–30%), red (≤10%).
