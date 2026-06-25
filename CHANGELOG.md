## 1.1.2 (25.06.2026)
- The status line now renders only when no argument is given; an unrecognized argument throws `Invalid '<arg>' argument for section` instead of silently rendering.
- The `config` UI now requires a single character for the progress bar's filled and empty strings.
- In the `config` UI, removed the explicit "Back" and "Exit" menu items — press Escape to go back or exit instead.
- Fixed dropped keypresses after pressing Escape in the `config` UI on Windows (Node.js #38663 raw-mode workaround).

## 1.1.1 (13.06.2026)
- Added `claude-cli-status-line config` command to customize the status line interactively.
- Configurable: which segments are shown and in what order, colors for directory/branch/model, warning/critical thresholds, and progress bar width and characters.
- Settings are saved to `~/.claude/status-line.config.json` and applied automatically on every run.
- Default order changed: 7-day rate limit is now shown before the 5-hour rate limit.

## 1.0.4 (06.06.2026)
- Fixed branch name rendering when the working directory path contained special characters.

## 1.0.3 (04.06.2026)
- Improved segment separator appearance.

## 1.0.0 (04.06.2026)
*First stable version.*
- Renders an ANSI-colored status line showing workspace directory, git branch, active model, 5-hour rate limit, 7-day rate limit, and context window usage.
