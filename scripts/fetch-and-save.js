// ArzPulse market data collector — resilient, dependency-free (Node.js 20+).
// Stores the current snapshot and a rolling window of daily history files.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const BASE_URL = 'https://apiv2.nobitex.ir';
const YAHOO = 'https://query1.finance.yahoo.com';
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

function buildHistoryRow(now, prices, gold18K, dollarPrice, market) {
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

  const hasAnyPreviousData = Boolean(previous && (previous.timestamp || previous.prices || previous.market));
  const topLevelTimestamp = successfulSources > 0 ? attemptedAt : (previous?.timestamp || attemptedAt);
  const latest = {
    version: 5,
    timestamp: topLevelTimestamp,
    attemptTimestamp: attemptedAt,
    lastGoodTimestamp: successfulSources > 0 ? attemptedAt : (previous?.lastGoodTimestamp || previous?.timestamp || null),
    prices, gold18K, usdtPrice: usdt, dollarPrice,
    goldChange: num(prices.XAUT?.change), dollarChange: num(prices.USDT?.change),
    derivedStale: {
      gold18K: Boolean(prices.XAUT?.stale || prices.USDT?.stale),
      dollar: Boolean(prices.USDT?.stale)
    },
    market,
    hasError: errors.length > 0,
    errorCount: errors.length,
    errorDetails: errors,
    successfulSources,
    successfulLocalSources
  };

  // If every upstream source failed and we have a prior snapshot, keep the prior
  // published snapshot time. This prevents stale fallback values looking fresh.
  if (successfulSources === 0 && hasAnyPreviousData) {
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
  const row = buildHistoryRow(attemptedAt, prices, gold18K, dollarPrice, market);
  if (Object.keys(row).length > 1) kept.push(row);
  const compactedHistory = compactDailySnapshots(kept, MAX_SNAPSHOTS_PER_DAY);
  writeJSONAtomic(dailyFile, compactedHistory);

  const meta = {
    version: 5, lastAttempt: attemptedAt, lastUpdate: latest.timestamp,
    retentionDays: HISTORY_KEEP_DAYS, gold18K, usdtPrice: usdt, dollarPrice,
    marketSummary: Object.fromEntries(Object.entries(market).map(([key, item]) => [key, {
      last: item.last, change: item.change, delayed: Boolean(item.delayed), stale: Boolean(item.stale), timestamp: item.timestamp || null
    }])),
    hasError: errors.length > 0, errorCount: errors.length, errors,
    successfulSources, successfulLocalSources
  };
  writeJSONAtomic(path.join(DATA_DIR, 'meta.json'), meta);
  cleanupHistoryFiles(new Date(attemptedAt));

  console.log(`✅ Updated latest.json and ${today}.json; successful=${successfulSources}; failed=${errors.length}.`);
  if (successfulSources === 0) {
    console.error('❌ All upstream requests failed. Snapshot timestamp was preserved to avoid presenting stale values as fresh.');
    // Snapshot/meta are useful diagnostics, but let Actions report a failed refresh.
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error('❌ Collector failed:', error?.stack || error);
  process.exitCode = 1;
});
