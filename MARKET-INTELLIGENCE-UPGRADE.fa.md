# ArzPulse — ارتقای هوشمندی بازار

این نسخه روی Collector، داشبورد GitHub Pages و Worker ربات تلگرام کار می‌کند و قابلیت‌های قبلی را حذف نمی‌کند.

## داده‌ها و شاخص‌های اضافه‌شده

- حدود ۲۸ رمزارز بزرگ با قیمت جهانی USD، درصد تغییر ۲۴ساعته، سقف/کف روز، میانگین وزنی، حجم پایه و حجم USDT، تعداد معاملات و bid/ask از Binance Spot.
- شاخص Fear & Greed از Alternative.me به همراه مقدار روز قبل و هفته قبل (در صورت وجود)، با ارجاع منبع در کنار نمایش.
- ارزش کل بازار رمزارز، حجم جهانی ۲۴ساعته، دامیننس BTC/ETH، درصد تغییر ارزش کل بازار، تعداد رمزارزهای فعال و تعداد بازارها از CoinGecko Global API؛ با fallback اختیاری Alternative.me Global.
- نرخ Funding قراردادهای دائمی BTC و ETH و Open Interest تخمینی BTC از Binance USD-M Futures.
- شاخص‌های ماکرو موجود همچنان حفظ شده‌اند: Brent، WTI، انس طلا، نقره، S&P 500، Nasdaq و DXY.
- نمودارهای تاریخچه رمزارزهای جهانی که بازار داخلی متناظر ندارند با قیمت IRR تخمینی (قیمت جهانی × نرخ USDT/IRR همان snapshot) در تاریخچه ذخیره می‌شود.

## دستورات جدید ربات

- `/crypto` یا `/coins`: فهرست رمزارزها با قیمت دلاری، معادل تخمینی ریال، تغییر روزانه و حجم جهانی.
- `/macro` یا `/market`: شاخص‌های بازار جهانی، دامیننس، حجم، Funding، Open Interest و شاخص‌های کلان.
- `/sentiment`: Fear & Greed و عرض بازار جهانی.
- دستورهای رمزارزی مانند `/sol`، `/bnb`، `/xrp`، `/doge` و سایر نمادهای موجود نیز جزئیات قیمت جهانی را نشان می‌دهند.
- `/btc` و `/eth` همچنان ابتدا بازار داخلی را نشان می‌دهند و اطلاعات مقایسه‌ای جهانی را هم اضافه می‌کنند.
- `/chart SYMBOL 7d` برای رمزارزهای جدید هم از تاریخچهٔ موجود پشتیبانی می‌کند.

## نکات مهم

1. قیمت‌های جهانی و بازار محلی منابع متفاوتی دارند؛ مقایسه باید با همین فرض خوانده شود. معادل IRR رمزارزهای جهانی برآوردی است، نه مظنه خریدوفروش در Nobitex یا صرافی داخلی دیگر.
2. Fear & Greed طبق توضیح منبع روزانه به‌روزرسانی می‌شود و لزوماً با هر اجرای ۵ دقیقه‌ای تغییر نمی‌کند. منبع: https://alternative.me/crypto/fear-and-greed-index/
3. Funding و Open Interest داده‌های بازار مشتقه‌اند؛ جهت بازار را به‌تنهایی پیش‌بینی نمی‌کنند. منبع داده مشتقه: Binance USD-M Futures.
4. شاخص‌های جهانی Yahoo Finance ممکن است با تأخیر باشند.
5. APIهای بیرونی بدون کلید مصرف می‌شوند و محدودیت درخواست/دسترس‌پذیری دارند. در صورت خطای منبع، آخرین مقدار موفق (از جمله ۲۸ نماد جهانی) حفظ و با `stale` نشانه‌گذاری می‌شود؛ مقدار ساختگی ساخته نمی‌شود.
6. در اولین اجرای Collector بعد از نصب، به‌تدریج تاریخچهٔ نمادهای اضافه‌شده پر می‌شود؛ نمودار بازه بلند به داده‌های واقعی گذشته وابسته است.

## نصب و انتشار

### وب‌سایت و جمع‌آوری داده

1. یک نسخه پشتیبان از ریپوی فعلی بگیر.
2. فایل‌های سورس همین بسته را داخل مخزن موجود `mehrdadmb2/ArzPulse` ادغام/جایگزین کن. این بسته عمداً `docs/data/` را ندارد؛ پوشه فعلی `docs/data/`، مخصوصاً `latest.json`، `meta.json` و `history/` را نگه دار.
3. پس از ادغام فایل‌ها در پوشه اصلی مخزن، می‌توانی با PowerShell این دستورات را اجرا کنی:

```powershell
git status
git pull --rebase origin main
git add .github/workflows scripts/fetch-and-save.js docs/index.html docs/assets/app.js docs/assets/app.css telegram-bot/index.js telegram-bot/README.md telegram-bot/tests/smoke.test.mjs README.md MARKET-INTELLIGENCE-UPGRADE.fa.md DATA-PRESERVATION.txt TEST-REPORT.md
git commit -m "feat: expand ArzPulse market intelligence"
git push origin main
```

اگر خطای conflict دیدی، پیش از اجرای `git push` فایل‌های متعارض را بررسی و حل کن؛ از `git push --force` استفاده نکن.

4. در GitHub → Actions، Workflow با نام `Update Market Data` را یک بار دستی اجرا کن. بعد از اجرای موفق، `docs/data/latest.json` باید `version: 6`، کلید `globalCrypto` و `marketContext` شامل `fearGreed`، `global` و `derivatives` داشته باشد. اگر یک منبع در دسترس نباشد، داده همان منبع ممکن است با نشان stale از Snapshot قبلی حفظ شود.

### Worker ربات تلگرام

- برای روش داشبورد Cloudflare، Worker فعلی `arzpulse-bot` را باز کن و فقط محتوای `telegram-bot/index.js` را جایگزین کن، سپس Deploy بزن.
- Secretها، متغیرها، KV namespace و ID فعلی آن را تغییر نده. فایل `wrangler.toml.example` فقط نمونه است؛ مقدار `REPLACE_WITH_EXISTING_SETTINGS_KV_NAMESPACE_ID` را هیچ‌وقت بدون جایگزینی با ID موجود Deploy نکن.
- Cronهای موجود را حفظ کن: `*/5 * * * *` برای GitHub Actions و `0 * * * *` برای گزارش ساعتی کانال. اگر آن‌ها از قبل درست فعال‌اند، لازم نیست دوباره ساخته شوند.
- دستورهای جدید به Secret اضافی نیاز ندارند؛ از `/help`، `/crypto`، `/macro` و `/sentiment` در تلگرام تست بگیر.

## اعتبارسنجی

اجرای `node --check` برای Collector و frontend و `npm run check`, `npm test` در پوشه ربات را انجام بده. تست‌های محلی، درستی فرمت کد را می‌سنجند؛ تأیید نهایی دریافت داده‌های زنده باید در لاگ GitHub Actions و Cloudflare انجام شود.
