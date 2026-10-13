# Cloudflare Worker roles

This folder is the **market-data updater**, deployed separately from the Telegram bot in `../telegram-bot/`. Its Cron Trigger dispatches `.github/workflows/update-prices.yml` every five minutes.

## Production bindings

Required Secret:
- `GITHUB_TOKEN` — fine-grained token with access to `mehrdadmb2/ArzPulse` and `Actions: write`.
- `ADMIN_SECRET` — required only for the manual `POST /trigger` endpoint. Generate a long random value and do not put it in source files.

Variables in `wrangler.toml`:
- `GITHUB_OWNER=mehrdadmb2`
- `GITHUB_REPO=ArzPulse`
- `GITHUB_WORKFLOW=update-prices.yml`
- `GITHUB_REF=main`

`GET /health` shows safe configuration status. `POST /trigger` is disabled unless `ADMIN_SECRET` is configured and requires `Authorization: Bearer <ADMIN_SECRET>`. The scheduled `scheduled()` handler does not need this secret to dispatch the scheduled workflow.

Do not deploy `telegram-bot/index.js` over this Worker, and do not deploy this file over the `arzpulse-bot` Worker.
