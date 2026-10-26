# ArzPulse Market Intelligence Upgrade — Test Report

Date: 2026-10-26

## Automated checks
- `node --check scripts/fetch-and-save.js`: passed.
- `node --check docs/assets/app.js`: passed.
- `node --check telegram-bot/index.js`: passed.
- `npm run check` in `telegram-bot`: passed.
- `npm test` in `telegram-bot`: 9/9 passed, including mocked `/crypto` and `/macro` command tests.
- HTML/app selector cross-check: all `$('#...')` IDs used by `app.js` are present in `docs/index.html` (88 selectors checked).
- Local HTML assets: all referenced local files exist; Page Insights remains near the end of the page before the footer.
- Mocked collector run: passed; generated schema version 6 with 28 crypto tickers and `fearGreed`, `global`, `derivatives`, including ETH dominance.
- HTML script/style path checks: all local referenced assets exist.

## Scope of live verification
External data providers could not be reached from this build environment. Therefore Binance, Alternative.me, CoinGecko, Yahoo Finance availability, quotas and current live response payloads have not been verified from the deployment environment. The Collector uses explicit parsing, per-source failure isolation and stale-value flags; validate the first real GitHub Actions collection in its logs.

## Added data
- Global spot crypto ticker snapshot for a curated list of 28 assets.
- Alternative.me Fear & Greed and previous/day-week values when the endpoint provides them.
- Global crypto market cap, 24h volume, BTC/ETH dominance, 24h market-cap change, active crypto and market counts from CoinGecko Global API, with Alternative.me fallback.
- BTC/ETH perpetual futures funding and BTC open-interest estimate from Binance USD-M Futures.
- Website market context panel and extra global-quote data in asset details.
- Telegram `/crypto`, `/coins`, `/macro`, `/market`, `/sentiment`, expanded asset commands, and wider chart symbol support.

No real-time network/API success is claimed by the local tests.
