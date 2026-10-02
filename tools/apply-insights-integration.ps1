param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Get-Location).Path
}

$index = Join-Path $RepoRoot 'docs/index.html'
$assets = Join-Path $RepoRoot 'docs/assets'
$srcRoot = Split-Path -Parent $PSScriptRoot
$srcAssets = Join-Path $srcRoot 'docs/assets'

if (-not (Test-Path $index)) {
  throw "docs/index.html not found under: $RepoRoot"
}

New-Item -ItemType Directory -Force $assets | Out-Null
Copy-Item (Join-Path $srcAssets 'page-insights.js') $assets -Force
Copy-Item (Join-Path $srcAssets 'page-insights-widget.css') $assets -Force
Copy-Item (Join-Path $srcAssets 'page-insights-widget.js') $assets -Force

$html = Get-Content -Raw -LiteralPath $index

if ($html -match 'page-insights-widget\.js') {
  Write-Host 'ArzPulse Page Insights is already installed. No duplicate changes made.' -ForegroundColor Yellow
  exit 0
}

$backup = "$index.pre-page-insights.bak"
Copy-Item $index $backup -Force

$headSnippet = @'
<meta name="page-insights-platform-id" content="arzpulse">
<meta name="page-insights-platform-name" content="ArzPulse | Market Terminal">
<link rel="stylesheet" href="assets/page-insights-widget.css?v=1">
<script>
  window.PAGE_INSIGHTS_CONFIG = Object.freeze({
    workerUrl: 'https://github-page-insights-worker.game-developer-mb.workers.dev',
    platformId: 'arzpulse',
    platformName: 'ArzPulse | Market Terminal',
    platformType: 'web',
    environment: 'production',
    appVersion: 'ArzPulse'
  });
</script>
<script src="assets/page-insights.js?v=1" defer></script>
'@

$bodySnippet = '<script src="assets/page-insights-widget.js?v=1" defer></script>'

if ($html -notmatch '</head>') { throw 'Missing </head> in docs/index.html' }
if ($html -notmatch '</body>') { throw 'Missing </body> in docs/index.html' }

$html = $html -replace '</head>', ($headSnippet + "`r`n</head>")
$html = $html -replace '</body>', ($bodySnippet + "`r`n</body>")

[System.IO.File]::WriteAllText($index, $html, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host 'Installed ArzPulse × GitHub Page Insights.' -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host 'Only docs/index.html and three new docs/assets files were changed/added.'
Write-Host 'Existing app.js, app.css, data files, worker and workflows were not modified.'
