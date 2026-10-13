# راهنمای بازیابی کامل ArzPulse (بدون فایل PowerShell اسکریپت)

این بسته شامل سایت، Page Insights در پایین صفحه، Collector، دو Workflow، Worker به‌روزرسانی بازار و Worker مستقل ربات تلگرام است.

## مهم: دو Worker متفاوت‌اند

- `worker/` نام Worker به‌روزرسانی بازار است (`arzpulse-market-updater`) و هر ۵ دقیقه GitHub Action را Dispatch می‌کند.
- `telegram-bot/` نام Worker ربات تلگرام است (`arzpulse-bot`) و Webhook و گزارش ساعتی کانال‌ها را مدیریت می‌کند.
- کد این دو Worker را با هم جابه‌جا نکنید.

## A. جایگزینی فایل‌های GitHub

1. از ریپوی فعلی یک Clone تازه بگیرید یا آخرین تغییرات را Pull کنید.
2. از `docs/data/` نسخهٔ پشتیبان داشته باشید؛ فایل‌های داده را با Snapshot قدیمی این ZIP جایگزین نکنید.
3. فایل‌های همین بسته را روی Clone فعلی کپی کنید، به‌جز `docs/data/` که باید از نسخهٔ فعلی حفظ شود.
4. بررسی کنید Workflow قیمت‌ها یک زمان‌بندی پشتیبان ۱۵ دقیقه‌ای دارد که وقتی Snapshot کمتر از ۱۲ دقیقه عمر داشته باشد اجرا را رد می‌کند؛ زمان‌بندی اصلی به Worker پنج‌دقیقه‌ای سپرده شده است.
5. اجرا کنید:

```powershell
node --check scripts/fetch-and-save.js
```

6. Commit و Push دستی:

```powershell
git add .github/workflows/update-prices.yml .github/workflows/keep-alive.yml scripts/fetch-and-save.js worker/index.js worker/wrangler.toml worker/README.md telegram-bot docs/index.html docs/assets/page-insights.js docs/assets/page-insights-widget.js docs/assets/page-insights-widget.css README.md .gitignore RECOVERY-AND-DEPLOYMENT-FA.md TEST-REPORT.md DATA-PRESERVATION.txt
git commit -m "fix: harden ArzPulse automation and Telegram bot"
git pull --rebase origin main
git push origin main
```

اگر Git گفت چیزی برای Commit نیست، مرحلهٔ Commit را رد کنید. از `git push --force` استفاده نکنید.

## B. راه‌اندازی Worker ربات با Wrangler در PowerShell

ابتدا Wrangler و Node.js را نصب/به‌روز کنید. سپس:

```powershell
cd .\telegram-bot
Copy-Item .\wrangler.toml.example .\wrangler.toml
notepad .\wrangler.toml
```

در فایل بازشده، مقدار `REPLACE_WITH_EXISTING_SETTINGS_KV_NAMESPACE_ID` را با Namespace ID واقعی **همان KV فعلی ربات** عوض کنید. این کار حیاتی است؛ ساختن KV جدید باعث می‌شود تنظیمات کانال‌های قبلی دیده نشوند. اگر ID را نمی‌دانید، از Cloudflare Dashboard → Workers & Pages → KV آن را پیدا کنید. Secretها را داخل TOML قرار ندهید.

سپس از همان پوشه:

```powershell
npx wrangler login
npm run check
npm test
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy --config .\wrangler.toml
```

هر فرمان `secret put` از شما مقدار را تعاملی می‌پرسد. از Token واقعی در پیام، فایل، Git یا دستور قابل ذخیره‌شدن خودداری کنید. `TELEGRAM_WEBHOOK_SECRET` باید ۱ تا ۲۵۶ کاراکتر از مجموعهٔ `A-Z a-z 0-9 _ -` باشد؛ یک مقدار تصادفی طولانی انتخاب کنید.

در Cloudflare Dashboard → Worker → Settings → Variables نیز این Variable را تنظیم کنید:

- `BOT_ADMIN_IDS`: شناسهٔ عددی تلگرام مدیر یا مدیرها، با کاما جدا شده، مثلاً `123456789,987654321`.

`GITHUB_TOKEN` باید به ریپوی `mehrdadmb2/ArzPulse` دسترسی داشته باشد و مجوز Actions: write داشته باشد. همین Secret را در Worker به‌روزرسانی بازار نیز تنظیم کنید.

## C. تنظیم Webhook تلگرام

پس از Deploy، در PowerShell این دستورات را اجرا کنید. مقدار Token و Secret تعاملی وارد می‌شود:

```powershell
$token = Read-Host "Telegram bot token"
$secret = Read-Host "Telegram webhook secret"
$body = @{
  url = "https://arzpulse-bot.game-developer-mb.workers.dev/webhook"
  secret_token = $secret
  allowed_updates = '["message","channel_post"]'
}
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType "application/x-www-form-urlencoded" -Body $body
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

در پاسخ `getWebhookInfo` بررسی کنید که `url` دقیقاً به `/webhook` ختم شود و `last_error_message` خالی باشد. `pending_update_count` نباید به‌صورت مداوم بالا برود. اگر قبلاً Webhook دیگری برای همین Bot Token ثبت شده، `setWebhook` آن را به URL جدید منتقل می‌کند.

## D. راه‌اندازی Worker قیمت‌ها با Wrangler

از پوشهٔ ریشهٔ پروژه:

```powershell
cd .\worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_SECRET
npx wrangler deploy --config .\wrangler.toml
```

این Worker باید همان نام `arzpulse-market-updater` و Cron پنج‌دقیقه‌ای را داشته باشد. در Cloudflare Dashboard → Triggers → Cron نیز بررسی کنید `*/5 * * * *` فعال باشد. `GITHUB_TOKEN` باید اجازهٔ Dispatch کردن Workflow را داشته باشد.

## E. تست سلامت

### Worker ربات

- `https://arzpulse-bot.game-developer-mb.workers.dev/health`
- `https://arzpulse-bot.game-developer-mb.workers.dev/` 

این Endpointها فقط وضعیت کلی پیکربندی را نشان می‌دهند؛ به‌تنهایی سلامت Webhook را تضمین نمی‌کنند.

برای جزئیات بیشتر، با `ADMIN_SECRET` اجرا کنید:

```powershell
$admin = Read-Host "ADMIN_SECRET"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $admin" } -Uri "https://arzpulse-bot.game-developer-mb.workers.dev/diagnostics"
```

در خروجی بررسی کنید: `telegramWebhook.configured`, `telegramWebhook.lastErrorMessage`, `marketData.available`, `marketData.stale`, `settingsKv.readOk` و `settingsKv.configuredDestinations`.

### دستورات تلگرام

در چت خصوصی:

```text
/start
/help
/id
/status
/prices
/chart BTC 24h
```

در گروه مقصد، ربات را اضافه کنید و دسترسی ارسال پیام بدهید؛ سپس دستور `/setchannel` را در همان گروه اجرا کنید. برای `/refresh` شناسهٔ عددی مدیر باید در `BOT_ADMIN_IDS` باشد.

### Workflow قیمت‌ها

GitHub → Actions → Update Market Data → Run workflow. اگر خطا داد، ابتدا خطای Collector/upstream را بررسی کنید؛ اگر Push رد شد، بررسی کنید آیا شاخهٔ main با تغییر دستی یا Workflow دیگری تغییر می‌کند.

## F. نگه‌داری داده و محدودیت رایگان

- `SETTINGS_KV` فقط تنظیمات کانال و قفل کوتاه‌مدت را نگه می‌دارد؛ قیمت‌ها در KV ذخیره نمی‌شوند.
- هنگام خطای KV، نسخهٔ جدید خطا را به‌عنوان «فهرست خالی کانال‌ها» تفسیر نمی‌کند؛ Diagnostics خطای خواندن را نشان می‌دهد.
- تاریخچهٔ قیمت در `docs/data/history/` نگه‌داری می‌شود؛ Collector فایل‌های خارج از بازهٔ نگه‌داری را حذف و فایل‌های باقی‌مانده را فشرده می‌کند.
- حذف فایل از نسخهٔ جاری Git، اندازهٔ تاریخچهٔ قدیمی Commitها را خودکار کم نمی‌کند. بازنویسی تاریخچهٔ Git عملیاتی جدا و پرریسک است و این بسته عمداً `force push` انجام نمی‌دهد.
- اگر KV به سقف عملیات روزانه برسد، پاک کردن دلخواه داده راه‌حل امنی نیست؛ ابتدا Diagnostics و Cloudflare Usage را بررسی کنید. کانال‌ها خودکار پاک نمی‌شوند.

## G. آمار بازدید سایت

فایل‌های `docs/assets/page-insights.js`, `page-insights-widget.js` و `page-insights-widget.css` حفظ شده‌اند. کادر Analytics با Platform ID `arzpulse` از Worker پروژهٔ `github-page-insights` داده می‌خواند و در پایین صفحه، درست پیش از Footer نمایش داده می‌شود. برای نمایش داده‌ها، GitHub Pages باید فایل‌های جدید را Deploy کند؛ اولین آمار پس از دریافت و تجمیع رویدادها ظاهر می‌شود.

## H. سناریوهای عیب‌یابی

- ربات هیچ پاسخی نمی‌دهد: `getWebhookInfo`، Secret یکسان در Cloudflare و Telegram، Logs Worker و `pending_update_count` را بررسی کنید.
- `401 Unauthorized` روی `/webhook`: مقدار `TELEGRAM_WEBHOOK_SECRET` با Secret ثبت‌شده در Telegram یکسان نیست.
- `503` روی `/webhook`: Secret تنظیم نشده؛ آن را در Cloudflare ثبت و Deploy کنید.
- `/prices` می‌گوید داده نیست: `latest.json` و `marketData.available` را بررسی کنید.
- `/setchannel` ذخیره نمی‌کند: Binding `SETTINGS_KV` باید به Namespace قبلی متصل باشد و سهمیهٔ KV در دسترس باشد.
- گزارش ساعتی نمی‌رسد: Cron ربات `0 * * * *`، تعداد مقصدهای ذخیره‌شده، دسترسی ارسال در مقصد و Logs را بررسی کنید.
- `/refresh` اجرا نمی‌شود: `BOT_ADMIN_IDS`, `GITHUB_TOKEN`, مجوز Actions: write و `GITHUB_WORKFLOW=update-prices.yml` را بررسی کنید.
- نمودار نمی‌رسد: تاریخچهٔ حداقل چند Snapshot داشته باشد، QuickChart در دسترس باشد و Worker زمان اجرای مجاز را رد نکرده باشد.
- Push رد می‌شود: از `git pull --rebase origin main` استفاده کنید؛ `force push` نزنید.

این پروژه تست‌های خودکار محلی دارد؛ آن‌ها جایگزین بررسی Secrets، KV ID، Webhook و Cron واقعی در Cloudflare نیستند.
