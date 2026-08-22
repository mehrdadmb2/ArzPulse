# ArzPulse

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

> **Professional real-time cryptocurrency price monitoring system for the Iranian market** – fetching live prices from Nobitex, storing historical data, and providing a modern dashboard + Telegram bot, all running **100% free** on GitHub Pages and Cloudflare Workers.

---

## 🚀 Overview

**ArzPulse** is a complete, zero-cost price intelligence platform that:

- 📊 Fetches real-time prices for **BTC**, **ETH**, **USDT**, **NOT**, and **Gold (18K)** from **Nobitex**.
- 🏆 Calculates Gold price per gram using **XAUT/USDT** and **USDT/IRR** exchange rates.
- 💾 Stores historical data **inside the GitHub repository** (no external database needed).
- 🤖 Provides a **Telegram bot** on Cloudflare Workers with multiple commands.
- 🌐 Serves a **modern, glassmorphism UI dashboard** via GitHub Pages.
- ⏱️ Auto-updates every **5 minutes** using GitHub Actions.

> **Live Demo:** [https://mehrdadmb2.github.io/ArzPulse](https://mehrdadmb2.github.io/ArzPulse)  
> **Telegram Bot:** [@ArzPulseBot](https://t.me/ArzPulseBot)  
> **Worker Endpoint:** [https://arzpulse-bot.game-developer-mb.workers.dev](https://arzpulse-bot.game-developer-mb.workers.dev)

---

## ✨ Features

### 🌐 Website (Dashboard)
- **Real-time price cards** with buy/sell/last prices and 24h change indicators.
- **Gold price display** (18K per gram) with USDT reference.
- **Glassmorphism UI** with animated gradients and hover effects.
- **Fully responsive** – works on mobile, tablet, and desktop.
- **Fallback mechanism** – if Nobitex API fails, uses cached data from the repo.

### 🤖 Telegram Bot
- `/prices` – Show all current prices.
- `/gold` – Show gold price per gram.
- `/btc` `/eth` `/usdt` `/not` – Individual asset prices.
- `/start` – Welcome message with command list.
- Built with **Cloudflare Workers** – fast, scalable, and free.

### 📦 Data Storage
- All price data stored as **JSON files** inside the repository (`data/` folder).
- **Daily history** files (keeps last 7 days).
- **Auto-updated** via GitHub Actions every 5 minutes.
- No external database required – fully self-contained.

### ⚙️ Automation
- **GitHub Actions** fetch prices and commit changes automatically.
- **Cron schedule** runs every 5 minutes (respects Nobitex rate limits).
- **Deploy workflow** builds and deploys the Next.js site to `docs/` folder.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS |
| **Hosting** | GitHub Pages (static export) |
| **Backend API** | Cloudflare Workers (Telegram bot) |
| **Data Storage** | GitHub repository (JSON files) |
| **CI/CD** | GitHub Actions |
| **Price Source** | Nobitex REST API + WebSocket (optional) |
| **Gold Calculation** | XAUT/USDT × USDT/IRR → 18K/gram |

---

## 📁 Project Structure

```
ArzPulse/
├── .github/
│   └── workflows/
│       ├── update-prices.yml      # Fetch & store data every 5 min
│       └── deploy-site.yml        # Build & deploy site to docs/
├── data/                          # Stored price data (auto-updated)
│   ├── latest.json                # Current prices + gold
│   ├── meta.json                  # Metadata (last update, etc.)
│   └── history/
│       └── YYYY-MM-DD.json        # Daily historical records
├── docs/                          # Built site (served by GitHub Pages)
├── scripts/
│   └── fetch-and-save.js          # Main data fetcher script
├── site/                          # Next.js application
│   ├── app/
│   │   ├── page.tsx               # Dashboard page
│   │   ├── layout.tsx
│   │   ├── components/
│   │   │   ├── PriceCard.tsx      # Asset price card
│   │   │   └── GoldPrice.tsx      # Gold display component
│   │   └── lib/
│   │       └── nobitex.ts         # API client with fallback
│   ├── public/                    # Static assets (icons, etc.)
│   ├── package.json
│   ├── next.config.js             # Output to ../docs
│   └── tailwind.config.js
├── worker/                        # Cloudflare Worker (Telegram bot)
│   └── src/
│       ├── index.ts               # Worker entry point
│       ├── bot.ts                 # Bot logic
│       └── nobitex.ts             # Price fetcher for bot
└── README.md
```

---

## 🧮 Gold Price Calculation

ArzPulse calculates the **price of 1 gram of 18-karat gold in Iranian Rials** using two key prices from Nobitex:

1. **XAUT/USDT** – Price of 1 ounce of Tether Gold in USDT.
2. **USDT/IRR** – Price of 1 USDT in Iranian Rials.

**Formula:**

```
Price per ounce (IRR) = XAUT/USDT × USDT/IRR
Price per gram (IRR)  = (Price per ounce / 31.1034768) × 0.750
```

Where:
- `31.1034768` = grams per troy ounce
- `0.750` = purity factor for 18K gold (18/24)

This approach ensures accurate, real-time gold pricing based on the XAUT digital gold token.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- (Optional) Cloudflare account for Worker deployment

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/mehrdadmb2/ArzPulse.git
cd ArzPulse
```

### 2️⃣ Run the Website Locally

```bash
cd site
npm install
npm run dev
```

The site will be available at [http://localhost:3000](http://localhost:3000)

### 3️⃣ Build Static Export (for GitHub Pages)

```bash
cd site
npm run build && npm run export
```

The output will be generated in the `../docs/` folder.

### 4️⃣ Deploy the Telegram Bot (Cloudflare Worker)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** → **Create application** → **Create Worker**.
3. Name it (e.g., `arzpulse-bot`).
4. Copy the code from `worker/src/index.ts` into the editor.
5. Add environment variable `TELEGRAM_BOT_TOKEN` with your bot token.
6. Deploy and set the Webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_WORKER>.workers.dev/webhook"
```

### 5️⃣ Set Up GitHub Pages

1. Go to repository **Settings** → **Pages**.
2. Set **Source** to `Deploy from a branch`.
3. Select `main` branch and `/docs` folder.
4. Save – your site will be live at `https://<username>.github.io/ArzPulse/`.

---

## 🤖 Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and available commands. |
| `/prices` | Display all current prices (BTC, ETH, USDT, NOT) + gold. |
| `/gold` | Show gold price per gram (18K) and USDT rate. |
| `/btc` | Show Bitcoin price (buy/sell/last). |
| `/eth` | Show Ethereum price. |
| `/usdt` | Show Tether price in IRR. |
| `/not` | Show Notcoin price. |

> **Note:** All prices are in Iranian Rials (IRR) and updated in real-time from Nobitex.

---

## 📊 API Endpoints (Nobitex)

The project uses the following Nobitex endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /market/stats?srcCurrency=btc&dstCurrency=rls` | BTC/IRR stats |
| `GET /market/stats?srcCurrency=eth&dstCurrency=rls` | ETH/IRR stats |
| `GET /market/stats?srcCurrency=usdt&dstCurrency=rls` | USDT/IRR stats |
| `GET /market/stats?srcCurrency=not&dstCurrency=rls` | NOT/IRR stats |
| `GET /market/stats?srcCurrency=xaut&dstCurrency=usdt` | XAUT/USDT stats |

All requests include the `User-Agent: ArzPulse/1.0.0` header as recommended by Nobitex.

**Rate Limits:**
- 300 requests per minute for market stats.
- The GitHub Action runs every 5 minutes, well within the limit.

---

## 🔄 Automation Workflows

### `update-prices.yml` (Every 5 minutes)
- Fetches all prices from Nobitex.
- Computes gold price (18K/gram).
- Saves data to `data/latest.json` and daily history.
- Commits and pushes changes.

### `deploy-site.yml` (On push to main)
- Installs dependencies for the site.
- Builds Next.js static export.
- Outputs to `docs/` folder.
- Commits and pushes the updated site.

---

## 🐛 Error Handling & Fallbacks

- **Nobitex API failure:** The site and bot fall back to the last stored data from `data/latest.json`.
- **Rate limiting:** The fetcher respects Nobitex limits by using `Promise.all` and spacing requests.
- **Missing data:** If a price is unavailable, the system uses the previous cached value.
- **Worker timeout:** Asynchronous operations are handled with `waitUntil` to avoid blocking responses.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code follows the existing style and includes appropriate tests.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **GitHub Issues:** [Report a bug or request a feature](https://github.com/mehrdadmb2/ArzPulse/issues)
- **Telegram:** [@ArzPulseBot](https://t.me/ArzPulseBot)
- **Email:** [Your Email]

---

## ⭐ Show Your Support

If you find this project useful, please give it a ⭐ on GitHub!

---

## 🙏 Acknowledgments

- **Nobitex** for providing the API.
- **Cloudflare** for the free Workers tier.
- **GitHub** for Actions and Pages hosting.

---

**Built with ❤️ by [Mehrdad](https://github.com/mehrdadmb2) | © 2026 ArzPulse**
