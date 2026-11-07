# ArzPulse v7 · راهنمای فعال‌سازی سهام و فارکس

## بازارهای اضافه‌شده

- سهام آمریکا: `AAPL`, `MSFT`, `NVDA`, `TSLA`, `AMZN`, `GOOGL`, `META`, `AVGO`, `AMD`, `ORCL`, `PLTR`, `COIN`, `SPCX`.
- فارکس: `EURUSD`, `GBPUSD`, `USDJPY`, `USDCHF`, `USDCAD`, `AUDUSD`, `NZDUSD`, `USDTRY`, `EURGBP`, `EURJPY`, `GBPJPY`, `USDCNH`.
- ماکرو: Dow Jones، Russell 2000، VIX، Nikkei، FTSE 100، DAX، Hang Seng، Natural Gas، Copper، Platinum، Palladium و US 10Y Yield.

## تنظیم Secretهای GitHub (پیشنهادی)

در `Settings → Secrets and variables → Actions → New repository secret` این Secretها را اضافه کن:

| Secret | کاربرد |
|---|---|
| `ALPACA_API_KEY` | شناسهٔ API آلپاکا |
| `ALPACA_API_SECRET` | کلید مخفی API آلپاکا |
| `TWELVE_DATA_API_KEY` | کلید API برای نرخ‌های فارکس |

هیچ‌کدام را داخل `config.js`، فایل JavaScript سایت، Worker یا Commit قرار نده.

### Alpaca

با هر دو Secret آلپاکا، Collector از snapshot چندنمادی سهام با feed پیش‌فرض `IEX` استفاده می‌کند. متغیر Repository Variable به نام `ALPACA_DATA_FEED` را می‌توان (در صورت مجاز بودن اشتراک) روی `sip` تنظیم کرد. این feed تمام معاملات همهٔ بازارهای آمریکا را تجمیع نمی‌کند؛ بنابراین نام منبع صریحاً `Alpaca IEX` ثبت می‌شود. اگر دسترسی/اشتراک دادهٔ SIP داری، بعداً می‌توان feed را به SIP تغییر داد. در نبود کلید یا خطای Alpaca، Collector به Yahoo Finance fallback می‌کند و داده را `delayed: true` علامت می‌زند.

### Twelve Data و نرخ مصرف API

در صورت تنظیم `TWELVE_DATA_API_KEY`، ۱۲ جفت‌ارز هر ۳۰ دقیقه به‌روزرسانی می‌شوند (حداکثر نظری ۵۷۶ درخواست در ۲۴ ساعت، بدون احتساب اجرای دستی/درخواست‌های جایگزین). این برنامه برای سهمیهٔ رایگان با ۸۰۰ اعتبار روزانه حاشیه‌ای برای retry و استفادهٔ جانبی باقی می‌گذارد. در صورت نبود کلید/خطا، Yahoo Finance fallback به‌صورت دادهٔ مرجع و تأخیردار ثبت می‌شود. شرایط مجوز نمایش عمومی/بازنشر هر ارائه‌دهنده را جداگانه بررسی کن.

## دستورات تلگرام

- `/stocks` تابلوی سهام
- `/stock NVDA` یا `/aapl` جزئیات سهم
- `/forex` تابلوی فارکس
- `/fx EURUSD` جفت‌ارز مشخص
- `/chart AAPL 7d`، `/chart SPCX 30d` و `/chart EURUSD 24h` نمودار تاریخی سهام/فارکس (پس از ثبت Snapshot کافی)
- `/macro` شاخص‌ها و کالاهای جهانی
- `/prices` گزارش یکپارچهٔ داخلی + منتخب سهام + فارکس
- `/alertscope all` فعال‌بودن همهٔ گروه‌ها برای هشدار
- `/alertscope stocks`، `/alertscope forex`، `/alertscope crypto`، `/alertscope macro`، `/alertscope local` انتخاب دامنهٔ هشدار

هشدارهای سهام و فارکس آستانه‌های جداگانه دارند:

- `ALERT_STOCK_MOVE_PCT=0.8`
- `ALERT_FOREX_MOVE_PCT=0.18`

این مقادیر پیش‌فرض پایش هستند، نه سیگنال معاملاتی. رویدادها، نرخ‌های stale و قیمت‌های تأخیردار به‌عنوان دادهٔ لحظه‌ای معرفی نمی‌شوند. پنجره‌های زمانی هشدار تابع تعداد Snapshotهای واقعی و فاصلهٔ به‌روزرسانی ارائه‌دهنده‌اند؛ FX با cache سی‌دقیقه‌ای برای پنجرهٔ ۱۵ دقیقه‌ای تضمین پوشش ندارد.

## SpaceX

نماد `SPCX` به‌عنوان سهم عمومی در فهرست سهام قرار گرفته است. این نماد به‌دلیل عرضهٔ عمومی SpaceX در ژوئن ۲۰۲۶ اضافه شده است. بررسی وضعیت نماد و موجودبودن داده در فید انتخابی همچنان به پاسخ provider وابسته است.

## سازگاری داده

- نسخهٔ Snapshot از ۶ به ۷ ارتقا یافته؛ فیلدهای قبلی `prices`, `market`, `globalCrypto`, `marketContext` حذف نشده‌اند.
- دو فیلد جدید `equities` و `forex` اضافه شده‌اند.
- کلیدهای سهام و FX به تاریخچهٔ روزانه اضافه می‌شوند تا نمودارهای داشبورد بتوانند پس از جمع‌آوری Snapshotهای جدید داده داشته باشند. تاریخچهٔ قبل از انتشار، طبیعتاً برای نمادهای جدید وجود ندارد.
- سیستم stale fallback و آرشیو تاریخچه حفظ شده است.

## انتشار

ZIP کامل را جایگزین ریپازیتوری کن، سه Secret بالا را در GitHub Actions ثبت کن، سپس یک بار `Actions → Update Market Data → Run workflow` را اجرا کن. برای Worker تلگرام، `telegram-bot/index.js` را Deploy کن. متغیرهای هشدار در `telegram-bot/wrangler.toml` تعریف شده‌اند؛ Secretهای Telegram و GitHub موجود را تغییر نده.

> نکتهٔ پیکربندی Cloudflare: در نسخهٔ ریپازیتوری شناسهٔ KV در `telegram-bot/wrangler.toml` به‌صورت ماسک‌شده نمایش داده شده است. هنگام Deploy با Wrangler، مقدار `id` را با شناسهٔ واقعی Namespace فعلی `SETTINGS_KV` از داشبورد Cloudflare جایگزین کن؛ Namespace جدید نساز تا تنظیمات کانال‌ها و هشدارهای موجود باقی بمانند. فایل `wrangler.toml.example` فقط قالب نمونه است.
