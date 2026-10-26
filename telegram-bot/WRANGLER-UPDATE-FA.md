# راهنمای امن به‌روزرسانی ربات ArzPulse با Wrangler در ویندوز

این راهنما فقط برای Worker ربات تلگرام `arzpulse-bot` است. پوشه `worker/` در ریشه پروژه Worker جداگانه آپدیت بازار است؛ فایل ربات را به آن Deploy نکن.

## ۱) استخراج و آماده‌سازی

1. فایل `ArzPulse-Telegram-Smart-Alerts-v2-Wrangler-BotFather.zip` را استخراج کن.
2. در PowerShell به پوشه `telegram-bot` داخل پوشه استخراج‌شده برو.
3. نسخه جدید `index.js` را برای Worker فعلی استفاده کن. اگر پوشه محلی فعلی ArzPulse از قبل فایل `wrangler.toml` واقعی دارد، همان را نگه دار؛ آن را با `wrangler.toml.example` جایگزین نکن، مگر اینکه بدانی همه تنظیماتش را دقیقاً منتقل کرده‌ای.

نمونه:

```powershell
cd "C:\مسیر\ArzPulse-Telegram-Smart-Alerts-v2\telegram-bot"
node --version
npx wrangler --version
```

## ۲) بررسی فایل پیکربندی

فایل `wrangler.toml` باید نام `arzpulse-bot`، binding با نام دقیق `SETTINGS_KV`، شناسه همان KV Namespace قدیمی و هر دو Cron را داشته باشد:

```toml
[triggers]
crons = ["*/5 * * * *", "0 * * * *"]
```

- `*/5 * * * *`: اجرای Workflow بازار و بررسی هشدارها هر ۵ دقیقه.
- `0 * * * *`: گزارش ساعتی کانال‌ها.

اگر فایل واقعی `wrangler.toml` نداری، از مثال کپی بگیر:

```powershell
Copy-Item .\wrangler.toml.example .\wrangler.toml
notepad .\wrangler.toml
```

در فایل، مقدار `REPLACE_WITH_EXISTING_SETTINGS_KV_NAMESPACE_ID` را با ID همان Namespace که Worker فعلی به آن وصل است جایگزین کن. KV تازه نساز؛ وگرنه تنظیمات کانال‌ها، ترجیحات هشدار و تاریخچه ضدتکرار قبلی در دسترس این Worker نخواهد بود.

## ۳) تست و Deploy

```powershell
npm run check
npm test
npx wrangler login
npx wrangler whoami
npx wrangler deploy --config .\wrangler.toml
```

Deploy باید از پوشه `telegram-bot` اجرا شود و نام Worker همچنان `arzpulse-bot` باشد. اگر `wrangler.toml` فعلی پروژه را نگه داشته‌ای، از همین فایل واقعی استفاده کن.

## ۴) Secretها را بررسی کن

Deploy معمولی Secretهای موجود Cloudflare را حذف نمی‌کند؛ بنابراین اگر این‌ها از قبل در Worker فعلی ثبت‌اند، دوباره واردشان نکن:

- `TELEGRAM_BOT_TOKEN`
- `GITHUB_TOKEN`
- `ADMIN_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`

برای فهرست نام Secretها (نه مقدار آن‌ها):

```powershell
npx wrangler secret list --config .\wrangler.toml
```

اگر موردی واقعاً وجود ندارد، فقط همان مورد را ثبت کن:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN --config .\wrangler.toml
npx wrangler secret put GITHUB_TOKEN --config .\wrangler.toml
npx wrangler secret put ADMIN_SECRET --config .\wrangler.toml
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET --config .\wrangler.toml
```

هر دستور مقدار را به شکل تعاملی می‌پرسد. توکن‌ها را داخل فایل TOML، کد، ریپو یا پیام عمومی قرار نده. اگر در داشبورد Variableهایی مثل `BOT_ADMIN_IDS` داری، حواست باشد Wrangler می‌تواند Variables داشبورد را با مقادیر فایل پیکربندی همگام کند؛ قبل از Deploy، فایل واقعی را با تنظیمات Worker فعلی تطبیق بده.

## ۵) آزمایش بعد از Deploy

```powershell
Invoke-RestMethod -Uri "https://arzpulse-bot.game-developer-mb.workers.dev/health"
Invoke-RestMethod -Uri "https://arzpulse-bot.game-developer-mb.workers.dev/"
```

- `/health` باید وضعیت امن پیکربندی را نشان دهد.
- `/` تلاش می‌کند اجرای `update-prices.yml` را به GitHub بفرستد؛ در پاسخ به `workflowDispatch.dispatched` و `workflowDispatch.error` توجه کن.
- در Cloudflare Worker Logs، خطاهای `[scheduled]`، `[github-dispatch]` و `[alerts]` را بررسی کن.
- در GitHub Actions ریپوی `mehrdadmb2/ArzPulse` بررسی کن که اجرای جدید ثبت شده باشد.

## ۶) راه‌اندازی اولیه هشدارها

در گفتگوی خصوصی ربات:

```text
/alerts
/alertson
/alertlevel low
```

حساسیت `low` همه هشدارهای منطبق با آستانه‌ها، `medium` هشدارهای مهم و بحرانی و `high` فقط هشدارهای بحرانی را نشان می‌دهد. برای گروه، تغییرات هشدار باید توسط مدیر گروه انجام شود. اولین اجرای Cron خط پایه را ثبت می‌کند و هشدار ساختگی نمی‌فرستد.

## نکته مهم

این بسته کد Worker را به‌روزرسانی می‌کند، اما خودش به حساب Cloudflare تو دسترسی ندارد. موفقیت نهایی پس از Deploy، پاسخ `/health`، پاسخ `/` و مشاهده اجرای واقعی در GitHub Actions تأیید می‌شود.
