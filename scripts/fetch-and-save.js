// scripts/fetch-and-save.js
const fs = require('fs');
const path = require('path');
const https = require('https');

// تنظیمات
const BASE_URL = 'https://apiv2.nobitex.ir';
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// ایجاد پوشه‌ها
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

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
                        resolve(JSON.parse(data));
                    } catch (e) {
                        if (retryCount < retries) {
                            console.log(`🔄 Retry ${retryCount + 1}/${retries} for ${url}`);
                            setTimeout(() => attempt(retryCount + 1), 1000);
                        } else {
                            reject(new Error('JSON parse error: ' + e.message));
                        }
                    }
                });
            });
            req.on('error', (err) => {
                if (retryCount < retries) {
                    console.log(`🔄 Retry ${retryCount + 1}/${retries} for ${url}`);
                    setTimeout(() => attempt(retryCount + 1), 1000);
                } else {
                    reject(err);
                }
            });
            req.setTimeout(timeout, () => {
                req.destroy();
                if (retryCount < retries) {
                    console.log(`🔄 Timeout retry ${retryCount + 1}/${retries} for ${url}`);
                    setTimeout(() => attempt(retryCount + 1), 1000);
                } else {
                    reject(new Error('Request timeout'));
                }
            });
        };
        attempt(0);
    });
}

// ---------- دریافت قیمت از نوبیتکس ----------
async function fetchPrice(src, dst) {
    const url = `${BASE_URL}/market/stats?srcCurrency=${src}&dstCurrency=${dst}`;
    console.log(`📡 Fetching ${src}/${dst}...`);
    const json = await fetchJson(url);
    
    if (!json || !json.stats) {
        throw new Error(`Invalid response for ${src}/${dst}: missing 'stats'`);
    }
    
    return {
        bestBuy: parseFloat(json.stats.bestBuy) || 0,
        bestSell: parseFloat(json.stats.bestSell) || 0,
        lastPrice: parseFloat(json.stats.lastPrice) || 0,
        volume: parseFloat(json.stats.volume) || 0,
        high: parseFloat(json.stats.high) || 0,
        low: parseFloat(json.stats.low) || 0,
        change: parseFloat(json.stats.change) || 0
    };
}

// ---------- دریافت همه بازارهای ریالی (یکباره) ----------
async function fetchAllRialStats() {
    console.log('📡 Fetching all Rial markets at once...');
    const url = `${BASE_URL}/market/stats?dstCurrency=rls`;
    const json = await fetchJson(url);
    
    if (!json || !json.stats) {
        throw new Error('Invalid response for all Rial markets');
    }
    
    return json.stats;
}

// ---------- تابع اصلی ----------
(async () => {
    console.log('🚀 ArzPulse Price Fetcher Started');
    console.log(`📅 ${new Date().toISOString()}`);

    // بارگذاری داده‌های قبلی (برای fallback)
    let lastData = null;
    const latestPath = path.join(DATA_DIR, 'latest.json');
    if (fs.existsSync(latestPath)) {
        try {
            const raw = fs.readFileSync(latestPath, 'utf8');
            lastData = JSON.parse(raw);
            console.log('📂 Previous data loaded for fallback.');
        } catch (e) {
            console.warn('⚠️ Could not load previous data:', e.message);
        }
    }

    let results = {};
    let hasError = false;
    let errorDetails = [];

    try {
        // روش جدید: دریافت یکباره همه بازارهای ریالی
        const allStats = await fetchAllRialStats();
        
        // نگاشت symbolهای مورد نظر
        const symbolMap = {
            'BTCIRT': 'BTC',
            'ETHIRT': 'ETH',
            'USDTIRT': 'USDT',
            'NOTIRT': 'NOT'
        };

        // استخراج داده‌های مورد نظر
        for (const [key, value] of Object.entries(allStats)) {
            if (symbolMap[key]) {
                results[symbolMap[key]] = {
                    bestBuy: parseFloat(value.bestBuy) || 0,
                    bestSell: parseFloat(value.bestSell) || 0,
                    lastPrice: parseFloat(value.lastPrice) || 0,
                    volume: parseFloat(value.volume) || 0,
                    high: parseFloat(value.high) || 0,
                    low: parseFloat(value.low) || 0,
                    change: parseFloat(value.change) || 0
                };
                console.log(`✅ ${symbolMap[key]} fetched successfully.`);
            }
        }

        // دریافت XAUT به تتر (جداگانه)
        try {
            const xautData = await fetchPrice('xaut', 'usdt');
            results['XAUT'] = xautData;
            console.log('✅ XAUT fetched successfully.');
        } catch (xautError) {
            console.error('❌ Failed to fetch XAUT:', xautError.message);
            hasError = true;
            errorDetails.push('XAUT: ' + xautError.message);
            if (lastData && lastData.prices && lastData.prices.XAUT) {
                results['XAUT'] = lastData.prices.XAUT;
                console.log('↩️ Using cached data for XAUT');
            } else {
                results['XAUT'] = { bestBuy: 0, bestSell: 0, lastPrice: 0, volume: 0, high: 0, low: 0, change: 0 };
            }
        }

    } catch (error) {
        console.error('❌ Failed to fetch all Rial markets:', error.message);
        hasError = true;
        errorDetails.push('AllRial: ' + error.message);
        
        // Fallback به روش قدیمی (دریافت تک‌تک)
        console.log('↩️ Falling back to individual fetching...');
        const assets = [
            { src: 'btc', dst: 'rls', symbol: 'BTC' },
            { src: 'eth', dst: 'rls', symbol: 'ETH' },
            { src: 'usdt', dst: 'rls', symbol: 'USDT' },
            { src: 'not', dst: 'rls', symbol: 'NOT' },
            { src: 'xaut', dst: 'usdt', symbol: 'XAUT' }
        ];

        for (const asset of assets) {
            try {
                results[asset.symbol] = await fetchPrice(asset.src, asset.dst);
                console.log(`✅ ${asset.symbol} fetched successfully.`);
            } catch (err) {
                console.error(`❌ Failed to fetch ${asset.symbol}:`, err.message);
                hasError = true;
                errorDetails.push(`${asset.symbol}: ${err.message}`);
                if (lastData && lastData.prices && lastData.prices[asset.symbol]) {
                    results[asset.symbol] = lastData.prices[asset.symbol];
                    console.log(`↩️ Using cached data for ${asset.symbol}`);
                } else {
                    results[asset.symbol] = { bestBuy: 0, bestSell: 0, lastPrice: 0, volume: 0, high: 0, low: 0, change: 0 };
                }
            }
        }
    }

    // محاسبه طلا و دلار
    const usdtPrice = results.USDT ? results.USDT.bestSell || 0 : 0;
    const xautPrice = results.XAUT ? results.XAUT.bestSell || 0 : 0;
    const gold18K = convertXautToGram18K(xautPrice, usdtPrice);
    
    // قیمت دلار = نرخ تتر (USDT)
    const dollarPrice = usdtPrice;

    // ساخت آبجکت نهایی با فیلدهای اضافی
    const latestData = {
        timestamp: new Date().toISOString(),
        prices: results,
        gold18K: gold18K,
        usdtPrice: usdtPrice,
        dollarPrice: dollarPrice,      // قیمت دلار (همان USDT)
        hasError: hasError,
        errorDetails: errorDetails
    };

    // ذخیره latest.json
    fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2));
    console.log('✅ latest.json saved.');

    // ---------- ذخیره تاریخچه روزانه برای نمودار ----------
    const today = new Date().toISOString().split('T')[0];
    const historyFile = path.join(HISTORY_DIR, `${today}.json`);
    let history = [];
    if (fs.existsSync(historyFile)) {
        try {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse history, starting fresh.');
        }
    }
    
    // اضافه کردن نقطه جدید
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
    console.log('📊 History updated.');

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
    fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

    if (hasError) {
        console.warn('⚠️ Some errors occurred:', errorDetails.join('; '));
    } else {
        console.log('✅ All data fetched successfully.');
    }

    console.log('🏁 ArzPulse Price Fetcher Finished.');
})();
