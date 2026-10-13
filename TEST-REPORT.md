# ArzPulse recovery package — local verification report

Date: 2026-10-13

## Passed

- `node --check telegram-bot/index.js`
- `npm run check` in `telegram-bot/`
- `npm test` in `telegram-bot/`: 7/7 tests passed
- `node --check scripts/fetch-and-save.js`
- `node --check worker/index.js`
- `node --check docs/assets/app.js`
- `node --check docs/assets/page-insights.js`
- `node --check docs/assets/page-insights-widget.js`
- Market updater Worker smoke checks: `/health` 200, GET `/trigger` 405, unauthenticated POST `/trigger` 401
- TOML parse checks for `worker/wrangler.toml` and `telegram-bot/wrangler.toml.example`
- YAML parse checks for both GitHub Actions workflows
- HTML check: no duplicate IDs; exactly one Page Insights mount; mount is near the bottom, before the footer
- No `.ps1` files are included

## Not testable locally

This environment does not have the user's live Cloudflare secrets, actual KV namespace ID, Telegram bot token, GitHub token, or access to deploy to the user's Cloudflare account. The live webhook, scheduled trigger, KV quota, Telegram permissions, and GitHub repository permissions must be verified after deployment using the steps in `RECOVERY-AND-DEPLOYMENT-FA.md`.
