# گزارش اصلاح و بازیابی ArzPulse v8.1

## نتیجه بررسی

فایل ارسالی `ArzPulse-main(2).zip` با فایل `telegram-bot/index.js` فعلی شاخهٔ `main` در GitHub یکسان بود. Git blob SHA فایل موجود در ZIP برابر با مقدار ثبت‌شده برای فایل در Repository است؛ پس اشکال از اختلاف نسخهٔ ZIP و GitHub نبود.

علت اصلی محتمل توقف ربات در کد این بود که مسیر `POST /webhook` بدون `TELEGRAM_WEBHOOK_SECRET` عمداً HTTP 503 برمی‌گرداند و با Secret نامنطبق HTTP 401 می‌دهد. در نتیجه، اگر Secret در Cloudflare ثبت نشده یا webhook تلگرام با همان مقدار تنظیم نشده باشد، هیچ فرمانی پردازش نمی‌شود.

موارد همراه:
- درخواست GET به ریشهٔ Worker به‌جای Health، یک GitHub Actions workflow را dispatch می‌کرد.
- Health عمومی وضعیت زندهٔ Bot API و تطابق URL webhook را بررسی نمی‌کرد.
- راهنماها و متن راهنمای داخل ربات هنوز از نام قدیمی `@ArzPulseBot` استفاده می‌کردند، درحالی‌که نام اعلام‌شدهٔ ربات `@ExRateTrackerBot` است.
- اگر Bot Worker و Market Updater Worker هر دو Cron پنج‌دقیقه‌ای dispatch داشته باشند، ممکن است اجرای تکراری GitHub Actions ایجاد شود.

## اصلاحات اعمال‌شده

1. ریشهٔ Worker و `/health` اکنون read-only هستند و هیچ درخواست GitHub workflow dispatch نمی‌کنند.
2. `/health` وضعیت تنظیمات ضروری و مقدار readiness را بدون نمایش هیچ Secret گزارش می‌کند.
3. `/diagnostics` با `ADMIN_SECRET` محافظت شده و موارد زیر را واقعاً بررسی می‌کند:
   - معتبر بودن Bot Token از طریق `getMe`
   - نام کاربری واقعی ربات و تطابق با `ExRateTrackerBot`
   - URL ثبت‌شده در `getWebhookInfo`
   - تعداد Updateهای منتظر و آخرین خطای webhook
   - اتصال و خواندن KV
   - در دسترس بودن و تازگی Snapshot بازار
4. Endpoint محافظت‌شدهٔ `POST /webhook/setup` اضافه شد تا با استفاده از Secretهای Worker، متد `setWebhook` تلگرام را اجرا و نتیجه را با `getWebhookInfo` تأیید کند.
5. لاگ‌های JSON ساخت‌یافته برای webhook، Update، فرمان، Telegram API، خطاها و زمان اجرا اضافه شد. متن پیام و Secretها در لاگ قرار نمی‌گیرند.
6. نام ربات در Welcome، Help، نمونهٔ دستورهای گروه و لینک‌های README به `@ExRateTrackerBot` تغییر کرد.
7. متغیر `GITHUB_DISPATCH_ENABLED` برای انتخاب یک Dispatcher زمان‌بندی‌شده اضافه شد.
8. اسکریپت `telegram-bot/scripts/repair-webhook.ps1` برای ثبت مجدد webhook و دریافت Diagnostics اضافه شد.
9. Workflow کنترل کیفیت `.github/workflows/telegram-bot-check.yml` برای اجرای Syntax Check و Smoke Tests هنگام تغییر کد ربات اضافه شد.
10. راهنمای فارسی `TELEGRAM-WORKER-RECOVERY-FA.md` اضافه شد.

## تست‌ها

- `node --check index.js`: موفق
- `npm run check`: موفق
- `npm test`: 27 تست از 27 تست موفق
- TOML هر دو فایل Wrangler: معتبر
- تست PowerShell: در محیط اجرا `pwsh` نصب نبود؛ فایل اسکریپت بازبینی شده اما اجرای واقعی آن انجام نشده است.

تست‌ها از Mock برای Telegram API، GitHub Pages و KV استفاده می‌کنند؛ بنابراین جای تست واقعی روی حساب Cloudflare را نمی‌گیرند.

## اقدامات لازم پس از دریافت بسته

1. `telegram-bot/index.js` را روی Worker به نام `arzpulse-bot` Deploy کن؛ فایل `worker/index.js` برای Worker جداگانهٔ Market Updater است.
2. Secretهای `TELEGRAM_BOT_TOKEN`، `TELEGRAM_WEBHOOK_SECRET`، `ADMIN_SECRET` و `GITHUB_TOKEN` را در Cloudflare تنظیم کن.
3. Binding `SETTINGS_KV` را به همان Namespace موجود قبلی وصل کن؛ Namespace جدید نساز.
4. متغیر `BOT_USERNAME` را `ExRateTrackerBot` و `TELEGRAM_WEBHOOK_URL` را به URL کامل `/webhook` تنظیم کن.
5. بعد از Deploy از ریشهٔ Repository، `.\\telegram-bot\\scripts\\repair-webhook.ps1` را اجرا کن.
6. خروجی Diagnostics را بررسی کن؛ در حالت سالم `readiness` باید `ready`، `telegramIdentity.username` باید `ExRateTrackerBot` و `telegramWebhook.urlMatchesExpected` باید `true` باشد.

## محدودیت محیط

این اصلاحات در فایل‌های محلی بسته و تست‌های خودکار انجام شده‌اند. دسترسی مستقیم به Cloudflare Account، Worker Logs، Telegram Bot Token یا Secrets حساب وجود نداشت. بنابراین Worker زنده از اینجا Deploy نشده و webhook واقعی حساب تغییر نکرده است.
