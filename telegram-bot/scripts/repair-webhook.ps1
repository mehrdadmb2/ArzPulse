#requires -Version 5.1
<#
.SYNOPSIS
  Re-registers the Telegram webhook for the ArzPulse bot Worker and verifies it.
.DESCRIPTION
  Uses the existing TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET configured
  in Cloudflare. Only the Worker ADMIN_SECRET is requested locally.
  The secret is read as a SecureString and is never printed.
#>
[CmdletBinding()]
param(
  [string]$WorkerBaseUrl = "https://arzpulse-bot.game-developer-mb.workers.dev"
)

$ErrorActionPreference = "Stop"
$WorkerBaseUrl = $WorkerBaseUrl.TrimEnd("/")
$secure = Read-Host "Cloudflare Worker ADMIN_SECRET" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $adminSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $headers = @{ Authorization = "Bearer $adminSecret" }

  Write-Host "`n[1/2] Registering Telegram webhook..." -ForegroundColor Cyan
  $setup = Invoke-RestMethod -Method Post -Uri "$WorkerBaseUrl/webhook/setup" -Headers $headers -TimeoutSec 25
  if (-not $setup.ok) {
    throw "Telegram did not confirm the expected webhook URL. Review the returned diagnostics."
  }
  Write-Host "[OK] Webhook registered: $($setup.url)" -ForegroundColor Green

  Write-Host "`n[2/2] Running live diagnostics..." -ForegroundColor Cyan
  $diagnostics = Invoke-RestMethod -Method Get -Uri "$WorkerBaseUrl/diagnostics" -Headers $headers -TimeoutSec 25
  $diagnostics | ConvertTo-Json -Depth 10

  if ($diagnostics.telegramIdentity.username -ne "ExRateTrackerBot") {
    Write-Warning "Worker token belongs to @$($diagnostics.telegramIdentity.username), not @ExRateTrackerBot. Verify TELEGRAM_BOT_TOKEN."
  }
  if (-not $diagnostics.telegramWebhook.urlMatchesExpected) {
    Write-Warning "Telegram webhook URL does not match the configured Worker URL."
  }
  if ($diagnostics.telegramWebhook.lastErrorMessage) {
    Write-Warning "Telegram reports: $($diagnostics.telegramWebhook.lastErrorMessage)"
  }
  if ($diagnostics.readiness -ne "ready") {
    Write-Warning "Worker readiness is '$($diagnostics.readiness)'. Review the warnings and checks above."
  } else {
    Write-Host "`n[OK] Worker and Telegram webhook checks completed." -ForegroundColor Green
  }
}
catch {
  Write-Host "`n[FAILED] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Check that TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, ADMIN_SECRET and the existing SETTINGS_KV binding are configured in Cloudflare." -ForegroundColor Yellow
  exit 1
}
finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $adminSecret = $null
  $headers = $null
  $secure.Dispose()
}
