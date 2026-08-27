// scripts/fetch-and-save.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://apiv2.nobitex.ir';
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// ---------- تبدیل XAUT به گرم ۱۸ عیار ----------
function convertXautToGram18K(xautPriceInUSDT, usdtPriceInIRR) {
    if (!xautPriceInUSDT || !usdtPriceInIRR) return 0;
    const OUNCE_TO_GRAM = 31.1034768;
    const PURITY_18K = 0.750;
    return Math.round((xautPriceInUSDT * usdtPriceInIRR / OUNCE_TO_GRAM) * PURITY_18K);
}

// ---------- دریافت JSON با timeout ----------
function fetchJson(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
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
                    reject(new Error('JSON parse error: ' + e.message));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
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
                if (lastData && lastData.prices && lastData.prices[asset.symbol]) {
                    results[asset.symbol] = lastData.prices[asset.symbol];
                    console.log(`↩️ Using cached data for ${asset.symbol}`);
                } else {
                    results[asset.symbol] = { bestBuy: 0, bestSell: 0, lastPrice: 0, volume: 0, high: 0, low: 0, change: 0 };
                }
            }
        }
    }

    // محاسبه طلا
    const usdtPrice = results.USDT ? results.USDT.bestSell || 0 : 0;
    const xautPrice = results.XAUT ? results.XAUT.bestSell || 0 : 0;
    const gold18K = convertXautToGram18K(xautPrice, usdtPrice);

    // ساخت آبجکت نهایی
    const latestData = {
        timestamp: new Date().toISOString(),
        prices: results,
        gold18K: gold18K,
        usdtPrice: usdtPrice
    };

    // ذخیره latest.json
    fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2));
    console.log('✅ latest.json saved.');

    // ذخیره تاریخچه روزانه
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
    history.push({
        time: new Date().toISOString(),
        BTC: results.BTC ? results.BTC.lastPrice || 0 : 0,
        ETH: results.ETH ? results.ETH.lastPrice || 0 : 0,
        USDT: results.USDT ? results.USDT.bestSell || 0 : 0,
        NOT: results.NOT ? results.NOT.lastPrice || 0 : 0,
        GOLD18K: gold18K
    });
    // فقط ۷ روز اخیر نگهداری شود
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    history = history.filter(entry => new Date(entry.time) >= sevenDaysAgo);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log('📊 History updated.');

    // متا
    const meta = {
        lastUpdate: latestData.timestamp,
        gold18K: gold18K,
        usdtPrice: usdtPrice,
        hasError: hasError,
        errorCount: Object.values(results).filter(r => r.bestSell === 0).length
    };
    fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

    if (hasError) {
        console.warn('⚠️ Some errors occurred, but fallback data was used.');
    } else {
        console.log('✅ All data fetched successfully.');
    }

    console.log('🏁 ArzPulse Price Fetcher Finished.');
})();
