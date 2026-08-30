# ArzPulse Pro Upgrade

این نسخه برای GitHub Pages طراحی شده و روی دادهٔ محلی `docs/data/latest.json` اجرا می‌شود. لایهٔ نمایش بدون API مستقیم بازار کار می‌کند؛ بنابراین مرورگر کاربر فقط JSON خود ریپو را می‌خواند.

## اصلاحات اصلی

- نرمال‌سازی واحد داده‌های Nobitex و Yahoo Finance برای جلوگیری از حذف شدن کارت‌های BTC/ETH/USDT/NOT.
- نمایش کامل قیمت، تغییر روزانه، سقف، کف، حجم، بهترین خرید، بهترین فروش و اسپرد هر دارایی در صورت وجود.
- محاسبهٔ مشتقات طلای ۱۸ عیار از XAUT با استفاده از نرخ USDT، همراه با high/low قابل محاسبه.
- کارت‌های پیش‌فرض شامل BTC، ETH، USDT، NOT، GOLD، DOLLAR، BRENT، WTI، XAU/USD، SILVER، S&P 500، Nasdaq و DXY.
- لوگو/نشان بصری و رنگ اختصاصی هر دارایی؛ رنگ نمودار اصلی و Sparkline با رنگ دارایی هماهنگ است.
- پنل جزئیات با کلیک روی هر کارت، واچ‌لیست، مقایسهٔ عملکرد، ticker و وضعیت سلامت داده.
- UI دسکتاپ/موبایل، dark/light، حالت فشرده، تعامل mouse tilt و افکت‌های ambient.
- بدون mock data؛ اگر دادهٔ واقعی وجود نداشته باشد UI آن را `—` نشان می‌دهد.

## Cloudflare Worker → GitHub Actions هر ۵ دقیقه

فایل `worker/index.js` هر ۵ دقیقه workflow با نام `update-prices.yml` را با GitHub REST API dispatch می‌کند.

### Secret موردنیاز Worker

در Cloudflare Workers یک Secret با نام `GITHUB_TOKEN` تعریف کن. برای یک fine-grained PAT، مجوز Actions روی مخزن را در حالت Read and write قرار بده. سپس متغیرهای داخل `worker/wrangler.toml` را با owner/repository واقعی نگه دار.

Deploy:

```bash
cd worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy
```

برای تست دستی:

```bash
curl -X POST https://YOUR-WORKER.workers.dev/dispatch
```

برای health check:

```bash
curl https://YOUR-WORKER.workers.dev/health
```

## GitHub Pages

در Settings → Pages، Source را روی `Deploy from a branch` و Branch را روی `main` و Folder را روی `/docs` قرار بده.

## نکتهٔ داده‌های جهانی

نمادهای Brent، WTI، طلا، نقره و شاخص‌ها از Yahoo Finance در GitHub Action خوانده می‌شوند. دادهٔ جهانی ممکن است نسبت به بازار لحظه‌ای با تأخیر باشد و timestamp خودش را دارد.


## UI Revision v7
- هدر برند و نشان ArzPulse حفظ شده و بخش معرفی بزرگ حذف شده است.
- داشبورد به‌جای Hero تبلیغاتی، نمای فشرده و اطلاعات‌محور بازار دارد.
- کارت‌ها، Tileها، پنل جزئیات و نمودارها با Mouse/Pointer واکنش نشان می‌دهند.
- تمام CSS و JS در نسخهٔ فعلی جدا و قابل توسعه هستند.
- مسیر داده برای دارایی‌های مختلف با alias و چندین نام فیلد (`last`, `lastPrice`, `latest`, `price`, `high`, `dayHigh`, `low`, `dayLow`, `volume`, `quoteVolume`, `bid`, `ask` و...) مقاوم شده است.
