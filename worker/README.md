# ArzPulse market updater Worker

This is the market-data dispatcher, not the Telegram bot. It dispatches the `update-prices.yml` GitHub Actions workflow on a five-minute Cron Trigger.

## Deploy manually from PowerShell

From the repository root:

```powershell
cd .\worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_SECRET
npx wrangler deploy --config .\wrangler.toml
```

`GITHUB_TOKEN` must have Actions: write permission for `mehrdadmb2/ArzPulse`. `ADMIN_SECRET` protects the manual `POST /trigger` endpoint. The Worker config contains no secrets.

Check `GET /health`. For manual dispatch, use `POST /trigger` with `Authorization: Bearer <ADMIN_SECRET>`.

The bot is deployed separately from `telegram-bot/`. Never upload `telegram-bot/index.js` to this Worker.
