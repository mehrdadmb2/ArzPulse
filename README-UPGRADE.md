# ArzPulse Pro v13

This package preserves the earlier ArzPulse glass/galaxy visual system while adding a more resilient persistent portfolio layer.

## What changed

- Previous/preferred market-terminal visual language restored as the base CSS.
- Portfolio remains website + Telegram compatible.
- D1 is optional and becomes the primary profile store when bound as `PORTFOLIO_DB`.
- Existing `SETTINGS_KV` remains the fallback store and is also used by Telegram channel/profile linking.
- Legacy v12 SHA-256 PIN profiles are upgraded to PBKDF2-SHA256 after a successful PIN verification. Cloudflare Workers Web Crypto supports PBKDF2.
- Portfolio writes use revision checks + operation IDs to reduce duplicate submissions and lost updates.
- Frontend uses stale-while-revalidate cache for latest data/history, request timeouts and retry.
- `/health` is public and does not expose secret values.
- `/trigger`, `/check`, `/send` are admin-protected with `X-ArzPulse-Admin`.
- `/webhook` can be protected with `TELEGRAM_WEBHOOK_SECRET`.
- Portfolio backup export is available via the site.

## Storage

### Existing setup (no D1)
Keep the current `SETTINGS_KV` binding. v13 automatically uses it.

### Recommended setup (D1 primary)
1. Create a Cloudflare D1 database.
2. Bind it to the Worker as `PORTFOLIO_DB`.
3. Apply `worker/schema.sql`.
4. Keep the existing `SETTINGS_KV` binding.
5. Deploy the Worker.

Cloudflare's D1 Worker API uses prepared statements and `bind()` for parameters; D1 `batch()` is transactional, but v13 uses a single optimistic revision update per mutation so concurrent edits are rejected rather than silently overwritten.

## Secrets

Set: `TELEGRAM_BOT_TOKEN`, `GITHUB_TOKEN`, `ADMIN_SECRET`, and optionally `TELEGRAM_WEBHOOK_SECRET`. GitHub workflow dispatch requires a token with Actions write permission for the repository.

## Telegram

Existing commands remain, plus:

- `/setprofile username PIN Display Name`
- `/portfolio`
- `/profile username`
- `/buy SYMBOL QUANTITY PRICE PIN`
- `/sell SYMBOL QUANTITY PRICE PIN`

## Website Worker URL

Use the Portfolio **Configure** button or set `WORKER_URL` in `docs/assets/config.js`. The frontend defaults to English and keeps the existing English/Persian toggle.

## GitHub Actions + Cloudflare

The workflow is `workflow_dispatch` only; Cloudflare Cron remains the five-minute scheduler for the Worker, which in turn triggers the GitHub Action when the generated data is stale.

## Validation

The package was syntax-checked with `node --check` for the browser JS, collector and Worker, and the ZIP was integrity-tested.
