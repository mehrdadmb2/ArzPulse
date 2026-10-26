// ArzPulse market data collector — resilient, dependency-free (Node.js 20+).
// Stores the current snapshot and a rolling window of daily history files.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const BASE_URL = 'https://apiv2.nobitex.ir';
const YAHOO = 'https://query1.finance.yahoo.com';
const BINANCE_DATA = 'https://data-api.binance.vision';
const BINANCE_FUTURES = 'https://fapi.binance.com';
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=8';
const GLOBAL_CRYPTO_SYMBOLS = [
  'BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','LINK','AVAX','DOT','LTC','BCH',
  'SHIB','UNI','NEAR','SUI','XLM','ETC','ATOM','APT','FIL','ARB','OP','HBAR','INJ','AAVE','PEPE'
];
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const LATEST_PATH = path.join(DATA_DIR, 'latest.json');
const HISTORY_KEEP_DAYS = clampInt(process.env.HISTORY_KEEP_DAYS, 30, 7, 90);
const MAX_SNAPSHOTS_PER_DAY = clampInt(process.env.MAX_SNAPSHOTS_PER_DAY, 350, 50, 500);
const REQUEST_TIMEOUT_MS = clampInt(process.env.DATA_REQUEST_TIMEOUT_MS, 12000, 3000, 30000);
const REQUEST_RETRIES = clampInt(process.env.DATA_REQUEST_RETRIES, 2, 0, 4);

fs.mkdirSync(HISTORY_DIR, { recursive: true });

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function fetchText(url, timeout = REQUEST_TIMEOUT_MS, retries = REQUEST_RETRIES) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const run = () => {
      attempt += 1;
      let settled = false;
      const req = https.get(url, {
        headers: {
          'User-Agent': 'ArzPulse-Collector/5.0 (+https://github.com/mehrdadmb2/ArzPulse)',
          Accept: 'application/json,text/plain,*/*'
        }
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (settled) return;
          settled = true;
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(body);
          const error = new Error(`HTTP ${res.statusCode || 'unknown'} from upstream`);
          if (attempt <= retries) return setTimeout(run, Math.min(5000, 700 * attempt));
          reject(error);
        });
      });
      req.setTimeout(timeout, () => req.destroy(new Error(`Request timeout after ${timeout}ms`)));
      req.on('error', (error) => {
        if (settled) return;
        settled = true;
        if (attempt <= retries) return setTimeout(run, Math.min(5000, 700 * attempt));
        reject(error);
      });
    };
    run();
  });
}

async function fetchJSON(url) {
  const text = await fetchText(url);
  try { return JSON.parse(text); }
  catch { throw new Error('Upstream returned invalid JSON'); }
}

function readJSON(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSONAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

function num(value) {
  if (typeof value === 'string') value = value.replace(/,/g, '').trim();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function validPositive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }

function convertXautToGram18K(xautPriceInUSDT, usdtPriceInIRR) {
  if (!validPositive(xautPriceInUSDT) || !validPositive(usdtPriceInIRR)) return 0;
  return Math.round((Number(xautPriceInUSDT) * Number(usdtPriceInIRR) / 31.1034768) * 0.75);
}

async function fetchNobitex(src, dst) {
  const json = await fetchJSON(`${BASE_URL}/market/stats?srcCurrency=${encodeURIComponent(src)}&dstCurrency=${encodeURIComponent(dst)}`);
  if (json?.status !== 'ok' || !json.stats) throw new Error(`Nobitex returned an invalid response for ${src}-${dst}`);
  const key = `${src}-${dst}`;
  const item = json.stats[key];
  if (!item) throw new Error(`Nobitex omitted ${key}`);
  const lastPrice = num(item.latest);
  const bestBuy = num(item.bestBuy);
  const bestSell = num(item.bestSell);
  if (![lastPrice, bestBuy, bestSell].some(validPositive)) throw new Error(`Nobitex returned no usable price for ${key}`);
  return {
    bestBuy, bestSell, lastPrice,
    volume: num(item.volumeSrc), high: num(item.dayHigh), low: num(item.dayLow),
    change: num(item.dayChange), fetchedAt: new Date().toISOString(), stale: false,
    source: 'Nobitex', pair: key
  };
}

async function fetchYahoo(symbol) {
  const url = `${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&events=div%2Csplits`;
  const json = await fetchJSON(url);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance omitted ${symbol}`);
  const quote = result.indicators?.quote?.[0] || {};
  const lastCloseIndex = (quote.close || []).findLastIndex((v) => v != null && Number.isFinite(Number(v)));
  if (lastCloseIndex < 0) throw new Error(`Yahoo Finance has no usable close for ${symbol}`);
  const last = num(quote.close[lastCloseIndex]);
  let prev = last;
  for (let i = lastCloseIndex - 1; i >= 0; i -= 1) {
    if (quote.close[i] != null && validPositive(quote.close[i])) { prev = num(quote.close[i]); break; }
  }
  const ts = result.timestamp?.[lastCloseIndex] ?? result.timestamp?.at(-1);
  return {
    last,
    change: prev ? ((last - prev) / prev) * 100 : 0,
    high: num(quote.high?.[lastCloseIndex]),
    low: num(quote.low?.[lastCloseIndex]),
    volume: num(quote.volume?.[lastCloseIndex]),
    timestamp: ts ? new Date(ts * 1000).toISOString() : null,
    fetchedAt: new Date().toISOString(),
    delayed: true, stale: false, source: 'Yahoo Finance', symbol
  };
}

async function fetchBinanceCryptoBatch(symbols) {
  const pairs = symbols.map((symbol) => `${symbol}USDT`);
  const url = `${BINANCE_DATA}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
  const payload = await fetchJSON(url);
  const rows = Array.isArray(payload) ? payload : [payload];
  const byPair = new Map(rows.filter((row) => row && row.symbol).map((row) => [row.symbol, row]));
  const out = {};
  for (const symbol of symbols) {
    const row = byPair.get(`${symbol}USDT`);
    if (!row || !validPositive(row.lastPrice)) continue;
    out[symbol] = {
      symbol, pair: `${symbol}USDT`, last: num(row.lastPrice), priceUSD: num(row.lastPrice),
      change: num(row.priceChangePercent), high: num(row.highPrice), low: num(row.lowPrice),
      open: num(row.openPrice), weightedAverage: num(row.weightedAvgPrice),
      bid: num(row.bidPrice), ask: num(row.askPrice),
      volumeBase: num(row.volume), volumeUsd: num(row.quoteVolume), trades: num(row.count),
      timestamp: row.closeTime ? new Date(Number(row.closeTime)).toISOString() : new Date().toISOString(),
      fetchedAt: new Date().toISOString(), source: 'Binance Spot', stale: false
    };
  }
  if (!Object.keys(out).length) throw new Error('Binance returned no usable ticker rows');
  return out;
}

async function fetchGlobalCrypto(previous, attemptedAt, errors) {
  const result = {};
  let successes = 0;
  // Small batches limit request weight and isolate pairs that may be unavailable.
  for (let index = 0; index < GLOBAL_CRYPTO_SYMBOLS.length; index += 7) {
    const batch = GLOBAL_CRYPTO_SYMBOLS.slice(index, index + 7);
    try {
      Object.assign(result, await fetchBinanceCryptoBatch(batch));
      successes += 1;
    } catch (batchError) {
      console.warn(`↪️ Binance batch ${batch.join(',')}: ${batchError.message}; retrying symbols separately.`);
      for (const symbol of batch) {
        try {
          Object.assign(result, await fetchBinanceCryptoBatch([symbol]));
          successes += 1;
        } catch (error) {
          errors.push(`Binance ${symbol}: ${error.message}`);
          const old = previous?.[symbol];
          if (old && validPositive(old.last)) result[symbol] = { ...old, stale: true, lastCheckedAt: attemptedAt, lastError: String(error.message).slice(0, 160) };
        }
      }
    }
  }
  for (const symbol of GLOBAL_CRYPTO_SYMBOLS) {
    if (result[symbol]) continue;
    const old = previous?.[symbol];
    if (old && validPositive(old.last)) result[symbol] = { ...old, stale: true, lastCheckedAt: attemptedAt };
  }
  if (successes === 0 && !Object.keys(result).length) errors.push('Binance global crypto: no data available');
  return { data: result, successes };
}

async function fetchFearGreed(previous, attemptedAt) {
  try {
    const json = await fetchJSON(FEAR_GREED_URL);
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!rows.length || !Number.isFinite(Number(rows[0].value))) throw new Error('Fear & Greed response has no usable index');
    return {
      value: Number(rows[0].value), classification: String(rows[0].value_classification || 'Unknown'),
      timestamp: rows[0].timestamp ? new Date(Number(rows[0].timestamp) * 1000).toISOString() : attemptedAt,
      yesterday: rows[1] ? { value: Number(rows[1].value), classification: String(rows[1].value_classification || 'Unknown') } : null,
      weekAgo: rows[7] ? { value: Number(rows[7].value), classification: String(rows[7].value_classification || 'Unknown') } : null,
      source: 'Alternative.me', sourceUrl: 'https://alternative.me/crypto/fear-and-greed-index/', fetchedAt: attemptedAt, stale: false
    };
  } catch (error) {
    if (previous && Number.isFinite(Number(previous.value))) return { ...previous, stale: true, lastCheckedAt: attemptedAt, lastError: String(error.message).slice(0, 160) };
    throw error;
  }
}

async function fetchGlobalCryptoStats(previous, attemptedAt) {
  let lastError;
  const endpoints = [
    async () => {
      const json = await fetchJSON('https://api.coingecko.com/api/v3/global');
      const data = json?.data;
      if (!data?.total_market_cap?.usd) throw new Error('CoinGecko global response missing total market cap');
      return {
        totalMarketCapUsd: num(data.total_market_cap.usd), totalVolume24hUsd: num(data.total_volume?.usd),
        btcDominance: num(data.market_cap_percentage?.btc), ethDominance: num(data.market_cap_percentage?.eth),
        marketCapChange24h: num(data.market_cap_change_percentage_24h_usd),
        activeCryptocurrencies: num(data.active_cryptocurrencies), markets: num(data.markets),
        timestamp: attemptedAt, fetchedAt: attemptedAt, source: 'CoinGecko Global', sourceUrl: 'https://www.coingecko.com/', stale: false
      };
    },
    async () => {
      const json = await fetchJSON('https://api.alternative.me/v1/global/');
      const data = json?.data && !Array.isArray(json.data) ? json.data : json;
      if (!data?.total_market_cap_usd) throw new Error('Alternative.me global endpoint missing total market cap');
      return {
        totalMarketCapUsd: num(data.total_market_cap_usd), totalVolume24hUsd: num(data.total_24h_volume_usd),
        btcDominance: num(data.bitcoin_percentage_of_market_cap), ethDominance: null,
        marketCapChange24h: null, activeCryptocurrencies: num(data.active_currencies), markets: num(data.active_markets),
        timestamp: data.last_updated ? new Date(Number(data.last_updated) * 1000).toISOString() : attemptedAt,
        fetchedAt: attemptedAt, source: 'Alternative.me Global', sourceUrl: 'https://alternative.me/crypto/api/', stale: false
      };
    }
  ];
  for (const call of endpoints) {
    try { return await call(); }
    catch (error) { lastError = error; }
  }
  if (previous && validPositive(previous.totalMarketCapUsd)) return { ...previous, stale: true, lastCheckedAt: attemptedAt, lastError: String(lastError?.message || 'No global stats source available').slice(0, 160) };
  throw lastError || new Error('No global crypto stats source available');
}

async function fetchDerivatives(previous, attemptedAt, errors) {
  const result = { BTC: null, ETH: null, source: 'Binance USD-M Futures', fetchedAt: attemptedAt };
  try {
    const rows = await fetchJSON(`${BINANCE_FUTURES}/fapi/v1/premiumIndex`);
    const list = Array.isArray(rows) ? rows : [rows];
    for (const symbol of ['BTC', 'ETH']) {
      const row = list.find((item) => item?.symbol === `${symbol}USDT`);
      if (!row) continue;
      result[symbol] = {
        symbol: `${symbol}USDT`, markPrice: num(row.markPrice), indexPrice: num(row.indexPrice),
        fundingRate: num(row.lastFundingRate), nextFundingTime: row.nextFundingTime ? new Date(Number(row.nextFundingTime)).toISOString() : null,
        timestamp: row.time ? new Date(Number(row.time)).toISOString() : attemptedAt,
        source: 'Binance USD-M Futures', stale: false
      };
    }
  } catch (error) {
    errors.push(`Binance futures funding: ${error.message}`);
  }
  try {
    const oi = await fetchJSON(`${BINANCE_FUTURES}/fapi/v1/openInterest?symbol=BTCUSDT`);
    if (result.BTC) {
      result.BTC.openInterestContracts = num(oi.openInterest);
      result.BTC.openInterestUsd = num(oi.openInterest) * num(result.BTC.markPrice);
      result.BTC.openInterestTimestamp = oi.time ? new Date(Number(oi.time)).toISOString() : attemptedAt;
    }
  } catch (error) {
    errors.push(`Binance BTC open interest: ${error.message}`);
  }
  for (const symbol of ['BTC', 'ETH']) {
    if (result[symbol]) continue;
    const old = previous?.[symbol];
    if (old) result[symbol] = { ...old, stale: true, lastCheckedAt: attemptedAt };
  }
  if (!result.BTC && !result.ETH) throw new Error('No usable futures funding data');
  return result;
}

async function fetchMarketContext(previous, attemptedAt, errors) {
  const [sentimentResult, globalResult, cryptoResult, derivativesResult] = await Promise.allSettled([
    fetchFearGreed(previous?.fearGreed, attemptedAt),
    fetchGlobalCryptoStats(previous?.global, attemptedAt),
    fetchGlobalCrypto(previous?.globalCrypto, attemptedAt, errors),
    fetchDerivatives(previous?.derivatives, attemptedAt, errors)
  ]);
  const context = {};
  let successes = 0;
  if (sentimentResult.status === 'fulfilled') { context.fearGreed = sentimentResult.value; successes += 1; }
  else { errors.push(`Fear & Greed: ${sentimentResult.reason?.message || 'request failed'}`); if (previous?.fearGreed) context.fearGreed = { ...previous.fearGreed, stale: true, lastCheckedAt: attemptedAt }; }
  if (globalResult.status === 'fulfilled') { context.global = globalResult.value; successes += 1; }
  else { errors.push(`Global crypto stats: ${globalResult.reason?.message || 'request failed'}`); if (previous?.global) context.global = { ...previous.global, stale: true, lastCheckedAt: attemptedAt }; }
  if (cryptoResult.status === 'fulfilled') { context.globalCrypto = cryptoResult.value.data; successes += cryptoResult.value.successes > 0 ? 1 : 0; }
  if (derivativesResult.status === 'fulfilled') { context.derivatives = derivativesResult.value; successes += 1; }
  else { errors.push(`Derivatives: ${derivativesResult.reason?.message || 'request failed'}`); if (previous?.derivatives) context.derivatives = previous.derivatives; }
  return { context, successes };
}

function fallbackRecord(previous, defaults, attemptedAt, errorMessage) {
  if (previous && typeof previous === 'object') {
    return { ...previous, stale: true, lastCheckedAt: attemptedAt, lastError: String(errorMessage).slice(0, 180) };
  }
  return { ...defaults, stale: true, lastCheckedAt: attemptedAt, lastError: String(errorMessage).slice(0, 180) };
}

function cleanupHistoryFiles(now = new Date()) {
  const cutoffDate = new Date(now.getTime() - (HISTORY_KEEP_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  let deleted = 0;
  let compacted = 0;
  for (const name of fs.readdirSync(HISTORY_DIR)) {
    const match = name.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!match) continue;
    const filePath = path.join(HISTORY_DIR, name);
    if (match[1] < cutoffDate) {
      try { fs.unlinkSync(filePath); deleted += 1; }
      catch (error) { console.warn(`⚠️ Could not delete expired history file ${name}: ${error.message}`); }
      continue;
    }

    // Compact retained legacy files too, not only today's file; this makes the
    // first run after deployment shrink already-large daily JSON snapshots.
    try {
      const rows = readJSON(filePath, []);
      if (!Array.isArray(rows)) continue;
      const next = compactDailySnapshots(rows, MAX_SNAPSHOTS_PER_DAY);
      if (JSON.stringify(rows) !== JSON.stringify(next)) {
        writeJSONAtomic(filePath, next);
        compacted += 1;
      }
    } catch (error) {
      console.warn(`⚠️ Could not compact daily history file ${name}: ${error.message}`);
    }
  }
  if (deleted || compacted) {
    console.log(`🧹 History maintenance: removed ${deleted} expired file(s), compacted ${compacted} retained file(s); retention=${HISTORY_KEEP_DAYS} days, max=${MAX_SNAPSHOTS_PER_DAY} snapshots/day.`);
  }
}

function compactDailySnapshots(rows, maximum = MAX_SNAPSHOTS_PER_DAY) {
  const validRows = (Array.isArray(rows) ? rows : [])
    .filter((row) => row && Number.isFinite(Date.parse(row.time)))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  // Merge snapshots that land in the same minute; preserve any valid asset key
  // from either run but keep the newer timestamp so concurrent dispatches don't
  // bloat a daily file with near-identical rows.
  const byMinute = new Map();
  for (const row of validRows) {
    const minute = Math.floor(Date.parse(row.time) / 60000);
    const previous = byMinute.get(minute);
    byMinute.set(minute, previous ? { ...previous, ...row } : row);
  }
  const compact = [...byMinute.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (compact.length <= maximum) return compact;

  // Uniformly sample the day, preserving the earliest and latest row and keeping
  // time coverage rather than simply retaining the last N near-adjacent rows.
  const sampled = [];
  for (let i = 0; i < maximum; i += 1) {
    const index = Math.round(i * (compact.length - 1) / (maximum - 1));
    const row = compact[index];
    if (!sampled.length || sampled[sampled.length - 1].time !== row.time) sampled.push(row);
  }
  console.warn(`🧮 Compacted daily history from ${compact.length} to ${sampled.length} snapshots.`);
  return sampled;
}

function buildHistoryRow(now, prices, gold18K, dollarPrice, market, globalCrypto) {
  const row = { time: now };
  const put = (key, value, stale = false) => {
    if (!stale && validPositive(value)) row[key] = Number(value);
  };
  put('BTC', prices.BTC?.lastPrice, prices.BTC?.stale);
  put('ETH', prices.ETH?.lastPrice, prices.ETH?.stale);
  put('USDT', prices.USDT?.bestSell, prices.USDT?.stale);
  put('NOT', prices.NOT?.lastPrice, prices.NOT?.stale);
  put('GOLD18K', gold18K, prices.XAUT?.stale || prices.USDT?.stale);
  put('DOLLAR', dollarPrice, prices.USDT?.stale);
  for (const [key, value] of Object.entries(market)) put(key, value?.last, value?.stale);
  const usdtRate = num(dollarPrice);
  for (const [key, value] of Object.entries(globalCrypto || {})) {
    // Store approximate IRR values so existing charts/history need no new schema.
    if (!Number.isFinite(row[key]) && !value?.stale && validPositive(value?.last) && validPositive(usdtRate)) row[key] = num(value.last) * usdtRate;
  }
  return row;
}

(async () => {
  console.log(`🚀 ArzPulse collector v6 — history retention ${HISTORY_KEEP_DAYS} days; max snapshots/day ${MAX_SNAPSHOTS_PER_DAY}`);
  const previous = readJSON(LATEST_PATH, null);
  const attemptedAt = new Date().toISOString();
  const errors = [];
  const prices = {};
  let successfulSources = 0;
  let successfulLocalSources = 0;

  const localAssets = [
    ['btc', 'rls', 'BTC'], ['eth', 'rls', 'ETH'], ['usdt', 'rls', 'USDT'],
    ['not', 'rls', 'NOT'], ['xaut', 'usdt', 'XAUT']
  ];

  for (const [src, dst, key] of localAssets) {
    try {
      prices[key] = await fetchNobitex(src, dst);
      successfulSources += 1;
      successfulLocalSources += 1;
      console.log(`✅ ${key}`);
    } catch (error) {
      errors.push(`${key}: ${error.message}`);
      prices[key] = fallbackRecord(previous?.prices?.[key], {
        bestBuy: 0, bestSell: 0, lastPrice: 0, volume: 0, high: 0, low: 0, change: 0, source: 'Nobitex'
      }, attemptedAt, error.message);
      console.warn(`↩️ ${key}: ${error.message}`);
    }
  }

  const usdt = num(prices.USDT?.bestSell);
  const xaut = num(prices.XAUT?.bestSell);
  const gold18K = convertXautToGram18K(xaut, usdt);
  const dollarPrice = usdt;
  const market = {};
  const globalSymbols = {
    BRENT: 'BZ=F', WTI: 'CL=F', XAUUSD: 'GC=F', SILVER: 'SI=F',
    SP500: '^GSPC', NASDAQ: '^IXIC', DXY: 'DX-Y.NYB'
  };

  for (const [key, symbol] of Object.entries(globalSymbols)) {
    try {
      market[key] = await fetchYahoo(symbol);
      successfulSources += 1;
      console.log(`✅ ${key} (${symbol})`);
    } catch (error) {
      errors.push(`${key}: ${error.message}`);
      market[key] = fallbackRecord(previous?.market?.[key], {
        last: 0, change: 0, high: 0, low: 0, volume: 0, timestamp: null, delayed: true, symbol, source: 'Yahoo Finance'
      }, attemptedAt, error.message);
      console.warn(`↩️ ${key}: ${error.message}`);
    }
  }

  const successfulPriceSources = successfulSources;
  const contextResult = await fetchMarketContext({ ...(previous?.marketContext || {}), globalCrypto: previous?.globalCrypto || previous?.marketContext?.globalCrypto }, attemptedAt, errors);
  const marketContext = contextResult.context;
  const globalCrypto = marketContext.globalCrypto || {};
  successfulSources += contextResult.successes;

  const hasAnyPreviousData = Boolean(previous && (previous.timestamp || previous.prices || previous.market));
  const topLevelTimestamp = successfulPriceSources > 0 ? attemptedAt : (previous?.timestamp || attemptedAt);
  const latest = {
    version: 6,
    timestamp: topLevelTimestamp,
    attemptTimestamp: attemptedAt,
    lastGoodTimestamp: successfulPriceSources > 0 ? attemptedAt : (previous?.lastGoodTimestamp || previous?.timestamp || null),
    prices, gold18K, usdtPrice: usdt, dollarPrice,
    goldChange: num(prices.XAUT?.change), dollarChange: num(prices.USDT?.change),
    derivedStale: {
      gold18K: Boolean(prices.XAUT?.stale || prices.USDT?.stale),
      dollar: Boolean(prices.USDT?.stale)
    },
    market,
    globalCrypto,
    marketContext: { fearGreed: marketContext.fearGreed || null, global: marketContext.global || null, derivatives: marketContext.derivatives || null },
    hasError: errors.length > 0,
    errorCount: errors.length,
    errorDetails: errors,
    successfulSources,
    successfulLocalSources
  };

  // If every upstream source failed and we have a prior snapshot, keep the prior
  // published snapshot time. This prevents stale fallback values looking fresh.
  if (successfulPriceSources === 0 && hasAnyPreviousData) {
    latest.timestamp = previous.timestamp || previous.lastGoodTimestamp || null;
  }
  writeJSONAtomic(LATEST_PATH, latest);

  // Append only values refreshed successfully in this run; do not contaminate
  // charts with repeated stale fallback prices when an upstream is down.
  const today = attemptedAt.slice(0, 10);
  const dailyFile = path.join(HISTORY_DIR, `${today}.json`);
  const history = readJSON(dailyFile, []);
  const cutoffMs = Date.now() - HISTORY_KEEP_DAYS * 86400000;
  const kept = Array.isArray(history)
    ? history.filter((item) => Number.isFinite(Date.parse(item?.time)) && Date.parse(item.time) >= cutoffMs)
    : [];
  const row = buildHistoryRow(attemptedAt, prices, gold18K, dollarPrice, market, globalCrypto);
  if (Object.keys(row).length > 1) kept.push(row);
  const compactedHistory = compactDailySnapshots(kept, MAX_SNAPSHOTS_PER_DAY);
  writeJSONAtomic(dailyFile, compactedHistory);

  const meta = {
    version: 6, lastAttempt: attemptedAt, lastUpdate: latest.timestamp,
    retentionDays: HISTORY_KEEP_DAYS, gold18K, usdtPrice: usdt, dollarPrice,
    marketSummary: Object.fromEntries(Object.entries(market).map(([key, item]) => [key, {
      last: item.last, change: item.change, delayed: Boolean(item.delayed), stale: Boolean(item.stale), timestamp: item.timestamp || null
    }])),
    hasError: errors.length > 0, errorCount: errors.length, errors,
    globalCryptoCount: Object.values(globalCrypto).filter((item) => validPositive(item?.last) && !item?.stale).length,
    contextSummary: { fearGreed: marketContext.fearGreed?.value ?? null, totalMarketCapUsd: marketContext.global?.totalMarketCapUsd ?? null, btcDominance: marketContext.global?.btcDominance ?? null },
    successfulSources, successfulLocalSources
  };
  writeJSONAtomic(path.join(DATA_DIR, 'meta.json'), meta);
  cleanupHistoryFiles(new Date(attemptedAt));

  console.log(`✅ Updated latest.json and ${today}.json; successful=${successfulSources}; failed=${errors.length}.`);
  if (successfulPriceSources === 0) {
    console.error('❌ All upstream requests failed. Snapshot timestamp was preserved to avoid presenting stale values as fresh.');
    // Snapshot/meta are useful diagnostics, but let Actions report a failed refresh.
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error('❌ Collector failed:', error?.stack || error);
  process.exitCode = 1;
});
