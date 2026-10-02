# ArzPulse × GitHub Page Insights — minimal integration

This package adds the traffic/visitor statistics capability from:

https://github.com/mehrdadmb2/github-page-insights

without changing ArzPulse market logic, CSS, charts, worker, workflows or data files.

## What is added

- `docs/assets/page-insights.js`
  - Browser SDK based on the repository's current Basic-mode SDK.
  - Sends one `pageview` event per page load.
  - Uses stable visitor/session IDs in browser storage.
- `docs/assets/page-insights-widget.css`
  - Scoped UI styles for the statistics box only.
- `docs/assets/page-insights-widget.js`
  - Fetches `GET /v1/platforms/arzpulse?days=7`.
  - Shows page views, unique visitors, sessions, average visit time, all-time counters, 7-day trend, top countries and device mix.
  - Refreshes every 5 minutes.
  - Falls back to locally cached analytics data if the analytics Worker is temporarily unavailable.

## Exact production service used

Worker:
`https://github-page-insights-worker.game-developer-mb.workers.dev`

Platform ID:
`arzpulse`

The upstream repository documents the same Worker and `GET /v1/platforms/<platformId>?days=7` API. It also documents that its browser SDK sends pageview telemetry to `POST /v1/events` and that the GET API provides aggregate views/visitors/sessions and daily data.

## Minimal site change

Only `docs/index.html` needs two tiny additions:

1. Before `</head>` paste `integration-head-snippet.html`.
2. Before `</body>` paste `integration-body-snippet.html`.

Everything else remains as it is.

## Automatic install on Windows

From the package folder:

```powershell
.tools\apply-insights-integration.ps1 -RepoRoot "C:\path\to\ArzPulse"
```

The script:
- copies the three new assets into `docs/assets/`
- creates `docs/index.html.pre-page-insights.bak`
- adds only the required head/body integrations
- refuses to create duplicates if it detects the widget already installed
- does not modify `app.js`, `app.css`, `docs/data`, `worker`, `.github/workflows` or other files

## Notes

The analytics box reads aggregate statistics only. It does not display raw IP addresses or raw event records.

The first page view may appear as zero until the analytics collector receives the event and the platform aggregate is updated. The widget automatically retries on its next refresh.

The upstream Worker currently sets permissive CORS for its public read APIs, so the ArzPulse GitHub Pages dashboard can read this aggregate endpoint from the browser.
