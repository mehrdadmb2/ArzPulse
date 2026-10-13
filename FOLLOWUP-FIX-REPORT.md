# ArzPulse follow-up fix report — 2026-10-13

## Changes
- Market updater Worker now awaits GitHub's workflow-dispatch response in its scheduled handler and writes clear start/success/failure messages to Cloudflare Workers Logs.
- The updater Worker health response reports the intended cron expression and target workflow settings. The protected `/trigger` route remains the manual end-to-end dispatch check.
- GitHub Actions backup schedule remains every 15 minutes to avoid unnecessary duplicate dispatch runs. It skips collection only when the latest snapshot is younger than seven minutes, reducing reliance on a single Cloudflare Cron Trigger.
- Telegram `/prices`, `/btc`, `/eth`, `/usdt`, `/not`, and `/gold` messages show the stored IRR price and an approximate USD equivalent using the same snapshot's USDT/IRR rate. Global-market values remain in their native contract/index units.

## Validation performed
- `node --check worker/index.js` — passed.
- `node --check telegram-bot/index.js` — passed.
- `npm run check` in `telegram-bot` — passed.
- `npm test` in `telegram-bot` — 7/7 passed.
- Mock webhook `/prices` dual-currency check — passed.
- Workflow YAML and Wrangler TOML parse checks — passed.

## Deployment boundary
These are local-source validations only. A successful real Cloudflare cron invocation and live GitHub dispatch must be confirmed in Cloudflare Workers > `arzpulse-market-updater` > Settings > Triggers / Cron Events and Workers Logs, and in GitHub Actions. Deploy the market updater Worker separately from the Telegram bot Worker. Keep existing `docs/data/` contents when merging source files.
