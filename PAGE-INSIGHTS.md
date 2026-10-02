# ArzPulse × GitHub Page Insights

This project includes an integrated traffic/visitor analytics panel powered by the existing
`github-page-insights` service.

## Included

- `docs/assets/page-insights.js` — local copy of the Universal Event Insights browser SDK.
- `docs/assets/page-insights-widget.js` — ArzPulse presentation/adapter layer.
- `docs/assets/page-insights-widget.css` — scoped styling for the analytics card.
- `docs/index.html` — integration config + script/style loading + stable analytics mount point.

## Production configuration

The site uses the shared production Worker documented by the source project:

`https://github-page-insights-worker.game-developer-mb.workers.dev`

Platform identity:

- ID: `arzpulse`
- Name: `ArzPulse | Market Terminal`
- Type: `web`
- Environment: `production`

The Browser SDK sends a Basic `pageview` event per page load. The analytics panel reads
7-day platform aggregates and refreshes them every five minutes. The SDK does not require
any GitHub token, D1 credential, Telegram secret, or other private secret in browser code.

Source project:
https://github.com/mehrdadmb2/github-page-insights

The panel also keeps a local browser cache so a temporary analytics API failure does not
erase the last successfully loaded statistics.

## Replacement

Replace the repository with this package as a whole, or copy the updated files from the
same relative paths. Do not remove `docs/data/` or alter the existing market data pipeline.
