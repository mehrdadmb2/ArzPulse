# ArzPulse Telegram Bot Worker

This folder is the **Telegram bot Worker only**. It is separate from `../worker/`, which dispatches the five-minute market-data workflow. Deploying the bot file to the updater Worker will disable price dispatching, so keep these deployments separate.

## Features

- Existing market commands: `/start`, `/help`, `/prices`, `/gold`, `/dollar`, `/btc`, `/eth`, `/usdt`, `/not`, `/status`, `/chart`, `/chartall`.
- Group/channel reporting using the existing `SETTINGS_KV` key named `channels` (compatibility preserved).
- `/setchannel` and `/stopchannel` require a chat administrator; `/refresh` requires a numeric user ID listed in `BOT_ADMIN_IDS`.
- Telegram HTML formatting: bold headings, `<pre><code>` monospace data, and `<blockquote>` status notes; invalid HTML has a controlled plain-text fallback.
- Historical charts via QuickChart's POST API and binary photo upload; `/chartall` attempts one Telegram media group to reduce round trips.
- Fast webhook acknowledgement, optional Telegram webhook secret validation, command/update error logs, a bounded manual-refresh lock, and protected diagnostic endpoints.
- Public `/health` (also `/` and `/test`) only exposes configuration booleans, never secret values.

## Required Worker bindings

Keep the existing `SETTINGS_KV` binding and point it at the **same Namespace ID already used by the current bot**. Do not create an empty replacement namespace or existing channel subscriptions will appear to vanish.

### Secrets

- `TELEGRAM_BOT_TOKEN` — token from BotFather.
- `GITHUB_TOKEN` — fine-grained token with access to `mehrdadmb2/ArzPulse` and **Actions: write** for `workflow_dispatch`.
- `ADMIN_SECRET` — long random secret used by `/diagnostics`, `/check`, `/send`, `/trigger`.
- `TELEGRAM_WEBHOOK_SECRET` — recommended secret token registered with Telegram using `setWebhook`.

### Variables

- `GITHUB_OWNER=mehrdadmb2`
- `GITHUB_REPO=ArzPulse`
- `GITHUB_WORKFLOW=update-prices.yml`
- `GITHUB_REF=main`
- `DATA_STALE_MINUTES=15`
- `BOT_ADMIN_IDS=123456789` — comma-separated numeric Telegram user IDs, not usernames. This is required for `/refresh`.

`wrangler.toml.example` is an example only. Copy it to `wrangler.toml` locally and replace the KV namespace ID with the existing ID. The Worker refuses webhook updates until `TELEGRAM_WEBHOOK_SECRET` is configured, by design. Never commit secrets or the actual private token.

## Deploy from local machine

From this directory:

```bash
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml and set the actual existing SETTINGS_KV namespace ID.
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy --config wrangler.toml
npm run check
npm test
```

For Windows PowerShell, use `Copy-Item wrangler.toml.example wrangler.toml` instead of `cp`. No `.ps1` installer is used.

## Register/check Telegram webhook

Use the exact deployed URL and the same secret configured in Cloudflare. Run locally in PowerShell; the token is prompted so it is not put in shell history as a literal:

```powershell
$token = Read-Host "Telegram bot token"
$secret = Read-Host "Telegram webhook secret"
$body = @{
  url = "https://arzpulse-bot.game-developer-mb.workers.dev/webhook"
  secret_token = $secret
  allowed_updates = '["message","channel_post"]'
}
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body $body
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

Check `url`, `pending_update_count`, `last_error_date`, and `last_error_message`. The registered URL must end with `/webhook`. Don't set a webhook on the market-updater Worker.

## Smoke checks

- `GET /health` returns safe configuration status; a `200` here does **not** prove Telegram webhook registration is correct.
- `GET /trigger` is intentionally rejected; manual trigger is `POST /trigger` with `Authorization: Bearer <ADMIN_SECRET>`.
- In Telegram, try `/start`, `/status`, `/prices`, `/chart BTC 24h`, `/chartall`.
- In Cloudflare Worker logs, inspect failures tagged `[telegram:...]`, `[market-data]`, `[github-dispatch]`, and `[chart]`.

## Storage / free-tier behavior

The bot does **not** store price history in KV. `SETTINGS_KV` contains a single `channels` JSON list and a short-lived refresh lock (`expirationTtl`); this lock expires automatically. It is deliberately not allowed to purge old channel settings when quota is reached, because those are user configuration rather than disposable history. The price history is stored in the GitHub repository under `docs/data/history/` and is compacted/pruned by `scripts/fetch-and-save.js` and `update-prices.yml`.

Cloudflare KV Free has hard daily operation quotas. When a quota is exceeded, further operations of that type can fail until the reset; deleting arbitrary keys is not a reliable way to repair a write quota and could delete valuable channel configuration. See the official KV pricing and limits documentation linked in the root `BOT-RECOVERY-AND-UPGRADE.fa.md`.
