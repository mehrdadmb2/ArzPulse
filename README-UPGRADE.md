# ArzPulse Pro v9

این نسخه یک بازطراحی اطلاعات‌محور برای GitHub Pages است که بدون وابستگی اجباری به Chart.js، Font Awesome یا CDN لوگوها رندر می‌شود.

## اصلاح باگ صفحه خالی
صفحه از HTML اولیه دارای skeleton و header قابل مشاهده است و JavaScript قبل از رندر بازار منتظر تاریخچه کامل نمی‌ماند. ابتدا `latest.json` رندر می‌شود، سپس دو روز اخیر و در ادامه تاریخچه ۳۰ روزه در پس‌زمینه اضافه می‌شود.

نمودار اصلی و Sparklineها با SVG خام رسم می‌شوند، بنابراین اگر CDN خارجی در مرورگر مسدود باشد، رندر اصلی سایت از کار نمی‌افتد.

## داده‌ها
`latest.json` باید شامل `prices` برای BTC/ETH/USDT/NOT/XAUT و ترجیحاً `market` برای BRENT/WTI/XAUUSD/SILVER/SP500/NASDAQ/DXY باشد. History نیز از کلیدهای همان نمادها استفاده می‌کند.

## ساختار
- `docs/index.html` — داشبورد
- `docs/assets/app.css` — ظاهر و تعاملات
- `docs/assets/app.js` — منطق، نرمال‌سازی داده، نمودار SVG، ticker و تعاملات
- `docs/data/` — داده‌های موجود ریپو
- `scripts/fetch-and-save.js` — جمع‌آوری Nobitex + Yahoo
- `.github/workflows/update-prices.yml` — اجرای collector
- `worker/index.js` — dispatch هر ۵ دقیقه
- `worker/wrangler.toml` — Cron Trigger

## Cloudflare Worker
Secret لازم:
- `GITHUB_TOKEN`

Vars:
- `GITHUB_OWNER=mehrdadmb2`
- `GITHUB_REPO=ArzPulse`
- `GITHUB_REF=main`
- `WORKFLOW_FILE=update-prices.yml`

Cron:
`*/5 * * * *`


### UI v9 — Galactic Market Core

نسخه v9 هستهٔ بصری کهکشانی ArzPulse را در بالای داشبورد نگه می‌دارد: مدارهای چندلایه، ستاره‌ها، هستهٔ PULSE، گره‌های قابل کلیک برای دلار/نفت/طلا/BTC/ETH و KPIهای زنده. این بخش به دادهٔ بازار متصل است و با حرکت Pointer پارالاکس سه‌بعدی دارد. در موبایل نیز به یک چیدمان عمودی واکنش‌گرا تبدیل می‌شود.

هیچ تصویر خارجی برای این هسته لازم نیست؛ SVG/CSS داخلی است تا مشکل Broken Image یا وابستگی CDN نداشته باشد.
