# ✨ ArzPulse

<div align="center">

[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)](https://github.com/mehrdadmb2/ArzPulse/actions)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://arzpulse-bot.game-developer-mb.workers.dev)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)](https://mehrdadmb2.github.io/ArzPulse)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/mehrdadmb2/ArzPulse/pulls)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/ArzPulseBot)
[![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)](https://arzpulse-bot.game-developer-mb.workers.dev)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red?style=flat-square)](https://github.com/mehrdadmb2)

</div>

---

> **Professional real-time cryptocurrency, gold, and dollar price monitoring system for the Iranian market** – fetching live prices from Nobitex, storing historical data, providing a modern dashboard, and a powerful Telegram bot with advanced charting capabilities.

**🇬🇧 English** | **🇮🇷 فارسی**

---

## 📊 Overview | نمای کلی

**ArzPulse** is a complete, zero-cost price intelligence platform that:

- 📊 Fetches real-time prices for **BTC**, **ETH**, **USDT**, **NOT**, and **Gold (18K)** from **Nobitex**
- 🏆 Calculates Gold price per gram using **XAUT/USDT** and **USDT/IRR** exchange rates
- 💵 Displays **Dollar (USD)** price based on USDT/IRR rate
- 💾 Stores historical data **inside the GitHub repository** (no external database needed)
- 🤖 Provides a **Telegram bot** with multiple commands, professional charts, and auto-send to channels
- 🌐 Serves a **modern, glassmorphism UI dashboard** with animated background and interactive charts
- ⏱️ Auto-updates every **10 minutes** via GitHub Actions
- 📈 **24-hour, weekly, and monthly charts** for all assets
- 🔄 **Automatic channel updates** – send price reports to Telegram channels every hour

---

## ✨ Features | ویژگی‌ها

### 🌐 Website (Dashboard)
- Real-time price cards with buy/sell/last prices, 24h change, volume, high/low
- **Gold price** (18K per gram) with USDT reference
- **Dollar price** (USD/IRR) based on USDT rate
- **Interactive charts** (24h, 7d, 30d) with Chart.js
- **Currency toggle** – switch between IRR (Rial) and USD
- **Glassmorphism UI** with animated particle background
- **Fully responsive** – works on mobile, tablet, and desktop
- **Fallback mechanism** – if Nobitex API fails, uses cached data

### 🤖 Telegram Bot
**Core Commands:**
- `/prices` – Show all current prices with full details
- `/gold` – Show gold price per gram (18K)
- `/dollar` – Show dollar price (USDT/IRR)
- `/btc`, `/eth`, `/usdt`, `/not` – Individual asset prices
- `/start` – Welcome message with command list
- `/help` – Full help guide
- `/status` – Show last update status

**Advanced Charting:**
- `/chart [SYMBOL] [PERIOD]` – Get professional chart
  - Example: `/chart BTC 24h`, `/chart ETH 7d`, `/chart NOT 30d`
  - Supports: `BTC`, `ETH`, `USDT`, `NOT`, `GOLD`, `DOLLAR`
  - Periods: `24h`, `7d`, `30d`
- `/chartall` – Get 4 separate charts (BTC, ETH, USDT, NOT) for 24h

**Channel & Group Support:**
- `/setchannel` – Set current channel/group for auto-updates
- `/stopchannel` – Stop auto-updates to current channel/group
- **Auto-send** – Every hour, prices are automatically sent to configured channels

**Smart Features:**
- **Countdown timer** – When data is stale, the bot triggers GitHub Action and shows a live countdown (45 seconds)
- **HTML formatting** – Bold, italic, code blocks, strikethrough, underline, and links
- **Multi-currency display** – Prices shown in both IRR and USD

### 📦 Data Storage
- All price data stored as JSON files inside the repository (`docs/data/`)
- **Daily history** files (keeps last 30 days)
- **Auto-updated** via GitHub Actions every 10 minutes
- No external database required – fully self-contained

### ⚙️ Automation
- **GitHub Actions** fetch prices and commit changes automatically
- **Cron schedule** runs every 10 minutes (respects Nobitex rate limits)
- **Keep-alive workflow** prevents cron deactivation after 60 days of inactivity
- **Cloudflare Workers** with Cron Triggers for periodic checks and auto-sending

---

## 🛠️ Tech Stack | تکنولوژی‌ها

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML5 + CSS3 + JavaScript (Vanilla) + Chart.js + Font Awesome |
| **Hosting** | GitHub Pages (docs/ folder) |
| **Data Storage** | GitHub repository (JSON files) |
| **CI/CD** | GitHub Actions (cron + workflow_dispatch) |
| **Telegram Bot** | Cloudflare Workers (JavaScript) |
| **State Storage** | Cloudflare KV (for channel settings) |
| **Price Source** | Nobitex REST API |
| **Chart Generation** | QuickChart.io API |
| **Typography** | Vazirmatn (Persian) + System UI (English) |

---

## 📁 Project Structure | ساختار پروژه

```
ArzPulse/
├── .github/
│   └── workflows/
│       ├── update-prices.yml      # Auto-update prices (every 10 min)
│       └── keep-alive.yml         # Prevent cron deactivation (weekly)
├── docs/                          # 📦 GitHub Pages root
│   ├── index.html                 # Main dashboard
│   └── data/
│       ├── latest.json            # Current prices + gold + dollar
│       ├── meta.json              # Metadata (last update, errors)
│       └── history/
│           └── YYYY-MM-DD.json    # Daily historical records (30 days)
├── scripts/
│   └── fetch-and-save.js          # Price fetcher script
└── README.md                      # Documentation
```

---

## 🧮 Gold Price Calculation | محاسبه قیمت طلا

**ArzPulse** calculates the price of 1 gram of 18-karat gold using two prices from Nobitex:

1. **XAUT/USDT** – Price of 1 ounce of Tether Gold in USDT
2. **USDT/IRR** – Price of 1 USDT in Iranian Rials

**Formula:**
```
Price per ounce (IRR) = XAUT/USDT × USDT/IRR
Price per gram (IRR)  = (Price per ounce / 31.1034768) × 0.750
```

Where:
- `31.1034768` = grams per troy ounce
- `0.750` = purity factor for 18K gold (18/24)

---

## 🚀 Getting Started | راه‌اندازی

### Prerequisites | پیش‌نیازها
- Node.js 18+ and npm
- Git
- Cloudflare account (for Worker deployment)
- Telegram account (for bot creation)

### 1️⃣ Clone the Repository | کلون کردن مخزن

```bash
git clone https://github.com/mehrdadmb2/ArzPulse.git
cd ArzPulse
```

### 2️⃣ Run the Website Locally | اجرای محلی سایت

```bash
# Using any static server
npx serve docs
# or
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000` in your browser.

### 3️⃣ Setup Telegram Bot | راه‌اندازی ربات تلگرام

#### A. Create Bot via BotFather

1. Go to **@BotFather** on Telegram.
2. Send `/newbot` and follow the instructions.
3. Copy the **API token**.
4. Set bot commands using `/setcommands`:

```
start - نمایش پیام خوش‌آمدگویی و راهنما
help - نمایش راهنمای کامل دستورات
prices - نمایش قیمت‌های لحظه‌ای همه دارایی‌ها
gold - نمایش قیمت هر گرم طلای ۱۸ عیار
dollar - نمایش قیمت دلار (نرخ تتر)
btc - نمایش قیمت بیت‌کوین با جزئیات کامل
eth - نمایش قیمت اتریوم با جزئیات کامل
usdt - نمایش قیمت تتر با جزئیات کامل
not - نمایش قیمت نات‌کوین با جزئیات کامل
chart - نمایش راهنمای دستورات نمودار
chartall - نمایش نمودار ۲۴ ساعته هر نماد به صورت جداگانه
status - نمایش وضعیت آخرین بروزرسانی داده‌ها
setchannel - تنظیم کانال فعلی برای ارسال خودکار قیمت‌ها
stopchannel - توقف ارسال خودکار قیمت‌ها به کانال
```

5. Disable privacy mode: `/setprivacy` → select bot → **Disable**

#### B. Deploy on Cloudflare Workers

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Create Worker**.
2. Name it (e.g., `arzpulse-bot`).
3. Copy the worker code from this repository into the editor.
4. Set environment variables in **Settings** → **Variables**:

| Name | Value | Type |
|------|-------|------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather | Secret |
| `GITHUB_TOKEN` | GitHub Personal Access Token with `workflow` scope | Secret |
| `GITHUB_REPO` | `mehrdadmb2/ArzPulse` | Text |

5. Create a **KV Namespace** called `ARZPULSE_SETTINGS` and bind it as `SETTINGS_KV`.
6. Deploy and set the Webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_WORKER>.workers.dev/webhook"
```

7. Add a **Cron Trigger** in Cloudflare with `0 * * * *` (every hour) for auto-sending to channels.

### 4️⃣ Setup GitHub Pages | تنظیم GitHub Pages

1. Go to repository **Settings** → **Pages**.
2. Set **Source** to `Deploy from a branch`.
3. Select `main` branch and `/docs` folder.
4. Save – your site will be live at `https://<username>.github.io/ArzPulse/`.

---

## 🤖 Telegram Bot Commands | دستورات ربات تلگرام

### Price Commands | دستورات قیمت
| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Full help guide |
| `/prices` | Show all current prices (BTC, ETH, USDT, NOT, Gold, Dollar) |
| `/gold` | Show gold price per gram (18K) |
| `/dollar` | Show dollar price (USDT/IRR) |
| `/btc` | Bitcoin price with full details |
| `/eth` | Ethereum price with full details |
| `/usdt` | Tether price with full details |
| `/not` | Notcoin price with full details |
| `/status` | Show last update status and data freshness |

### Chart Commands | دستورات نمودار
| Command | Description |
|---------|-------------|
| `/chart BTC 24h` | Bitcoin 24-hour chart |
| `/chart ETH 7d` | Ethereum weekly chart |
| `/chart NOT 30d` | Notcoin monthly chart |
| `/chart GOLD 7d` | Gold weekly chart |
| `/chartall` | All symbols (BTC, ETH, USDT, NOT) – 24h separate charts |

### Channel Management | مدیریت کانال
| Command | Description |
|---------|-------------|
| `/setchannel` | Set current channel/group for hourly auto-updates |
| `/stopchannel` | Stop auto-updates to current channel/group |

**Supported Symbols:** `BTC`, `ETH`, `USDT`, `NOT`, `GOLD`, `DOLLAR`
**Supported Periods:** `24h`, `7d`, `30d`

---

## 📊 API Endpoints (Nobitex)

| Endpoint | Description |
|----------|-------------|
| `GET /market/stats?srcCurrency=btc&dstCurrency=rls` | BTC/IRR stats |
| `GET /market/stats?srcCurrency=eth&dstCurrency=rls` | ETH/IRR stats |
| `GET /market/stats?srcCurrency=usdt&dstCurrency=rls` | USDT/IRR stats |
| `GET /market/stats?srcCurrency=not&dstCurrency=rls` | NOT/IRR stats |
| `GET /market/stats?srcCurrency=xaut&dstCurrency=usdt` | XAUT/USDT stats |

**Rate Limits:** 20 requests per minute for market stats.

---

## 🔄 Automation Workflows | اکشن‌های خودکار

### `update-prices.yml` (Every 10 minutes)
- Fetches all prices from Nobitex.
- Computes gold price (18K/gram) and dollar price.
- Saves data to `docs/data/latest.json` and daily history.
- Commits and pushes changes automatically.

### `keep-alive.yml` (Weekly)
- Creates an empty commit every week to prevent cron deactivation after 60 days of inactivity.

### Cloudflare Worker Cron Trigger (Hourly)
- Checks if data is stale and triggers GitHub Action if needed.
- Sends price updates to all configured channels automatically.

---

## 🐛 Error Handling & Fallbacks | مدیریت خطاها

| Scenario | Behavior |
|----------|----------|
| **Nobitex API unavailable** | Script uses last cached data (`lastData`). |
| **Rate limiting** | Script uses `Promise.allSettled` and retry logic. |
| **Invalid data** | Null values are converted to `0`. |
| **Worker error** | Error logged and user receives a friendly error message. |
| **Missing data for charts** | User receives a warning with the number of available data points. |
| **GitHub Action failure** | Bot informs the user and suggests waiting a few minutes. |

---

## 🤝 Contributing | مشارکت

Contributions are welcome! Here's how you can help:

1. **Fork** the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a **Pull Request**.

Please ensure your code follows the existing style and includes appropriate tests.

---

## 📄 License | مجوز

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support | تماس و پشتیبانی

- **GitHub Issues:** [Report a bug or request a feature](https://github.com/mehrdadmb2/ArzPulse/issues)
- **Telegram Bot:** [@ArzPulseBot](https://t.me/ArzPulseBot)
- **Website:** [https://mehrdadmb2.github.io/ArzPulse/](https://mehrdadmb2.github.io/ArzPulse/)

---

## ⭐ Show Your Support

If you find this project useful, please give it a ⭐ on GitHub!

---

## 🙏 Acknowledgments | تقدیر

- **Nobitex** – For providing the API.
- **Cloudflare** – For the free Workers tier and KV storage.
- **GitHub** – For Actions and Pages hosting.
- **All users and contributors** – For their support and feedback.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/mehrdadmb2">Mehrdad</a></sub>
  <br>
  <sub>© 2026 ArzPulse – All rights reserved.</sub>
</div>
