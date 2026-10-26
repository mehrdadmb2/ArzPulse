# ArzPulse Telegram Bot Worker

This folder is the **Telegram bot Worker only**. It is separate from `../worker/`, which dispatches the five-minute market-data workflow. Deploying the bot file to the updater Worker will disable price dispatching, so keep these deployments separate.

## Features

- Market commands: `/start`, `/help`, `/prices`, `/gold`, `/dollar`, `/btc`, `/eth`, `/usdt`, `/not`, `/crypto`, `/coins`, `/macro`, `/market`, `/sentiment`, `/status`, `/chart`, `/chartall`. Major global crypto commands such as `/sol`, `/bnb`, `/xrp`, `/doge`, `/link`, `/avax`, `/dot` and others are supported when present in the latest snapshot.
- Group/channel reporting using the existing `SETTINGS_KV` key named `channels` (compatibility preserved).
- `/setchannel` and `/stopchannel` require a chat administrator; `/refresh` requires a numeric user ID listed in `BOT_ADMIN_IDS`.
- Telegram HTML formatting: bold headings, `<pre><code>` monospace data, and `<blockquote>` status notes; invalid HTML has a controlled plain-text fallback.
- Historical charts via QuickChart's POST API and binary photo upload; `/chartall` attempts one Telegram media group to reduce round trips. The collector also appends history values for supported major cryptos.
- Fast webhook acknowledgement, optional Telegram webhook secret validation, command/update error logs, a bounded manual-refresh lock, and protected diagnostic endpoints.
- Public `/health` (also `/` and `/test`) only exposes configuration booleans, never secret values.
- Market context commands expose global market cap/volume, BTC dominance, Alternative.me Fear & Greed sentiment, Binance Spot market breadth, BTC/ETH futures funding, BTC open interest and macro market changes.

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

The bot does not store the website's full daily price history in KV; that remains in the GitHub repository under `docs/data/history/` and is compacted/pruned by `scripts/fetch-and-save.js` and `update-prices.yml`. `SETTINGS_KV` retains the existing `channels` JSON list and short-lived refresh lock, plus compact alert preferences, rolling alert snapshots (up to the 15-minute/1-hour/6-hour detection window), and cooldown metadata. The snapshot and rolling history share one `alerts:state:v2` value to reduce writes during five-minute checks; existing split v1 alert keys are read for backward-compatible migration and the legacy `channels` key is never overwritten by the alert system. It is deliberately not allowed to purge old channel settings when quota is reached, because those are user configuration rather than disposable history.

Cloudflare KV has daily operation limits on Free plans. The consolidated alert state avoids two separate snapshot/history writes each five-minute tick, and cooldown metadata is written only when it actually changes. When a quota is exceeded, further operations of that type can fail until reset; deleting arbitrary keys is not a reliable repair and could remove valuable channel configuration. See the official KV pricing and limits documentation linked in the root `BOT-RECOVERY-AND-UPGRADE.fa.md`.


## Automatic market alerts

The existing `*/5 * * * *` Cron invocation now performs two independent tasks: it dispatches the ArzPulse GitHub Actions workflow and evaluates the latest published snapshot for alert conditions. The hourly channel digest remains on `0 * * * *`.

Private chats must opt in with `/alertson`. A chat already registered with `/setchannel` receives important/critical alerts by default unless that chat explicitly sends `/alertsoff`. Use `/alerts` for status/help, `/alertlevel low` for all matching signal levels, `/alertlevel medium` for important/critical signals, and `/alertlevel high` for critical signals only. For group destinations, only a chat administrator can change alert preferences.

Detection rules include sudden moves between consecutive snapshots, new crossings of 24-hour move thresholds, extreme Fear & Greed shifts, total market-cap threshold crossings, BTC/ETH funding extremes, sharp BTC open-interest changes, and broad same-direction market breadth. Each alert contains price/measure, change, source and timestamp, with context and a risk note. A first run only seeds the comparison baseline. Stale published snapshots are not used for price-shock alerts, and an alert cooldown limits repeated notifications.

Optional Worker vars: `ALERT_CRYPTO_MOVE_PCT` (default `0.85`), `ALERT_LOCAL_MOVE_PCT` (default `0.45`), `ALERT_MACRO_MOVE_PCT` (default `0.55`), and `ALERT_COOLDOWN_MINUTES` (default `25`). They may be set in the deployed Worker’s vars. Alert preferences, cooldowns and the last baseline are stored in the existing `SETTINGS_KV` namespace under new keys; the legacy `channels` key is not overwritten.

The dashboard adds the Market Signal Radar and asset-specific market cards. Cryptocurrency logos are loaded from the open `spothq/cryptocurrency-icons` asset set with a text-symbol fallback if a remote icon is unavailable. Icons are decorative and do not affect market data collection.
