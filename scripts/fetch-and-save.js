// scripts/fetch-and-save.js
const fs = require('fs');
const path = require('path');
const https = require('https');

// ---------- تنظیمات ----------
const BASE_URL = 'https://apiv2.nobitex.ir';
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

console.log(`📁 مسیر پوشه داده: ${DATA_DIR}`);

// ---------- ایجاد پوشه‌ها ----------
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 پوشه data ایجاد شد.');
}
if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    console.log('📁 پوشه history ایجاد شد.');
}

// ---------- تبدیل XAUT به گرم ۱۸ عیار ----------
function convertXautToGram18K(xautPriceInUSDT, usdtPriceInIRR) {
    if (!xautPriceInUSDT || !usdtPriceInIRR) return 0;
    const OUNCE_TO_GRAM = 31.1034768;
    const PURITY_18K = 0.750;
    return Math.round((xautPriceInUSDT * usdtPriceInIRR / OUNCE_TO_GRAM) * PURITY_18K);
}

// ---------- دریافت JSON با timeout و retry ----------
function fetchJson(url, timeout = 10000, retries = 2) {
    return new Promise((resolve, reject) => {
        const attempt = (retryCount) => {
            console.log(`  🌐 درخواست به: ${url}`);
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'ArzPulse/1.0.0',
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        if (retryCount < retries) {
                            console.log(`  🔄 تلاش مجدد ${retryCount + 1}/${retries}`);
                            setTimeout(() => attempt(retryCount + 1), 1000);
                        } else {
                            reject(new Error('JSON parse error: ' + e.message));
                        }
                    }
                });
            });
            req.on('error', (err) => {
                if (retryCount < retries) {
                    console.log(`  🔄 خطا، تلاش مجدد ${retryCount + 1}/${retries}`);
                    setTimeout(() => attempt(retryCount + 1), 1000);
                } else {
                    reject(err);
                }
            });
            req.setTimeout(timeout, () => {
                req.destroy();
                if (retryCount < retries) {
                    console.log(`  🔄 Timeout، تلاش مجدد ${retryCount + 1}/${retries}`);
                    setTimeout(() => attempt(retryCount + 1), 1000);
                } else {
                    reject(new Error('Request timeout'));
                }
            });
        };
        attempt(0);
    });
}

// ---------- دریافت قیمت از نوبیتکس (با ساختار صحیح) ----------
async function fetchPrice(src, dst) {
    const url = `${BASE_URL}/market/stats?srcCurrency=${src}&dstCurrency=${dst}`;
    const json = await fetchJson(url);
    
    // بررسی پاسخ
    if (!json || json.status !== 'ok' || !json.stats) {
        throw new Error('پاسخ نامعتبر از نوبیتکس');
    }

    // پیدا کردن کلید مناسب در stats (مثلاً "btc-rls" یا "eth-rls")
    const key = Object.keys(json.stats).find(k => k === `${src}-${dst}`);
    if (!key) {
        throw new Error(`کلید ${src}-${dst} در پاسخ وجود ندارد`);
    }

    const data = json.stats[key];
    return {
        bestBuy: parseFloat(data.bestBuy) || 0,
        bestSell: parseFloat(data.bestSell) || 0,
        lastPrice: parseFloat(data.latest) || 0,
        volume: parseFloat(data.volumeSrc) || 0,
        high: parseFloat(data.dayHigh) || 0,
        low: parseFloat(data.dayLow) || 0,
        change: parseFloat(data.dayChange) || 0
    };
}

// ---------- تابع اصلی ----------
(async () => {
    console.log('🚀 ArzPulse Price Fetcher شروع شد');
    console.log(`📅 ${new Date().toISOString()}`);

    // بارگذاری داده‌های قبلی (برای fallback)
    let lastData = null;
    const latestPath = path.join(DATA_DIR, 'latest.json');
    if (fs.existsSync(latestPath)) {
        try {
            const raw = fs.readFileSync(latestPath, 'utf8');
            lastData = JSON.parse(raw);
            console.log('📂 داده‌های قبلی برای fallback بارگذاری شد.');
        } catch (e) {
            console.warn('⚠️ نتوانستیم داده‌های قبلی را بخوانیم:', e.message);
        }
    }

    const assets = [
        { src: 'btc', dst: 'rls', symbol: 'BTC' },
        { src: 'eth', dst: 'rls', symbol: 'ETH' },
        { src: 'usdt', dst: 'rls', symbol: 'USDT' },
        { src: 'not', dst: 'rls', symbol: 'NOT' },
        { src: 'xaut', dst: 'usdt', symbol: 'XAUT' }
    ];

    let results = {};
    let hasError = false;
    let errorDetails = [];

    // دریافت تک‌تک هر دارایی
    for (const asset of assets) {
        try {
            console.log(`📡 دریافت ${asset.symbol} (${asset.src}/${asset.dst})...`);
            results[asset.symbol] = await fetchPrice(asset.src, asset.dst);
            console.log(`✅ ${asset.symbol} دریافت شد.`);
        } catch (error) {
            console.error(`❌ خطا در دریافت ${asset.symbol}:`, error.message);
            hasError = true;
            errorDetails.push(`${asset.symbol}: ${error.message}`);
            // استفاده از داده‌های قبلی اگر موجود باشد
            if (lastData && lastData.prices && lastData.prices[asset.symbol]) {
                results[asset.symbol] = lastData.prices[asset.symbol];
                console.log(`↩️ استفاده از داده‌های کش برای ${asset.symbol}`);
            } else {
                results[asset.symbol] = { bestBuy: 0, bestSell: 0, lastPrice: 0, volume: 0, high: 0, low: 0, change: 0 };
                console.log(`⚠️ مقدار ۰ برای ${asset.symbol} استفاده شد.`);
            }
        }
    }

    // محاسبه طلا و دلار
    const usdtPrice = results.USDT ? results.USDT.bestSell || 0 : 0;
    const xautPrice = results.XAUT ? results.XAUT.bestSell || 0 : 0;
    const gold18K = convertXautToGram18K(xautPrice, usdtPrice);
    const dollarPrice = usdtPrice;

    // ساخت آبجکت نهایی
    const latestData = {
        timestamp: new Date().toISOString(),
        prices: results,
        gold18K: gold18K,
        usdtPrice: usdtPrice,
        dollarPrice: dollarPrice,
        hasError: hasError,
        errorDetails: errorDetails
    };

    // ذخیره latest.json
    fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2));
    console.log(`✅ latest.json ذخیره شد: ${latestPath}`);

    // ذخیره تاریخچه روزانه
    const today = new Date().toISOString().split('T')[0];
    const historyFile = path.join(HISTORY_DIR, `${today}.json`);
    let history = [];
    if (fs.existsSync(historyFile)) {
        try {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) {
            console.warn('⚠️ نتوانستیم تاریخچه را بخوانیم، از نو شروع می‌کنیم.');
        }
    }
    history.push({
        time: new Date().toISOString(),
        BTC: results.BTC ? results.BTC.lastPrice || 0 : 0,
        ETH: results.ETH ? results.ETH.lastPrice || 0 : 0,
        USDT: results.USDT ? results.USDT.bestSell || 0 : 0,
        NOT: results.NOT ? results.NOT.lastPrice || 0 : 0,
        GOLD18K: gold18K,
        DOLLAR: dollarPrice
    });
    // فقط ۳۰ روز اخیر نگهداری شود
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(entry => new Date(entry.time) >= thirtyDaysAgo);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log(`📊 تاریخچه روزانه ذخیره شد: ${historyFile}`);

    // متا
    const meta = {
        lastUpdate: latestData.timestamp,
        gold18K: gold18K,
        usdtPrice: usdtPrice,
        dollarPrice: dollarPrice,
        hasError: hasError,
        errorCount: errorDetails.length,
        errors: errorDetails
    };
    const metaPath = path.join(DATA_DIR, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`📄 meta.json ذخیره شد: ${metaPath}`);

    // نمایش خلاصه قیمت‌ها
    console.log('📊 خلاصه قیمت‌های دریافت‌شده:');
    for (const [symbol, data] of Object.entries(results)) {
        console.log(`   ${symbol}: خرید ${data.bestBuy || 0} | فروش ${data.bestSell || 0} | آخرین ${data.lastPrice || 0}`);
    }
    console.log(`   طلا (۱۸ عیار): ${gold18K} ریال`);
    console.log(`   دلار (USDT): ${dollarPrice} ریال`);

    if (hasError) {
        console.warn('⚠️ برخی خطاها رخ داد:', errorDetails.join('; '));
    } else {
        console.log('✅ تمام داده‌ها با موفقیت دریافت شدند.');
    }

    console.log('🏁 ArzPulse Price Fetcher پایان یافت.');
})();
