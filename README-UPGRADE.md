# ArzPulse — Professional GitHub Pages Upgrade

این بسته، لایه نمایش ArzPulse را از یک داشبورد ساده به یک داشبورد تعاملی بازار ارتقا می‌دهد.

## تغییرات اصلی

- بازطراحی کامل رابط با ساختار حرفه‌ای Glass / Fintech و RTL واقعی
- ریسپانسیو برای دسکتاپ، تبلت و موبایل
- حالت روشن/تیره با ذخیره‌سازی در مرورگر
- تغییر واحد ریال/دلار
- تراکم Comfortable / Compact
- کارت‌های تعاملی با Tilt ملایم برای ماوس
- فیلتر بازار: کریپتو / کالا / شاخص
- نوار قیمت متحرک (Ticker)
- واچ‌لیست محلی با LocalStorage
- نمودار تاریخچه ۱، ۷ و ۳۰ روز
- نمایش نفت برنت و WTI، انس طلا، نقره، S&P 500، Nasdaq و DXY
- محاسبه Market Pulse بر اساس تغییرات اخیر دارایی‌های منتخب
- مقایسه بازدهی نسبی دارایی‌ها
- تشخیص سلامت و تازگی منبع داده
- حذف Mock Data از فرانت‌اند؛ وقتی تاریخچه وجود نداشته باشد، پیام شفاف نمایش داده می‌شود
- GitHub Action جدید، داده‌های Nobitex و Yahoo Finance را در `docs/data/latest.json` و تاریخچه روزانه ذخیره می‌کند

## فایل‌های این بسته

- `docs/index.html`
- `docs/assets/app.css`
- `docs/assets/app.js`
- `scripts/fetch-and-save.js`
- `.github/workflows/update-prices.yml`
- `.nojekyll`

## GitHub Pages

مخزن را روی Branch اصلی نگه دارید و GitHub Pages را روی `main` + `docs/` تنظیم کنید. GitHub Pages فایل `index.html` را از ریشهٔ منبع انتشار شناسایی می‌کند. همچنین می‌توانید از GitHub Actions برای انتشار استفاده کنید.

منبع رسمی: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
