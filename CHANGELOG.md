## 1.3.2 (02.07.2026)
- `adaptive-extender` upgraded from `0.12.0` to `1.0.3`.
- License changed from MIT to Apache-2.0.

## 1.3.1 (30.06.2026)
- Added a "Time format" option to `config` — choose how rate-limit countdowns display: clock (e.g. `12h 46m`) or fractional (e.g. `0.5/7 d`).
- Added a "Reset to defaults" option to `config` that restores and saves the default settings.
- The `config` Colors menu now shows each segment's current color, and the Thresholds and Bar menus show each current value inline (e.g. `Warn below 30%`, `Width · 10`).
- An unrecognized command argument is now ignored (the status line renders) instead of throwing `Invalid '<arg>' argument for section`.

## 1.2.0 (28.06.2026)
- The `config` UI now reorders segments by swapping a pair — choose a first segment, then the one to swap it with — instead of picking each position in sequence.
- In the `config` UI, the Thresholds and Bar editors now present each value (warn/alert; width, filled, empty) as its own menu entry you edit individually, instead of stepping through them all in one prompt run.
- The `config` menu now hides options that don't apply — "Order segments" appears only with more than one segment, "Colors" only when a colored segment is present, and "Thresholds"/"Bar" only when a gauge segment is present.
- The `config` menus now support consistent step-back navigation — Escape returns to the previous menu level throughout the UI.

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
