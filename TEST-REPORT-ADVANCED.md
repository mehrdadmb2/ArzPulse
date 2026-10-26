# ArzPulse Advanced Smart Alerts & Visual Upgrade — Test Report

Date: 2026-10-26

## Automated checks

- `node --check telegram-bot/index.js` — passed
- `node --check docs/assets/app.js` — passed
- `node --check docs/assets/page-insights.js` — passed
- `node --check docs/assets/page-insights-widget.js` — passed
- `node --check scripts/fetch-and-save.js` — passed
- `node --check worker/index.js` — passed
- `npm test` in `telegram-bot/` — **12/12 passed**
- HTML ID scan — passed, no duplicate IDs; `signalRadar` mount present
- Stylesheet parser check — passed
- `worker/wrangler.toml` and `telegram-bot/wrangler.toml.example` TOML parse — passed
- GitHub workflow YAML syntax check — passed
- Distribution archive integrity — passed
- Distribution archive scan — no `docs/data/`, `.git`, `node_modules`, or `.ps1` files included

## Alert test coverage

The bot tests cover webhook validation, command output, per-chat alert settings, scheduled GitHub workflow dispatch, initial baseline behavior, a sudden price move, rolling timeframe alerts, cooldown persistence, and combining a price shock with 15-minute context into one detailed alert instead of multiple duplicate messages.

## Smart alert behavior

- Snapshot comparisons for sudden movement and 24-hour thresholds.
- Rolling 15-minute, 1-hour and 6-hour windows; event-specific cooldowns prevent repeated notifications.
- Fear & Greed jumps, global crypto market-cap changes, BTC/ETH funding thresholds, BTC open-interest changes, and broad crypto market breadth.
- Detailed Telegram HTML alert messages with severity, movement window, current reading, available volume/day range/trade count, source, snapshot timestamp and cautious market-context note.
- Price shock and same-direction time-window changes for a single asset are combined into one message when the underlying cooldowns permit delivery.
- Configurable per-chat alert opt-in and severity level through `/alerts`, `/alertson`, `/alertsoff`, and `/alertlevel low|medium|high`.

## Website changes

- Asset cards receive distinct dark-mode backgrounds and palette treatments, asset logos with text fallback, a unique watermark, global quote context where available, daily range indicator and sparkline.
- Added the market signal radar for notable crypto moves, global breadth, sentiment extremes, global market-cap moves, futures funding and macro quotes.
- Lightweight five-minute refresh of `latest.json`.
- Existing Page Insights section remains in the footer region.

## Limitations

These tests validate code paths against simulated market snapshots and mocked Telegram/GitHub APIs. They do not prove that external providers are available at deployment time, that the live Cloudflare Worker has been deployed, or that its real Cron Triggers and KV binding are configured correctly. The full project archive intentionally omits `docs/data/` to avoid replacing current live prices and history with an older snapshot. Logos are loaded from a public CDN; when a token logo is unavailable, a symbol fallback is displayed.
