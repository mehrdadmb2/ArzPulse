<div align="center">
  <img src="https://img.shields.io/badge/ArzPulse-v2.0-gold?style=for-the-badge&logo=bitcoin&logoColor=gold" alt="ArzPulse">
  <br>
  <img src="https://img.shields.io/github/stars/mehrdadmb2/ArzPulse?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/mehrdadmb2/ArzPulse?style=social" alt="Forks">
  <img src="https://img.shields.io/github/issues/mehrdadmb2/ArzPulse" alt="Issues">
  <img src="https://img.shields.io/github/license/mehrdadmb2/ArzPulse" alt="License">
  <img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat&logo=telegram&logoColor=white" alt="Telegram">
  <img src="https://img.shields.io/badge/GitHub%20Pages-Deployed-success" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare&logoColor=white" alt="Cloudflare">
</div>

---

# ✨ ArzPulse

> **ربات و سایت هوشمند مانیتورینگ قیمت‌های لحظه‌ای نوبیتکس** – دریافت لحظه‌ای قیمت رمزارزها و طلا با ذخیره‌سازی تاریخچه و نمایش حرفه‌ای

<p align="center">
  <a href="https://mehrdadmb2.github.io/ArzPulse/">🌐 مشاهده سایت</a> •
  <a href="https://t.me/ArzPulseBot">🤖 ربات تلگرام</a> •
  <a href="https://github.com/mehrdadmb2/ArzPulse">📦 مخزن گیت‌هاب</a>
</p>

---

## 📊 نمای کلی

**ArzPulse** یک پلتفرم کامل و رایگان برای مانیتورینگ قیمت‌های لحظه‌ای بازار ارزهای دیجیتال و طلا در ایران است که از **API نوبیتکس** تغذیه می‌کند. این پروژه شامل:

| بخش | توضیح |
|------|-------|
| 🌐 **سایت نمایش قیمت** | داشبورد حرفه‌ای با نمودارهای تعاملی و طراحی مدرن (گلس‌مورفیسم) |
| 🤖 **ربات تلگرام** | دریافت قیمت‌ها با دستورات ساده، خروجی‌های زیبا با قالب‌بندی HTML |
| 💾 **ذخیره‌سازی خودکار** | داده‌ها در مخزن گیت‌هاب ذخیره شده و هر ۲ دقیقه به‌روز می‌شوند |
| 📈 **نمودارهای تاریخی** | نمایش روند ۳۰ روزه قیمت‌ها با Chart.js |
| 🔄 **بروزرسانی خودکار** | با استفاده از GitHub Actions بدون نیاز به سرور |

---

## ✨ ویژگی‌ها

### 🌐 سایت
- ✅ نمایش قیمت لحظه‌ای **بیت‌کوین، اتریوم، تتر، نات‌کوین**
- 🏆 محاسبه و نمایش **قیمت طلا (هر گرم ۱۸ عیار)** از XAUT/USDT
- 💵 نمایش **قیمت دلار** بر اساس نرخ تتر (USDT)
- 📈 نمودار تعاملی **۳۰ روزه** با قابلیت انتخاب نماد
- 🎨 طراحی مدرن **گلس‌مورفیسم** با بک‌گراند متحرک
- 🔄 بروزرسانی خودکار هر **۲ دقیقه**
- 📱 **ریسپانسیو کامل** –适配 موبایل، تبلت و دسکتاپ

### 🤖 ربات تلگرام
- 📊 `/prices` – نمایش قیمت‌های لحظه‌ای همه دارایی‌ها با جزئیات کامل
- 🏆 `/gold` – نمایش قیمت هر گرم طلای ۱۸ عیار
- 💵 `/dollar` – نمایش قیمت دلار
- 🪙 `/btc` – نمایش قیمت بیت‌کوین با جزئیات
- 💎 `/eth` – نمایش قیمت اتریوم با جزئیات
- 💵 `/usdt` – نمایش قیمت تتر با جزئیات
- 📈 `/not` – نمایش قیمت نات‌کوین با جزئیات
- 📖 `/help` – راهنمای کامل دستورات
- 🎨 **قالب‌بندی HTML** – پشتیبانی از پررنگ، مورب، کد، زیرخط و لینک
- 🌐 نمایش قیمت‌ها به **ریال و دلار**

---

## 🛠️ تکنولوژی‌ها

| بخش | فناوری |
|-----|--------|
| **سایت** | HTML5 + CSS3 + JavaScript (Vanilla) + Chart.js |
| **هاست سایت** | GitHub Pages (پوشه `docs/`) |
| **داده‌ها** | فایل‌های JSON در مخزن (`docs/data/`) |
| **بروزرسانی خودکار** | GitHub Actions (Cron: هر ۲ دقیقه) |
| **ربات تلگرام** | Cloudflare Workers (JavaScript) |
| **منبع داده** | Nobitex REST API |
| **نمودار** | Chart.js 4.4.0 |
| **قالب‌بندی** | HTML + CSS (Glassmorphism, Particles) |

---

## 📁 ساختار پروژه

```
ArzPulse/
├── .github/
│   └── workflows/
│       ├── update-prices.yml     # بروزرسانی خودکار قیمت‌ها (هر ۲ دقیقه)
│       └── keep-alive.yml        # فعال نگه‌داشتن Cron Jobs (هفتگی)
├── docs/
│   ├── index.html                # سایت اصلی (داشبورد)
│   └── data/
│       ├── latest.json           # آخرین قیمت‌ها + طلا + دلار
│       ├── meta.json             # متادیتا (آخرین بروزرسانی، خطاها)
│       └── history/
│           └── YYYY-MM-DD.json   # تاریخچه روزانه (۳۰ روز)
├── scripts/
│   └── fetch-and-save.js         # اسکریپت دریافت قیمت از نوبیتکس
└── README.md                     # مستندات پروژه
```

---

## 🧮 محاسبه قیمت طلا

**ArzPulse** قیمت هر گرم طلای ۱۸ عیار را با استفاده از دو داده از نوبیتکس محاسبه می‌کند:

1. **XAUT/USDT** – قیمت هر اونس طلای دیجیتال (Tether Gold) به تتر
2. **USDT/IRR** – قیمت هر تتر به ریال

**فرمول:**
```
قیمت هر اونس (ریال) = XAUT/USDT × USDT/IRR
قیمت هر گرم (ریال) = (قیمت هر اونس / ۳۱.۱۰۳۴۷۶۸) × ۰.۷۵۰
```

> **توضیح:**  
> - `۳۱.۱۰۳۴۷۶۸` = هر اونس چند گرم است  
> - `۰.۷۵۰` = ضریب خلوص طلای ۱۸ عیار (۱۸/۲۴)

---

## 🚀 راه‌اندازی و اجرا

### ۱. کلون کردن مخزن

```bash
git clone https://github.com/mehrdadmb2/ArzPulse.git
cd ArzPulse
```

### ۲. اجرای محلی سایت

سایت به‌صورت **استاتیک** است و نیازی به سرور ندارد. فقط کافی است فایل `docs/index.html` را در مرورگر باز کنید:

```bash
# با استفاده از Live Server (VS Code Extension)
# یا استفاده از Python
python3 -m http.server 8000 --directory docs
# یا استفاده از Node.js
npx serve docs
```

سپس در مرورگر آدرس `http://localhost:8000` را باز کنید.

### ۳. اجرای اسکریپت دریافت قیمت (برای تست)

```bash
node scripts/fetch-and-save.js
```

این اسکریپت قیمت‌ها را از نوبیتکس دریافت کرده و در `docs/data/latest.json` ذخیره می‌کند.

---

## 🤖 راه‌اندازی ربات تلگرام

### ۱. ساخت ربات در BotFather

1. در تلگرام به **@BotFather** بروید.
2. دستور `/newbot` را بفرستید.
3. نام و نام کاربری ربات را انتخاب کنید.
4. **توکن** دریافتی را کپی کنید.

### ۲. دیپلوی روی Cloudflare Workers

1. وارد [Cloudflare Dashboard](https://dash.cloudflare.com/) شوید.
2. به **Workers & Pages** > **Create Worker** بروید.
3. کد ربات (موجود در این مخزن) را جایگذاری کنید.
4. متغیر محیطی `TELEGRAM_BOT_TOKEN` را با توکن خود تنظیم کنید.
5. روی **Save and Deploy** کلیک کنید.

### ۳. تنظیم Webhook

لینک زیر را در مرورگر باز کنید (جایگزین `<TOKEN>` و `<WORKER_URL>`):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<WORKER_URL>.workers.dev/webhook
```

مثال با اطلاعات شما:
```
https://api.telegram.org/bot7944296536:AAFLeWCSrdeCY8cxecuFySMgUqPFtcGLGCE/setWebhook?url=https://arzpulse-bot.game-developer-mb.workers.dev/webhook
```

---

## 📊 API نوبیتکس – اندپوینت‌های استفاده‌شده

| اندپوینت | توضیح |
|----------|-------|
| `GET /market/stats?srcCurrency=btc&dstCurrency=rls` | قیمت بیت‌کوین به ریال |
| `GET /market/stats?srcCurrency=eth&dstCurrency=rls` | قیمت اتریوم به ریال |
| `GET /market/stats?srcCurrency=usdt&dstCurrency=rls` | قیمت تتر به ریال |
| `GET /market/stats?srcCurrency=not&dstCurrency=rls` | قیمت نات‌کوین به ریال |
| `GET /market/stats?srcCurrency=xaut&dstCurrency=usdt` | قیمت XAUT به تتر (برای محاسبه طلا) |

**محدودیت:** ۲۰ درخواست در دقیقه

> **مستندات کامل:** [apidocs.nobitex.ir](https://apidocs.nobitex.ir/)

---

## 🔄 بروزرسانی خودکار (GitHub Actions)

پروژه از دو اکشن استفاده می‌کند:

### ۱. `update-prices.yml` – بروزرسانی قیمت‌ها
- **زمان:** هر ۲ دقیقه (`*/2 * * * *`)
- **کاری که می‌کند:**
  1. اجرای `scripts/fetch-and-save.js`
  2. ذخیره داده‌ها در `docs/data/`
  3. Commit و Push خودکار

### ۲. `keep-alive.yml` – جلوگیری از غیرفعال شدن Cron
- **زمان:** هر هفته یکشنبه ساعت ۰۰:۰۰ UTC
- **کاری که می‌کند:** یک Commit خالی انجام می‌دهد تا مخزن همیشه فعال بماند و Cron Jobs غیرفعال نشوند.

---

## 🐛 مدیریت خطاها

| سناریو | رفتار |
|--------|-------|
| **نوبیتکس در دسترس نیست** | اسکریپت از آخرین داده‌های کش (`lastData`) استفاده می‌کند. |
| **محدودیت نرخ API** | اسکریپت با `Promise.allSettled` و Retry Logic از خطا جلوگیری می‌کند. |
| **داده‌های نامعتبر** | مقادیر `null` به `۰` تبدیل می‌شوند. |
| **خطا در Worker** | لاگ ثبت شده و پیام خطا به کاربر ارسال می‌شود. |

---

## 🤝 مشارکت

از مشارکت شما استقبال می‌شود! برای همکاری:

1. **Fork** مخزن را انجام دهید.
2. یک **Branch** جدید ایجاد کنید (`git checkout -b feature/amazing-feature`).
3. تغییرات خود را **Commit** کنید (`git commit -m 'Add some amazing feature'`).
4. **Push** به Branch خود (`git push origin feature/amazing-feature`).
5. یک **Pull Request** باز کنید.

---

## 📄 مجوز (License)

این پروژه تحت مجوز **MIT License** منتشر شده است – برای جزئیات بیشتر فایل [LICENSE](LICENSE) را ببینید.

---

## 📞 ارتباط با توسعه‌دهنده

- **گیت‌هاب:** [@mehrdadmb2](https://github.com/mehrdadmb2)
- **ربات تلگرام:** [@ArzPulseBot](https://t.me/ArzPulseBot)
- **ایمیل:** (در صورت نیاز)

---

## 🙏 تشکر و قدردانی

- **نوبیتکس** – برای ارائه API رایگان
- **Cloudflare** – برای سرویس Workers رایگان
- **GitHub** – برای Actions و Pages رایگان
- **تمامی کاربران و مشارکت‌کنندگان** – برای حمایت و بازخورد

---

<div align="center">
  <sub>ساخته شده با ❤️ توسط <a href="https://github.com/mehrdadmb2">Mehrdad</a></sub>
  <br>
  <sub>© ۲۰۲۶ ArzPulse – تمامی حقوق محفوظ است.</sub>
</div>
```

پروژه شما اکنون یک `README.md` کامل و حرفه‌ای دارد که همه جزئیات را پوشش می‌دهد. 🎉
