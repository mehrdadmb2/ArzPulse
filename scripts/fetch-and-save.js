// scripts/fetch-and-save.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://apiv2.nobitex.ir';
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// تبدیل XAUT/USDT به گرم ۱۸ عیار با توجه به قیمت تتر
function convertXautToGram18K(xautPriceInUSDT, usdtPriceInIRR) {
  const OUNCE_TO_GRAM = 31.1034768;
  const PURITY_18K = 0.750;
  const pricePerOunceIRR = xautPriceInUSDT * usdtPriceInIRR;
  return Math.round((pricePerOunceIRR / OUNCE_TO_GRAM) * PURITY_18K);
}

// تابع کمکی برای درخواست HTTPS
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ArzPulse/1.0.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchPrice(src, dst) {
  const url = `${BASE_URL}/market/stats?srcCurrency=${src}&dstCurrency=${dst}`;
  const json = await fetchJson(url);
  if (!json.stats) throw new Error('Invalid response');
  return {
    bestBuy: parseFloat(json.stats.bestBuy),
    bestSell: parseFloat(json.stats.bestSell),
    lastPrice: parseFloat(json.stats.lastPrice),
    volume: parseFloat(json.stats.volume),
    high: parseFloat(json.stats.high),
    low: parseFloat(json.stats.low),
    change: parseFloat(json.stats.change)
  };
}

(async () => {
  try {
    // دریافت همزمان قیمت‌ها
    const [btc, eth, usdt, not, xaut] = await Promise.all([
      fetchPrice('btc', 'rls'),
      fetchPrice('eth', 'rls'),
      fetchPrice('usdt', 'rls'),
      fetchPrice('not', 'rls'),
      fetchPrice('xaut', 'usdt')   // XAUT به تتر
    ]);

    // قیمت تتر به ریال (برای تبدیل طلا)
    const usdtToIRR = usdt.bestSell; // یا میانگین buy/sell

    // محاسبه طلا
    const gold18K = convertXautToGram18K(xaut.bestSell, usdtToIRR);

    // ساخت آبجکت قیمت‌ها
    const prices = {
      BTC: btc,
      ETH: eth,
      USDT: usdt,
      NOT: not,
      XAUT: xaut   // نگه می‌داریم برای رفرنس
    };

    const latestData = {
      timestamp: new Date().toISOString(),
      prices,
      gold18K,
      usdtPrice: usdtToIRR
    };

    // ذخیره latest.json
    fs.writeFileSync(
      path.join(DATA_DIR, 'latest.json'),
      JSON.stringify(latestData, null, 2)
    );

    // ذخیره تاریخچه روزانه
    const today = new Date().toISOString().split('T')[0];
    const historyFile = path.join(HISTORY_DIR, `${today}.json`);
    let history = [];
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    history.push({
      time: new Date().toISOString(),
      BTC: btc.lastPrice,
      ETH: eth.lastPrice,
      USDT: usdt.bestSell,
      NOT: not.lastPrice,
      GOLD18K: gold18K
    });
    // فقط ۷ روز اخیر نگهداری شود (حذف روزهای قدیمی‌تر)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    history = history.filter(entry => new Date(entry.time) >= sevenDaysAgo);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    // meta.json
    fs.writeFileSync(
      path.join(DATA_DIR, 'meta.json'),
      JSON.stringify({
        lastUpdate: latestData.timestamp,
        gold18K,
        usdtPrice: usdtToIRR
      }, null, 2)
    );

    console.log('✅ داده‌ها با موفقیت ذخیره شدند.');
  } catch (error) {
    console.error('❌ خطا:', error);
    process.exit(1);
  }
})();
