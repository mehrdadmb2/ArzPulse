# ArzPulse v8 · گزارش ارتقا و تست

## اصلاحات این نسخه

- حذف وابستگی پایه به `ALPACA_API_KEY`، `ALPACA_API_SECRET` و `TWELVE_DATA_API_KEY` از workflow و Collector؛ هیچکدام برای اجرای عادی لازم نیستند.
- سهام و فارکس با Yahoo Finance Chart دریافت می‌شوند؛ منبع غیررسمی و بالقوه تأخیردار است، timestamp و delayed در Snapshot نگه داشته می‌شود و در خطای منبع رکورد قبلی حفظ می‌شود.
- `/prices` از گزارش قدیمی/منتخب به گزارش کامل تبدیل شده: بازار داخلی، ۲۸ رمزارز جهانی، ۱۳ نماد سهام، ۱۲ جفت فارکس، ۱۹ شاخص/کالا و محرک‌های ماکرو.
- نمایش عدد per-chat قابل تنظیم است: `/numbers fa` یا `/numbers en`.
- نمایش قیمت per-chat قابل تنظیم است: `/currency usd`، `/currency irr`، `/currency irt` یا `/currency dual`.
- تنظیمات در کلید جدید `chat:settings:v1` از همان `SETTINGS_KV` ذخیره می‌شوند؛ کلید قدیمی `channels` و کلیدهای هشدار قبلی دست نخورده‌اند.
- گزارش بازار دوره‌ای برای هر چت قابل زمان‌بندی است: `/digest 5m` تا `/digest 1d`، `/digest status` و `/digest off`.
- بخش‌های گزارش قابل انتخاب‌اند: `/digestmarket all` یا ترکیبی مثل `/digestmarket stocks forex`.
- Worker هر پنج دقیقه due digestها را بررسی می‌کند؛ تنظیم گزارش شخصی از هشدار شرطی `/alertson` و گزارش ساعتی کانال مستقل است.
- وب‌سایت گزینه‌های IRR، IRT، USD و Dual و انتخاب ارقام Auto، فارسی و انگلیسی دارد. قیمت سهام و کالاهای دلاری می‌تواند با USDT/IRR Snapshot تخمینی به IRR/IRT تبدیل شود. جفت‌ارزها و شاخص‌های نقطه‌ای با نرخ پولی اشتباه گرفته نمی‌شوند.
- دستورهای مجزای `/indices` و `/commodities` به ربات و BotFather اضافه شدند؛ واحد شاخص‌ها (points) و بازده US10Y (درصد) از قیمت کالاها تفکیک شد.
- فهرست BotFather شامل ۹۰ دستور/میانبر است و زیر سقف ۱۰۰ دستور باقی می‌ماند.

## تست‌ها

- `node --check scripts/fetch-and-save.js` — موفق.
- `node --check docs/assets/app.js` — موفق.
- `node --check telegram-bot/index.js` — موفق.
- `node --check telegram-bot/tests/smoke.test.mjs` — موفق.
- `node --test telegram-bot/tests/smoke.test.mjs` — ۲۱ از ۲۱ تست موفق.
- ZIP کامل و ZIP فایل‌های جایگزین پس از ساخته‌شدن با `unzip -t` بررسی می‌شوند.

## محدودیت‌های واقعی داده

Yahoo Finance Chart یک endpoint غیررسمی است و هیچ SLA یا تضمین دسترسی ندارد؛ دادهٔ سهام/فارکس آن ممکن است تأخیردار، محدود یا موقتاً غیرقابل دریافت باشد. این نسخه قیمت real-time exchange-grade را ادعا نمی‌کند. تبدیل USD به IRR/IRT بر اساس نرخ USDT/IRR همان Snapshot تقریبی است، نه نرخ رسمی اسکناس. دادهٔ موجود در تاریخچه نیز فقط از زمان جمع‌آوری Snapshotهای جدید برای نمادهای اضافه‌شده شکل می‌گیرد.

## تنظیمات لازم برای استقرار

کلیدهای Alpaca و Twelve Data لازم نیستند. برای ربات همان Secretهای فعلی Telegram/GitHub/ADMIN و همان Binding موجود `SETTINGS_KV` لازم است. Cronهای Worker باید شامل `*/5 * * * *` و `0 * * * *` باشند. شناسهٔ واقعی KV در فایل عمومی/ZIP قابل حدس‌زدن نیست؛ هنگام deploy با Wrangler از همان Namespace ID موجود استفاده شود تا کانال‌ها و هشدارهای ذخیره‌شده باقی بمانند.

تست‌ها با mock اجرا شدند؛ دریافت واقعی Yahoo، اجرای GitHub Actions در حساب کاربر و deploy واقعی Cloudflare از محیط حاضر انجام نشده است.
