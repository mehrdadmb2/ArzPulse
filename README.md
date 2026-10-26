# ✨ ArzPulse

<div align="center">

[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)](https://github.com/mehrdadmb2/ArzPulse/actions)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://arzpulse-bot.game-developer-mb.workers.dev)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)](https://mehrdadmb2.github.io/ArzPulse)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/mehrdadmb2/ArzPulse/pulls)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/ArzPulseBot)
[![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)](https://arzpulse-bot.game-developer-mb.workers.dev)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red?style=flat-square)](https://github.com/mehrdadmb2)

</div>

---

> **ArzPulse is a market-intelligence dashboard and Telegram alert system** for Iranian local markets, global cryptocurrencies, commodities, indices, sentiment and derivatives context — with historical data, per-asset visual identities and configurable event-driven alerts.

**🇬🇧 English** | **🇮🇷 فارسی**

---

## 📊 Overview | نمای کلی

**ArzPulse** is a complete, zero-cost price intelligence platform that:

- 📊 Tracks Iranian-market prices plus a broad global crypto watchlist (including BTC, ETH, BNB, SOL, XRP and more)
- 🏆 Calculates Gold price per gram using **XAUT/USDT** and **USDT/IRR** exchange rates
- 💵 Displays **Dollar (USD)** price based on USDT/IRR rate
- 💾 Stores historical data **inside the GitHub repository** (no external database needed)
- 🤖 Provides a Telegram bot with expanded crypto/macro commands, alert subscriptions and detailed automatic event alerts
- 🌐 Serves a responsive **market terminal** with individually themed asset cards, crypto logos, sparklines, market drivers and signal radar
- ⏱️ Auto-updates every **5 minutes** via the Cloudflare market-updater Worker dispatching GitHub Actions
- 📈 **24-hour, weekly, and monthly charts** for all assets
- 🔄 **Automatic channel updates** – send price reports to Telegram channels every hour through a separate Cloudflare Worker

---

## ✨ Features | ویژگی‌ها

### 🌐 Website (Dashboard)
- Distinct asset-card themes with coin logos or accessible fallbacks, per-token colors, market-specific backgrounds, sparklines and daily range position
- **Gold price** (18K per gram) with USDT reference
- **Dollar price** (USD/IRR) based on USDT rate
- **Interactive charts** (24h, 7d, 30d) with Chart.js
- **Currency toggle** – switch between IRR (Rial) and USD
- **Glassmorphism UI**, animated ambience, hover-reactive cards and richer market-status panels
- **Fully responsive** – works on mobile, tablet, and desktop
- **Market signal radar** – flags notable crypto moves, broad market direction, extreme Fear & Greed, global market-cap changes, futures funding and macro moves
- **Market drivers** – total market cap/volume, BTC/ETH dominance, sentiment, BTC open interest, futures funding and cross-asset context
- **Data resilience** – stale-source markers and preserved prior snapshots when a provider temporarily fails

### 🤖 Telegram Bot
**Core Commands:**
- `/prices` – Show all current prices with full details
- `/gold` – Show gold price per gram (18K)
- `/dollar` – Show dollar price (USDT/IRR)
- `/btc`, `/eth`, `/usdt`, `/not` – Individual asset prices
- `/start` – Welcome message with command list
- `/help` – Full help guide
- `/status` – Show last update status
- `/crypto` – Global crypto board with USD prices, IRR estimates, daily changes and volume
- `/macro` – Macro assets, market cap, BTC/ETH dominance, sentiment and derivatives context
- `/sentiment` – Fear & Greed and broader market sentiment
- `/alerts`, `/alertson`, `/alertsoff` – Manage automatic alert subscriptions
- `/alertlevel low|medium|high` – Select alert sensitivity

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
- **Smart alerts** – sudden price shocks, rolling 15-minute/1-hour/6-hour moves, daily threshold crossings, Fear & Greed jumps, market-cap moves, funding, open interest and broad-market breadth
- **Alert cooldowns** – merge same-asset moves into one detailed message and limit repeated notifications

**Smart Features:**
- **Countdown timer** – When data is stale, the bot triggers GitHub Action and shows a live countdown (45 seconds)
- **HTML formatting** – Bold, italic, code blocks, strikethrough, underline, and links
- **Multi-currency display** – Prices shown in both IRR and USD


### 🛰️ Smart Alerts & Market Context
- The existing five-minute Worker schedule compares fresh snapshots; the first run seeds a baseline without emitting false initial alerts.
- Sudden moves are compared across consecutive snapshots and rolling **15-minute, 1-hour and 6-hour** windows.
- Alerts also monitor 24-hour threshold crossings, Fear & Greed changes, total crypto market-cap movements, BTC/ETH funding, BTC open interest and market breadth.
- Alert messages include severity, asset, movement, period, current value, available 24-hour volume/range/trade count, source, timestamp and explanatory market context.
- `/alerts` shows the configuration help; use `/alertson` in a private chat and `/alertlevel low`, `/alertlevel medium` or `/alertlevel high` to choose sensitivity. Registered channel destinations can use `/alertsoff` to disable alerts without disabling hourly reports.
- Defaults are designed as monitoring thresholds, not trading signals. Provider delays, market liquidity and independent confirmation still matter.

### 🎨 Asset-specific UI
- Crypto cards use individual color palettes, layered backgrounds, logo treatments, watermarks, range bars and sparklines.
- The market signal radar highlights unusual moves, broad crypto direction, sentiment extremes, derivatives positioning and large macro-market changes.
- The dashboard refreshes the latest JSON snapshot every five minutes, while historical charts use the repository history files.
- GitHub Page Insights remains integrated near the bottom of the page.

### 📦 Data Storage
- All price data stored as JSON files inside the repository (`docs/data/`)
- **Daily history** files (keeps last 30 days)
- **Auto-updated** by a Cloudflare Worker every 5 minutes, with a 15-minute GitHub Actions fallback
- No external database required – fully self-contained

### ⚙️ Automation
- **GitHub Actions** fetch prices and commit changes automatically
- **Primary Cron** runs every 5 minutes in Cloudflare; the GitHub fallback skips runs when data is already fresh
- **Keep-alive workflow** prevents cron deactivation after 60 days of inactivity
- **Cloudflare Workers** with Cron Triggers for periodic checks and auto-sending

---

## 🛠️ Tech Stack | تکنولوژی‌ها

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML5 + CSS3 + vanilla JavaScript + inline SVG charts |
| **Hosting** | GitHub Pages (docs/ folder) |
| **Data Storage** | GitHub repository (JSON files) |
| **CI/CD** | GitHub Actions (cron + workflow_dispatch) |
| **Telegram Bot** | Cloudflare Workers (JavaScript) |
| **State Storage** | Cloudflare KV (channel settings, alert preferences, alert history and cooldowns) |
| **Price Source** | Nobitex REST API |
| **Chart Generation** | QuickChart.io API |
| **Typography** | Vazirmatn (Persian) + System UI (English) |

---

## 📁 Project Structure | ساختار پروژه

```
ArzPulse/
├── .github/
│   └── workflows/
│       ├── update-prices.yml      # Worker-dispatched updates + guarded 15-minute fallback
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

### `update-prices.yml` (Worker dispatch + guarded fallback)
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


## 🛠️ Recovery / deployment notes

- The market updater Worker (`worker/`) dispatches the price workflow every five minutes. The GitHub workflow has a 15-minute fallback that skips collection when the snapshot is younger than 12 minutes, so it does not normally duplicate the five-minute Worker.
- `telegram-bot/` is a separate Cloudflare Worker. Deploy it with Wrangler using `telegram-bot/wrangler.toml.example`; preserve the existing `SETTINGS_KV` namespace ID to keep channel subscriptions.
- Register the Telegram webhook at `https://arzpulse-bot.game-developer-mb.workers.dev/webhook` with the same `TELEGRAM_WEBHOOK_SECRET` configured in Cloudflare.
- The `github-page-insights` widget is integrated into the dashboard and is intentionally displayed near the bottom of the page, immediately before the footer.
- Full manual PowerShell deployment and troubleshooting instructions: [`RECOVERY-AND-DEPLOYMENT-FA.md`](RECOVERY-AND-DEPLOYMENT-FA.md). No `.ps1` installer is required.


## Market Intelligence Extension

The current collector additionally enriches `docs/data/latest.json` with a `globalCrypto` map and `marketContext` summary. The dashboard shows global market capitalization/volume, BTC dominance, Fear & Greed, breadth and derivatives context, while the bot adds `/crypto`, `/coins`, `/macro`, `/market`, and `/sentiment`.

### Sources and interpretation

- Local crypto / USDT / XAUT pairs: Nobitex.
- Major global crypto spot tickers: Binance public market-data endpoints (price, 24h change/high/low, weighted average, quote volume, base volume, bid/ask and trade count).
- Crypto sentiment: [Alternative.me Fear & Greed Index](https://alternative.me/crypto/fear-and-greed-index/) — source attribution is included in the UI and bot.
- Global crypto capitalization, volume and dominance: CoinGecko Global API, with optional Alternative.me global fallback.
- Funding / open interest: Binance USD-M Futures public endpoints.
- Brent, WTI, gold, silver, S&P 500, Nasdaq and DXY: Yahoo Finance chart endpoint; quotes may be delayed.

For tokens without an available local market pair, the dashboard and bot show an estimated IRR equivalent calculated as global USD quote × the snapshot's Nobitex USDT/IRR rate. This is not a local exchange bid/ask price. Funding, Fear & Greed, market cap, dominance and open interest are context indicators, not investment advice or standalone forecasts. If a source fails, the collector preserves a previous value with a `stale` flag rather than inventing values.
