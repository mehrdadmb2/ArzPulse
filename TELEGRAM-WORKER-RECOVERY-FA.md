# راهنمای بازیابی و استقرار ArzPulse Telegram Worker

این راهنما برای Worker زیر نوشته شده است:

- Worker: `arzpulse-bot`
- URL: `https://arzpulse-bot.game-developer-mb.workers.dev`
- Telegram bot: `@ExRateTrackerBot`
- Repository: `https://github.com/mehrdadmb2/ArzPulse`

## ۱) تفکیک سرویس‌ها

دو فایل `index.js` متفاوت وجود دارد و نباید جابه‌جا Deploy شوند:

| مسیر | نقش | نام Worker |
|---|---|---|
| `telegram-bot/index.js` | ربات تلگرام، webhook، فرمان‌ها، هشدارها، گزارش‌های دوره‌ای | `arzpulse-bot` |
| `worker/index.js` | ارسال درخواست اجرای GitHub Actions برای به‌روزرسانی داده | `arzpulse-market-updater` |

برای آدرس `arzpulse-bot.game-developer-mb.workers.dev` فقط `telegram-bot/index.js` را Deploy کن.

## ۲) علت‌های اصلی توقف ربات

در نسخهٔ قبلی، کد عمداً webhook را در دو وضعیت رد می‌کرد:

- نبود `TELEGRAM_BOT_TOKEN` → پاسخ HTTP 503
- نبود `TELEGRAM_WEBHOOK_SECRET` → پاسخ HTTP 503
- تفاوت Header تلگرام با Secret ثبت‌شده در Cloudflare → پاسخ HTTP 401

بنابراین داشتن Bot Token کافی نیست؛ مقدار `TELEGRAM_WEBHOOK_SECRET` باید هم در Cloudflare ثبت شده باشد و هم هنگام اجرای Telegram `setWebhook` به همان مقدار متصل شود.

## ۳) تنظیم Cloudflare Worker

در Cloudflare Dashboard، Worker با نام `arzpulse-bot` را باز کن.

### Secrets

این مقادیر باید در Settings → Variables and Secrets به‌عنوان Secret وجود داشته باشند:

| نام | کاربرد |
|---|---|
| `TELEGRAM_BOT_TOKEN` | توکن رباتی که از BotFather گرفته‌ای؛ باید متعلق به `@ExRateTrackerBot` باشد |
| `TELEGRAM_WEBHOOK_SECRET` | رمز مشترک Header وب‌هوک؛ رشته‌ای از حروف انگلیسی، اعداد، `_` یا `-` |
| `GITHUB_TOKEN` | توکن دسترسی GitHub با مجوز Actions: write برای `mehrdadmb2/ArzPulse` |
| `ADMIN_SECRET` | رمز طولانی و تصادفی برای Endpointهای مدیریتی و Diagnostics |

**هیچ‌یک از مقدارهای Secret را در GitHub یا فایل‌های پروژه Commit نکن.**

### Variables

| نام | مقدار |
|---|---|
| `BOT_USERNAME` | `ExRateTrackerBot` |
| `TELEGRAM_WEBHOOK_URL` | `https://arzpulse-bot.game-developer-mb.workers.dev/webhook` |
| `GITHUB_OWNER` | `mehrdadmb2` |
| `GITHUB_REPO` | `ArzPulse` |
| `GITHUB_WORKFLOW` | `update-prices.yml` |
| `GITHUB_REF` | `main` |
| `GITHUB_DISPATCH_ENABLED` | `true` |
| `DATA_STALE_MINUTES` | `15` |

### KV Binding

Binding با نام `SETTINGS_KV` باید به **همان Namespace ID قبلی** متصل باشد. Namespace تازه نساز؛ تنظیمات عدد/واحد، گزارش دوره‌ای، کانال‌ها و هشدارهای ذخیره‌شده در KV قبلی هستند.

### Cron Triggers

برای Worker ربات:

```text
*/5 * * * *
0 * * * *
```

اولی برای dispatch بازار، هشدارها و گزارش‌های شخصی است؛ دومی برای گزارش ساعتی کانال‌های ثبت‌شده.

**جلوگیری از اجرای تکراری:** در صورت فعال بودن Worker جداگانهٔ `arzpulse-market-updater` با Cron پنج‌دقیقه‌ای، فقط یکی از دو Worker باید GitHub Actions را به‌صورت زمان‌بندی‌شده اجرا کند. پیش‌فرض ArzPulse این است که Worker ربات dispatch را انجام دهد (`GITHUB_DISPATCH_ENABLED=true`). اگر Worker مجزای بازار فعال است، مقدار را روی `false` بگذار تا ربات فقط هشدار و گزارش شخصی را پردازش کند.

## ۴) Deploy فایل درست ربات

در PowerShell:

```powershell
cd telegram-bot
npx wrangler login
```

قبل از Deploy، در `wrangler.toml` شناسهٔ `SETTINGS_KV` را با Namespace ID موجود جایگزین کن. سپس Secretها را در صورت نیاز ثبت یا به‌روزرسانی کن:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_SECRET
```

بعد:

```powershell
npx wrangler deploy --config wrangler.toml
npm run check
npm test
```

اگر از Cloudflare Dashboard برای Deploy استفاده می‌کنی، محتوای `telegram-bot/index.js` را Deploy کن و Bindingها، Variableها و Cronهای بالا را روی همان Worker نگه دار.

## ۵) ثبت مجدد امن Webhook

پس از Deploy و ثبت Secretها، اسکریپت زیر را از ریشهٔ Repository اجرا کن:

```powershell
.\telegram-bot\scripts\repair-webhook.ps1
```

اسکریپت فقط `ADMIN_SECRET` را با ورودی امن می‌گیرد؛ توکن تلگرام را درخواست نمی‌کند. سپس:

1. Endpoint امن `POST /webhook/setup` را صدا می‌زند.
2. متد Telegram `setWebhook` را با URL صحیح و Secret موجود اجرا می‌کند.
3. `getWebhookInfo` را دوباره می‌خواند.
4. Endpoint `/diagnostics` را اجرا می‌کند و وضعیت را نشان می‌دهد.

Endpointهای مدیریتی فقط با هدر `Authorization: Bearer <ADMIN_SECRET>` یا `x-admin-secret` قابل استفاده‌اند.

## ۶) Health و Diagnostics

این آدرس‌ها را می‌توانی در مرورگر باز کنی:

- `https://arzpulse-bot.game-developer-mb.workers.dev/`
- `https://arzpulse-bot.game-developer-mb.workers.dev/health`

این دو مسیر فقط سلامت عمومی و وضعیت آماده‌بودن Bindingها را نشان می‌دهند و دیگر GitHub Actions را اجرا نمی‌کنند.

Diagnostics کامل، نیازمند `ADMIN_SECRET` است:

```powershell
$admin = Read-Host "ADMIN_SECRET"
$headers = @{ Authorization = "Bearer $admin" }
Invoke-RestMethod -Uri "https://arzpulse-bot.game-developer-mb.workers.dev/diagnostics" -Headers $headers
```

در خروجی Diagnostics این موارد را بررسی کن:

- `telegramIdentity.username` باید `ExRateTrackerBot` باشد.
- `telegramWebhook.urlMatchesExpected` باید `true` باشد.
- `telegramWebhook.pendingUpdateCount` بهتر است روند افزایشی نداشته باشد.
- `telegramWebhook.lastErrorMessage` باید خالی باشد.
- `settingsKv.readOk` باید `true` باشد.
- `marketData.available` باید `true` باشد و `marketData.stale` برابر `false` باشد.
- `readiness` در حالت سالم باید `ready` باشد.

Health عمومی هیچ‌کدام از Token یا Secretها را برنمی‌گرداند.

## ۷) راهنمای تشخیص خطا

| وضعیت | معنی | اقدام |
|---|---|---|
| `/health` می‌گوید `readiness=down` | توکن Telegram نصب نیست | Secret `TELEGRAM_BOT_TOKEN` را بررسی کن |
| Webhook با HTTP 503 پاسخ می‌دهد | توکن یا Webhook Secret ثبت نشده | Secrets را اضافه و Worker را Deploy کن |
| Webhook با HTTP 401 پاسخ می‌دهد | Secret Header تلگرام با Cloudflare یکسان نیست | اسکریپت `repair-webhook.ps1` را اجرا کن |
| `telegramIdentity.validToken=false` | توکن نامعتبر، revoke شده یا API در دسترس نیست | توکن BotFather را بررسی کن |
| نام ربات با `ExRateTrackerBot` تطابق ندارد | Token متعلق به ربات دیگری است | `TELEGRAM_BOT_TOKEN` را اصلاح کن |
| `urlMatchesExpected=false` | Webhook به Worker یا مسیر دیگری وصل است | `POST /webhook/setup` را اجرا کن |
| `pendingUpdateCount` رو به افزایش است | Telegram نمی‌تواند Updateها را تحویل دهد | `lastErrorMessage` و لاگ Worker را بررسی کن |
| `settingsKv.readOk=false` | Binding یا Namespace مشکل دارد | `SETTINGS_KV` را به Namespace قبلی وصل کن |
| دادهٔ بازار stale است | دادهٔ GitHub Pages یا Collector به‌روز نشده | Actions → Update Market Data را بررسی کن |
| `GITHUB_TOKEN` تنظیم نیست | پاسخ مستقیم ربات ممکن است کار کند اما dispatch بازار انجام نمی‌شود | مجوز Actions: write را بررسی کن |

## ۸) Smoke Test تلگرام

پس از موفق شدن Diagnostics، این دستورها را در چت خصوصی ربات بفرست:

```text
/start
/help
/status
/prices
/stocks
/stock NVDA
/forex
/fx EURUSD
/chart BTC 24h
/settings
```

برای تست گروه، ربات را به گروه اضافه کن و یک دستور با نام واقعی بفرست:

```text
/prices@ExRateTrackerBot
```

## ۹) لاگ‌های Worker

در Cloudflare → Worker → Logs، رخدادهای JSON با پیشوند `[ArzPulse]` را جستجو کن:

- `webhook_accepted`
- `webhook_rejected_missing_secret`
- `webhook_rejected_bad_secret`
- `update_received`
- `command_completed`
- `command_failed`
- `telegram_api_failed`
- `telegram_webhook_registered`
- `telegram_webhook_setup_failed`
- `scheduled_github_dispatch_accepted`
- `scheduled_github_dispatch_skipped`

لاگ‌ها شناسهٔ Update، نوع پیام، نام فرمان، زمان اجرا، نام متد Telegram و خطای کوتاه را ثبت می‌کنند؛ متن پیام کاربران، Bot Token و Secretها ثبت نمی‌شوند.

## ۱۰) CI پروژه

Workflow جدید `.github/workflows/telegram-bot-check.yml` روی تغییرات پوشهٔ `telegram-bot/` اجرا می‌شود و این موارد را تست می‌کند:

```powershell
npm run check
npm test
```

این Workflow، سلامت کد ربات را کنترل می‌کند؛ Deploy روی Cloudflare همچنان باید با Wrangler یا Dashboard انجام شود، مگر اینکه بعداً یک Pipeline جداگانه برای Deploy با Secretهای مخصوص Cloudflare تعریف شود.
