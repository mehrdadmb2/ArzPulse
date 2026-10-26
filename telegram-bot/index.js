// ArzPulse Telegram Bot Worker — resilient edition (Cloudflare Workers, no dependencies).
// Deploy this file to the existing `arzpulse-bot` Worker. Keep ../worker/index.js as
// the separate market-data updater Worker; do not replace that updater with this file.
'use strict';

const DATA_URL = 'https://mehrdadmb2.github.io/ArzPulse/data/latest.json';
const HISTORY_BASE = 'https://mehrdadmb2.github.io/ArzPulse/data/history/';
const QUICKCHART_API = 'https://quickchart.io/chart';
const DEFAULT_STALE_MINUTES = 15;
const MAX_HISTORY_DAYS = 30;
const MAX_CHANNELS = 50;
const TELEGRAM_TEXT_LIMIT = 3800;
// Keep a normal webhook task comfortably below Cloudflare waitUntil’s post-response window.
const QUICKCHART_TIMEOUT_MS = 7500;
const HTTP_TIMEOUT_MS = 3500;
const REFRESH_LOCK_KEY = 'bot:refresh-lock:v1';
const REFRESH_LOCK_SECONDS = 240;
const CHANNELS_KEY = 'channels'; // Keep the existing KV key for backwards compatibility.
const ALERT_SUBSCRIBERS_KEY = 'alerts:subscribers:v1';
const ALERT_STATE_KEY = 'alerts:state:v2'; // Consolidated rolling state reduces KV writes on each five-minute tick.
const ALERT_SNAPSHOT_KEY = 'alerts:last-snapshot:v1'; // Read only for one-time legacy migration.
const ALERT_HISTORY_KEY = 'alerts:history:v1'; // Read only for one-time legacy migration.
const ALERT_COOLDOWNS_KEY = 'alerts:cooldowns:v1';
const MAX_ALERT_RECIPIENTS = 100;
const ALERT_MAX_EVENTS_PER_RUN = 6;
const ALERT_SNAPSHOT_MAX_AGE_MS = 20 * 60 * 1000;
const GLOBAL_CRYPTOS = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','LINK','AVAX','DOT','LTC','BCH','SHIB','UNI','NEAR','SUI','XLM','ETC','ATOM','APT','FIL','ARB','OP','HBAR','INJ','AAVE','PEPE'];
const GLOBAL_CRYPTO_NAMES = { BTC:'بیت‌کوین', ETH:'اتریوم', BNB:'بایننس کوین', SOL:'سولانا', XRP:'ریپل', ADA:'کاردانو', DOGE:'دوج‌کوین', TRX:'ترون', LINK:'چین‌لینک', AVAX:'آوالانچ', DOT:'پولکادات', LTC:'لایت‌کوین', BCH:'بیت‌کوین کش', SHIB:'شیبا اینو', UNI:'یونی‌سواپ', NEAR:'نیر', SUI:'سویی', XLM:'استلار', ETC:'اتریوم کلاسیک', ATOM:'کازموس', APT:'آپتوس', FIL:'فایل‌کوین', ARB:'آربیتروم', OP:'آپتیمیسم', HBAR:'هدرا', INJ:'اینجکتیو', AAVE:'آوه', PEPE:'پپه' };

const COLORS = {
  BTC: { line: '#f7931a', fill: 'rgba(247,147,26,0.18)', name: 'Bitcoin', fa: 'بیت‌کوین' },
  ETH: { line: '#627eea', fill: 'rgba(98,126,234,0.18)', name: 'Ethereum', fa: 'اتریوم' },
  USDT: { line: '#26a17b', fill: 'rgba(38,161,123,0.18)', name: 'Tether', fa: 'تتر' },
  NOT: { line: '#a855f7', fill: 'rgba(168,85,247,0.18)', name: 'Notcoin', fa: 'نات‌کوین' },
  GOLD: { line: '#fbbf24', fill: 'rgba(251,191,36,0.18)', name: '18K Gold', fa: 'طلای ۱۸ عیار' },
  DOLLAR: { line: '#34d399', fill: 'rgba(52,211,153,0.18)', name: 'Dollar / USDT', fa: 'دلار / تتر' },
  BNB:{line:'#f3ba2f',fill:'rgba(243,186,47,0.18)',name:'BNB Chain',fa:'بایننس کوین'}, SOL:{line:'#916cff',fill:'rgba(145,108,255,0.18)',name:'Solana',fa:'سولانا'},
  XRP:{line:'#52beeb',fill:'rgba(82,190,235,0.18)',name:'XRP',fa:'ریپل'}, ADA:{line:'#306fdb',fill:'rgba(48,111,219,0.18)',name:'Cardano',fa:'کاردانو'}, DOGE:{line:'#c5a45e',fill:'rgba(197,164,94,0.18)',name:'Dogecoin',fa:'دوج‌کوین'},
  TRX:{line:'#ef3a4d',fill:'rgba(239,58,77,0.18)',name:'TRON',fa:'ترون'}, LINK:{line:'#3068d6',fill:'rgba(48,104,214,0.18)',name:'Chainlink',fa:'چین‌لینک'}, AVAX:{line:'#e84154',fill:'rgba(232,65,84,0.18)',name:'Avalanche',fa:'آوالانچ'}, DOT:{line:'#e64199',fill:'rgba(230,65,153,0.18)',name:'Polkadot',fa:'پولکادات'}, LTC:{line:'#a4b2c0',fill:'rgba(164,178,192,0.18)',name:'Litecoin',fa:'لایت‌کوین'}, BCH:{line:'#86c46c',fill:'rgba(134,196,108,0.18)',name:'Bitcoin Cash',fa:'بیت‌کوین کش'}, SHIB:{line:'#f37084',fill:'rgba(243,112,132,0.18)',name:'Shiba Inu',fa:'شیبا اینو'},
  UNI:{line:'#ff007a',fill:'rgba(255,0,122,0.18)',name:'Uniswap',fa:'یونی‌سواپ'}, NEAR:{line:'#5bc8bc',fill:'rgba(91,200,188,0.18)',name:'NEAR Protocol',fa:'نیر'}, SUI:{line:'#58acff',fill:'rgba(88,172,255,0.18)',name:'Sui',fa:'سویی'}, XLM:{line:'#756feb',fill:'rgba(117,111,235,0.18)',name:'Stellar',fa:'استلار'}, ETC:{line:'#3e70aa',fill:'rgba(62,112,170,0.18)',name:'Ethereum Classic',fa:'اتریوم کلاسیک'}, ATOM:{line:'#62a4dd',fill:'rgba(98,164,221,0.18)',name:'Cosmos',fa:'کازموس'}, APT:{line:'#42abf4',fill:'rgba(66,171,244,0.18)',name:'Aptos',fa:'آپتوس'}, FIL:{line:'#0085ff',fill:'rgba(0,133,255,0.18)',name:'Filecoin',fa:'فایل‌کوین'}, ARB:{line:'#2b74dc',fill:'rgba(43,116,220,0.18)',name:'Arbitrum',fa:'آربیتروم'}, OP:{line:'#ff0420',fill:'rgba(255,4,32,0.18)',name:'Optimism',fa:'آپتیمیسم'}, HBAR:{line:'#8259d6',fill:'rgba(130,89,214,0.18)',name:'Hedera',fa:'هدرا'}, INJ:{line:'#00b3ff',fill:'rgba(0,179,255,0.18)',name:'Injective',fa:'اینجکتیو'}, AAVE:{line:'#b055cf',fill:'rgba(176,85,207,0.18)',name:'Aave',fa:'آوه'}, PEPE:{line:'#43b581',fill:'rgba(67,181,129,0.18)',name:'Pepe',fa:'پپه'}
};

const recentUpdateIds = new Map();

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numeric(value) {
  if (typeof value === 'string') value = value.replace(/,/g, '').trim();
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function positive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }

function formatNumber(value, maximumFractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString('fa-IR', { maximumFractionDigits, useGrouping: true }).replace(/,/g, '٬');
}

function formatPrice(value) {
  return positive(value) ? formatNumber(value, 2) : '—';
}

// Local market prices are stored in IRR. Derive an approximate USD value from
// the same snapshot's USDT/IRR quote; never label the conversion as an official FX rate.
function getUsdtIrrRate(data) {
  const rate = numeric(data?.usdtPrice || data?.dollarPrice || data?.prices?.USDT?.bestSell);
  return positive(rate) ? rate : 0;
}

function formatUsd(value, usdtIrrRate) {
  const amount = numeric(value);
  if (!positive(amount) || !positive(usdtIrrRate)) return '—';
  return `$${formatNumber(amount / usdtIrrRate, 8)}`;
}

function formatDualPrice(value, usdtIrrRate) {
  if (!positive(value)) return '—';
  const usd = formatUsd(value, usdtIrrRate);
  return `${formatPrice(value)} IRR${usd !== '—' ? `  |  ${usd}` : ''}`;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toLocaleString('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function changeMark(value) {
  const number = numeric(value);
  if (number > 0) return '🟢 ▲';
  if (number < 0) return '🔴 ▼';
  return '⚪ •';
}

function getSymbolName(symbol) {
  return COLORS[symbol]?.fa || ({
    XAUT: 'تتر گلد', BRENT: 'نفت برنت', WTI: 'نفت WTI', XAUUSD: 'انس جهانی طلا',
    SILVER: 'نقره', SP500: 'شاخص S&P 500', NASDAQ: 'شاخص نزدک', DXY: 'شاخص دلار', ...GLOBAL_CRYPTO_NAMES
  })[symbol] || symbol;
}

function currentStaleMinutes(env) {
  return clampInt(env.DATA_STALE_MINUTES, DEFAULT_STALE_MINUTES, 5, 180);
}

function isDataStale(data, env) {
  const timestamp = Date.parse(data?.timestamp || '');
  if (!Number.isFinite(timestamp)) return true;
  if (Date.now() - timestamp < -5 * 60 * 1000) return true;
  return Date.now() - timestamp > currentStaleMinutes(env) * 60 * 1000;
}

function ageText(timestamp) {
  const value = Date.parse(timestamp || '');
  if (!Number.isFinite(value)) return 'نامشخص';
  const age = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (age < 1) return 'کمتر از یک دقیقه';
  if (age < 60) return `${formatNumber(age, 0)} دقیقه`;
  const hours = Math.floor(age / 60);
  const minutes = age % 60;
  return `${formatNumber(hours, 0)} ساعت و ${formatNumber(minutes, 0)} دقیقه`;
}

function formatTime(timestamp) {
  const value = Date.parse(timestamp || '');
  if (!Number.isFinite(value)) return 'نامشخص';
  return new Date(value).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Request timeout'), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLatestData() {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const separator = DATA_URL.includes('?') ? '&' : '?';
      const response = await fetchWithTimeout(`${DATA_URL}${separator}t=${Date.now()}`, {
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Market data HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data !== 'object' || (!data.prices && !data.market)) throw new Error('Market data has an unexpected JSON shape');
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  console.error('[market-data] fetch failed:', lastError?.message || 'unknown error');
  return null;
}

async function telegramApi(method, token, payload, timeoutMs = HTTP_TIMEOUT_MS) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, timeoutMs);
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    const description = result?.description || `Telegram API HTTP ${response.status}`;
    console.error(`[telegram:${method}]`, response.status, description);
    throw new Error(description);
  }
  return result.result;
}

async function sendMessage(chatId, text, token, options = {}) {
  const safeText = String(text || '—');
  const chunks = splitPlainHtmlMessage(safeText, TELEGRAM_TEXT_LIMIT);
  let lastMessageId = false;
  for (const chunk of chunks) {
    try {
      const result = await telegramApi('sendMessage', token, {
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
      lastMessageId = result?.message_id || false;
    } catch (error) {
      // One controlled fallback for invalid/unbalanced Telegram HTML. Other errors
      // (blocked bot, rate limit, timeout, missing chat) must not be disguised.
      if (/can't parse entities|parse entities|unsupported (?:start|end) tag|can't find end of the entity/i.test(error.message)) {
        try {
          const plain = htmlToPlainText(chunk);
          const result = await telegramApi('sendMessage', token, {
            chat_id: chatId,
            text: plain || 'پیام آماده شد اما قالب‌بندی آن قابل نمایش نبود.',
            disable_web_page_preview: true,
            ...options
          });
          lastMessageId = result?.message_id || false;
          console.warn('[sendMessage] HTML parse failed; plain-text fallback succeeded.');
          continue;
        } catch (fallbackError) {
          console.error('[sendMessage] plain-text fallback failed:', fallbackError.message);
          return false;
        }
      }
      console.error('[sendMessage] failed:', error.message);
      return false;
    }
  }
  return lastMessageId;
}

function htmlToPlainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|blockquote|pre|div|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitPlainHtmlMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];
  // Split by complete paragraphs first so Telegram markup tags usually remain balanced.
  const blocks = String(text).split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const block of blocks) {
    if (!block) continue;
    if (block.length > maxLength) {
      if (current) { chunks.push(current); current = ''; }
      const pre = block.match(/^<pre><code>([\s\S]*)<\/code><\/pre>$/i);
      if (pre) {
        const lines = pre[1].split('\n');
        let part = '';
        for (const line of lines) {
          const next = part ? `${part}\n${line}` : line;
          if (next.length > maxLength - 32 && part) {
            chunks.push(`<pre><code>${part}</code></pre>`);
            part = line;
          } else part = next;
        }
        if (part) chunks.push(`<pre><code>${part}</code></pre>`);
      } else {
        // Last-resort split. sendMessage’s parse-error fallback will safely render plain text.
        for (let i = 0; i < block.length; i += maxLength - 16) chunks.push(block.slice(i, i + maxLength - 16));
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= maxLength) current = candidate;
    else { chunks.push(current); current = block; }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, maxLength)];
}

async function editMessage(chatId, messageId, text, token) {
  if (!messageId) return false;
  const safeText = String(text || '—');
  try {
    await telegramApi('editMessageText', token, {
      chat_id: chatId, message_id: messageId, text: safeText,
      parse_mode: 'HTML', disable_web_page_preview: true
    });
    return true;
  } catch (error) {
    if (/message is not modified/i.test(error.message)) return true;
    if (/can't parse entities|parse entities|unsupported (?:start|end) tag|can't find end of the entity/i.test(error.message)) {
      try {
        await telegramApi('editMessageText', token, {
          chat_id: chatId, message_id: messageId, text: htmlToPlainText(safeText) || '—',
          disable_web_page_preview: true
        });
        console.warn('[editMessage] HTML parse failed; plain-text fallback succeeded.');
        return true;
      } catch (fallbackError) {
        if (/message is not modified/i.test(fallbackError.message)) return true;
        console.error('[editMessage] plain-text fallback failed:', fallbackError.message);
        return false;
      }
    }
    console.error('[editMessage] failed:', error.message);
    return false;
  }
}

async function getChannelSettings(env) {
  if (!env.SETTINGS_KV) return [];
  try {
    const result = await env.SETTINGS_KV.get(CHANNELS_KEY, { type: 'json', cacheTtl: 30 });
    if (result == null) return [];
    if (!Array.isArray(result)) throw new Error('The stored channels value is not a JSON array.');
    return [...new Set(result.map((id) => String(id)).filter((id) => /^-?\d+$/.test(id)))].slice(0, MAX_CHANNELS);
  } catch (error) {
    console.error('[kv] channels read failed:', error.message);
    // Never report a KV quota/network failure as an empty subscription list.
    throw new Error(`Cloudflare KV could not read channel settings: ${error.message}`);
  }
}

async function saveChannelSettings(env, channels) {
  if (!env.SETTINGS_KV) throw new Error('The SETTINGS_KV binding is missing in Cloudflare Worker settings');
  const normalized = [...new Set(channels.map((id) => String(id)).filter((id) => /^-?\d+$/.test(id)))].slice(0, MAX_CHANNELS);
  // One small KV value; market history is not stored in KV.
  await env.SETTINGS_KV.put(CHANNELS_KEY, JSON.stringify(normalized));
}

async function getAlertPreferences(env) {
  if (!env.SETTINGS_KV) throw new Error('SETTINGS_KV binding is missing');
  try {
    const value = await env.SETTINGS_KV.get(ALERT_SUBSCRIBERS_KEY, { type: 'json' });
    if (!value) return {};
    if (Array.isArray(value)) return Object.fromEntries(value.map((id) => [String(id), { enabled: true, level: 'medium' }]));
    if (typeof value !== 'object') throw new Error('Alert preferences are not a JSON object');
    return value;
  } catch (error) {
    console.error('[alerts:kv] preferences read failed:', error.message);
    throw new Error(`Could not read alert preferences from KV: ${error.message}`);
  }
}

async function saveAlertPreferences(env, preferences) {
  if (!env.SETTINGS_KV) throw new Error('SETTINGS_KV binding is missing');
  const normalized = {};
  for (const [id, value] of Object.entries(preferences || {}).slice(0, MAX_ALERT_RECIPIENTS * 2)) {
    if (!/^-?\d+$/.test(String(id)) || !value || typeof value !== 'object') continue;
    const level = ['low', 'medium', 'high'].includes(value.level) ? value.level : 'medium';
    normalized[String(id)] = { enabled: value.enabled !== false, level, updatedAt: value.updatedAt || new Date().toISOString() };
  }
  await env.SETTINGS_KV.put(ALERT_SUBSCRIBERS_KEY, JSON.stringify(normalized));
}

function alertLevelNumber(level) {
  return ({ low: 1, medium: 2, high: 3 })[String(level || 'medium').toLowerCase()] || 2;
}

async function getAlertRecipients(env) {
  if (!env.SETTINGS_KV || !env.TELEGRAM_BOT_TOKEN) return [];
  const [channels, preferences] = await Promise.all([getChannelSettings(env), getAlertPreferences(env)]);
  const recipients = new Map();
  for (const chatId of channels) {
    const preference = preferences[String(chatId)];
    if (preference?.enabled === false) continue;
    recipients.set(String(chatId), { chatId: String(chatId), level: preference?.level || 'medium', kind: 'channel' });
  }
  for (const [chatId, preference] of Object.entries(preferences)) {
    if (!/^-?\d+$/.test(chatId) || preference?.enabled !== true) continue;
    recipients.set(chatId, { chatId, level: preference.level || 'medium', kind: 'subscriber' });
  }
  return [...recipients.values()].slice(0, MAX_ALERT_RECIPIENTS);
}

function makeAlertSnapshot(data) {
  const metrics = {};
  const attemptedAt = data?.timestamp || new Date().toISOString();
  const addPrice = (id, symbol, item, kind, currency, name) => {
    if (!item || item.stale) return;
    const price = numeric(item.lastPrice ?? item.latest ?? item.last ?? item.price ?? item.close);
    if (!positive(price)) return;
    metrics[id] = {
      id, symbol, name: name || symbol, kind, currency, price,
      change24: Number.isFinite(Number(item.change)) ? Number(item.change) : null,
      high: numeric(item.high ?? item.dayHigh ?? item.highPrice),
      low: numeric(item.low ?? item.dayLow ?? item.lowPrice),
      volume: numeric(item.volume ?? item.volumeUsd ?? item.quoteVolume),
      volumeUsd: numeric(item.volumeUsd ?? item.quoteVolume),
      trades: numeric(item.trades ?? item.count),
      source: String(item.source || (kind === 'crypto' ? 'Global crypto' : kind === 'local' ? 'Local market' : 'Market data')),
      timestamp: item.fetchedAt || item.timestamp || attemptedAt
    };
  };
  for (const [symbol, item] of Object.entries(data?.prices || {})) {
    const cat = ['USDT', 'XAUT', 'BTC', 'ETH', 'NOT'].includes(symbol) ? (['BTC', 'ETH', 'NOT'].includes(symbol) ? 'crypto' : 'local') : 'local';
    addPrice(`local:${symbol}`, symbol, item, cat, 'IRR', `${getSymbolName(symbol)} · بازار داخلی`);
  }
  for (const [symbol, item] of Object.entries(data?.market || {})) {
    addPrice(`market:${symbol}`, symbol, item, ['BRENT', 'WTI', 'XAUUSD', 'SILVER'].includes(symbol) ? 'commodity' : 'index', 'USD', getSymbolName(symbol));
  }
  for (const [symbol, item] of Object.entries(data?.globalCrypto || {})) {
    addPrice(`global:${symbol}`, symbol, item, 'crypto', 'USD', `${GLOBAL_CRYPTO_NAMES[symbol] || symbol} · بازار جهانی`);
  }

  const context = data?.marketContext || {};
  const indicators = {};
  const global = context.global;
  if (global && !global.stale && positive(global.totalMarketCapUsd)) {
    indicators.marketCap = { value: numeric(global.totalMarketCapUsd), change24: numeric(global.marketCapChange24h), timestamp: global.timestamp || global.fetchedAt || attemptedAt, source: global.source || 'Global crypto stats' };
  }
  const fg = context.fearGreed;
  if (fg && !fg.stale && Number.isFinite(Number(fg.value))) {
    indicators.fearGreed = { value: numeric(fg.value), classification: String(fg.classification || 'Unknown'), timestamp: fg.timestamp || fg.fetchedAt || attemptedAt, source: fg.source || 'Alternative.me' };
  }
  const derivatives = context.derivatives || {};
  for (const symbol of ['BTC', 'ETH']) {
    const item = derivatives[symbol];
    if (!item || item.stale) continue;
    if (Number.isFinite(Number(item.fundingRate))) indicators[`${symbol.toLowerCase()}Funding`] = { value: numeric(item.fundingRate), timestamp: item.timestamp || item.fetchedAt || attemptedAt, source: item.source || 'Binance USD-M Futures' };
    if (symbol === 'BTC' && positive(item.openInterestUsd)) indicators.btcOpenInterest = { value: numeric(item.openInterestUsd), timestamp: item.openInterestTimestamp || item.timestamp || attemptedAt, source: item.source || 'Binance USD-M Futures' };
  }
  const crypto = Object.values(data?.globalCrypto || {}).filter((item) => item && !item.stale && Number.isFinite(Number(item.change)) && positive(item.last));
  const up = crypto.filter((item) => Number(item.change) >= 2).length;
  const down = crypto.filter((item) => Number(item.change) <= -2).length;
  const total = crypto.length;
  const breadth = { total, up, down, upShare: total ? up / total : 0, downShare: total ? down / total : 0, timestamp: attemptedAt };
  return { timestamp: attemptedAt, metrics, indicators, breadth };
}

function getAlertMoveThreshold(metric, env) {
  if (metric.kind === 'crypto') return numeric(env.ALERT_CRYPTO_MOVE_PCT) || 0.85;
  if (metric.kind === 'local') return numeric(env.ALERT_LOCAL_MOVE_PCT) || 0.45;
  return numeric(env.ALERT_MACRO_MOVE_PCT) || 0.55;
}

function getAlertDailyThreshold(metric) {
  if (metric.kind === 'crypto') return 3;
  if (metric.kind === 'local') return 1.5;
  return 1.25;
}

function alertImpactText(metric, direction, type) {
  if (type === 'funding') return metric.symbol === 'BTC' || metric.symbol === 'ETH'
    ? 'Funding بسیار مثبت معمولاً به معنی هزینهٔ بیشتر نگهداری موقعیت لانگ است؛ Funding منفی می‌تواند برعکس باشد. این شاخص به‌تنهایی جهت بازار را پیش‌بینی نمی‌کند.'
    : 'Funding یک شاخص موقعیت‌گیری بازار مشتقه است و به‌تنهایی جهت بعدی قیمت را تعیین نمی‌کند.';
  if (type === 'open-interest') return 'افزایش Open Interest یعنی ارزش/حجم قراردادهای باز بیشتر شده؛ بدون ترکیب با قیمت و حجم، مشخص نمی‌کند کدام سمت معامله‌گران غالب است.';
  if (type === 'sentiment') return 'تغییر سریع احساسات می‌تواند با افزایش نوسان و تغییر رفتار معامله‌گران همراه شود؛ شاخص ترس‌وطمع سیگنال قطعی خریدوفروش نیست.';
  if (type === 'breadth') return 'هم‌جهت شدن تعداد زیادی از رمزارزها می‌تواند نشانهٔ حرکت فراگیر بازار باشد و ریسک هم‌بستگی سبد را افزایش دهد.';
  if (type === 'market-cap') return 'تغییر قابل‌توجه ارزش کل بازار به‌معنای حرکت در سطح کلان است؛ ترکیب آن با حجم، دامیننس و نقدشوندگی مهم است.';
  if (metric.kind === 'local') return 'این حرکت می‌تواند قیمت‌گذاری ریالی و معادل دلاری دارایی را جابه‌جا کند. نرخ تبدیل بر پایهٔ USDT/IRR پروژه تخمینی است و لزوماً نرخ اسکناس آزاد نیست.';
  if (metric.kind === 'commodity' || metric.kind === 'index') return 'این حرکت می‌تواند بر دارایی‌های مرتبط و جوّ ریسک بازار اثر بگذارد؛ ساعت معاملاتی، تأخیر منبع و سایر عوامل کلان را هم بررسی کن.';
  return direction === 'down'
    ? 'افت سریع می‌تواند با افزایش نوسان، لیکوییدیشن یا تغییر جریان نقدینگی همراه شود؛ برای نتیجه‌گیری، حجم، دامیننس و بازار مشتقه را هم بررسی کن.'
    : 'جهش سریع می‌تواند با افزایش نوسان و ریسک دنبال‌کردن حرکت همراه شود؛ حجم، نقدشوندگی و داده‌های مشتقه را کنار قیمت بسنج.';
}

function buildAlertEvents(previous, current, env = {}) {
  const events = [];
  const priorMetrics = previous?.metrics || {};
  for (const [id, metric] of Object.entries(current.metrics || {})) {
    const before = priorMetrics[id];
    if (!before || !positive(before.price) || !positive(metric.price)) continue;
    const move = ((metric.price - before.price) / before.price) * 100;
    const absMove = Math.abs(move);
    const threshold = getAlertMoveThreshold(metric, env);
    if (absMove >= threshold) {
      const severity = absMove >= Math.max(threshold * 3.2, metric.kind === 'crypto' ? 2.8 : 1.8) ? 3 : absMove >= threshold * 1.8 ? 2 : 1;
      events.push({
        id: `shock:${id}`, cooldownKey: `move:${id}`, type: 'shock', severity,
        title: `${metric.name} (${metric.symbol}) · ${move >= 0 ? 'جهش صعودی' : 'افت سریع'}`,
        symbol: metric.symbol, metric, move, beforePrice: before.price,
        direction: move >= 0 ? 'up' : 'down', previousTimestamp: previous.timestamp,
        impact: alertImpactText(metric, move >= 0 ? 'up' : 'down', 'price-move')
      });
      continue;
    }
    const dailyThreshold = getAlertDailyThreshold(metric);
    const priorDaily = Number(before.change24);
    const nowDaily = Number(metric.change24);
    const priorValid = before.change24 != null && Number.isFinite(priorDaily), nowValid = metric.change24 != null && Number.isFinite(nowDaily);
    if (priorValid && nowValid && Math.abs(nowDaily) >= dailyThreshold && Math.abs(priorDaily) < dailyThreshold) {
      const severity = Math.abs(nowDaily) >= dailyThreshold * 2 ? 3 : 2;
      events.push({
        id: `daily:${id}:${nowDaily >= 0 ? 'up' : 'down'}`, cooldownKey: `daily:${id}`, type: 'daily-threshold', severity,
        title: `${metric.name} (${metric.symbol}) · عبور از آستانهٔ تغییر روزانه`,
        symbol: metric.symbol, metric, move: null, dailyChange: nowDaily,
        direction: nowDaily >= 0 ? 'up' : 'down', previousTimestamp: previous.timestamp,
        impact: alertImpactText(metric, nowDaily >= 0 ? 'up' : 'down', 'daily-threshold')
      });
    }
  }

  const oldIndicators = previous?.indicators || {};
  const indicators = current.indicators || {};
  const oldFg = oldIndicators.fearGreed, fg = indicators.fearGreed;
  if (oldFg && fg && Math.abs(Number(fg.value) - Number(oldFg.value)) >= 15) {
    const delta = Number(fg.value) - Number(oldFg.value);
    events.push({ id: 'sentiment:shift', cooldownKey: 'sentiment:shift', type: 'sentiment', severity: Math.abs(delta) >= 25 ? 3 : 2,
      title: 'تغییر شدید شاخص ترس و طمع', symbol: 'F&G', move: delta, metric: { name: 'Fear & Greed', symbol: 'F&G', kind: 'indicator', price: fg.value, source: fg.source, currency: 'points' },
      details: `مقدار شاخص از ${formatNumber(oldFg.value, 0)} به ${formatNumber(fg.value, 0)} رسیده است (${delta > 0 ? '+' : ''}${formatNumber(delta, 0)} واحد).`, impact: alertImpactText({ symbol: 'F&G' }, '', 'sentiment') });
  }
  const oldCap = oldIndicators.marketCap, cap = indicators.marketCap;
  if (oldCap && cap && Math.abs(Number(cap.change24)) >= 3 && Math.abs(Number(oldCap.change24)) < 3) {
    const delta = Number(cap.change24);
    events.push({ id: 'market-cap:threshold', cooldownKey: 'market-cap:threshold', type: 'market-cap', severity: Math.abs(delta) >= 5 ? 3 : 2,
      title: 'عبور تغییر ارزش کل بازار از ۳٪', symbol: 'TOTAL', metric: { name: 'ارزش کل بازار کریپتو', symbol: 'TOTAL', kind: 'indicator', price: cap.value, change24: delta, source: cap.source, currency: 'USD' }, dailyChange: delta,
      direction: delta >= 0 ? 'up' : 'down', impact: alertImpactText({}, '', 'market-cap') });
  }
  for (const symbol of ['BTC', 'ETH']) {
    const key = `${symbol.toLowerCase()}Funding`;
    const before = oldIndicators[key], item = indicators[key];
    if (before && item && Math.abs(Number(item.value)) >= 0.0005 && Math.abs(Number(before.value)) < 0.0005) {
      const rate = Number(item.value);
      events.push({ id: `funding:${symbol}`, cooldownKey: `funding:${symbol}`, type: 'funding', severity: Math.abs(rate) >= 0.001 ? 3 : 2,
        title: `${symbol} · نرخ Funding غیرعادی`, symbol, metric: { name: `${symbol} Funding`, symbol, kind: 'indicator', price: rate, source: item.source, currency: 'funding' },
        details: `نرخ Funding به ${(rate * 100).toFixed(4)}٪ رسیده است.`, impact: alertImpactText({ symbol }, '', 'funding') });
    }
  }
  const oldOi = oldIndicators.btcOpenInterest, oi = indicators.btcOpenInterest;
  if (oldOi && oi && positive(oldOi.value)) {
    const move = (Number(oi.value) - Number(oldOi.value)) / Number(oldOi.value) * 100;
    if (Math.abs(move) >= 8) events.push({ id: 'open-interest:btc', cooldownKey: 'open-interest:btc', type: 'open-interest', severity: Math.abs(move) >= 12 ? 3 : 2,
      title: `BTC · تغییر سریع Open Interest`, symbol: 'BTC', move, metric: { name: 'BTC Open Interest', symbol: 'BTC', kind: 'indicator', price: oi.value, source: oi.source, currency: 'USD' },
      impact: alertImpactText({ symbol: 'BTC' }, '', 'open-interest') });
  }
  const breadth = current.breadth, priorBreadth = previous?.breadth;
  if (breadth && breadth.total >= 12) {
    const side = breadth.upShare >= 0.75 ? 'up' : breadth.downShare >= 0.75 ? 'down' : null;
    const oldSide = priorBreadth?.upShare >= 0.75 ? 'up' : priorBreadth?.downShare >= 0.75 ? 'down' : null;
    if (side && side !== oldSide) {
      const count = side === 'up' ? breadth.up : breadth.down;
      events.push({ id: 'market-breadth:extreme', cooldownKey: 'market-breadth:extreme', type: 'breadth', severity: 2,
        title: side === 'up' ? 'عرض بازار: صعود فراگیر رمزارزها' : 'عرض بازار: افت فراگیر رمزارزها', symbol: 'BREADTH', direction: side,
        details: `${count} از ${breadth.total} رمزارز معتبر تغییر روزانهٔ ${side === 'up' ? 'حداقل +۲٪' : 'حداکثر −۲٪'} داشته‌اند.`, impact: alertImpactText({}, side, 'breadth') });
    }
  }
  return events.sort((a, b) => b.severity - a.severity || Math.abs(Number(b.move || b.dailyChange || 0)) - Math.abs(Number(a.move || a.dailyChange || 0)));
}

function buildWindowMoveEvents(current, history, env = {}) {
  const windows = [
    { key: '15m', label: '۱۵ دقیقه', ms: 15 * 60 * 1000, tolerance: 8 * 60 * 1000, cooldownMinutes: 25, thresholds: { crypto: 1.75, local: 0.9, commodity: 0.8, index: 0.8 } },
    { key: '1h', label: '۱ ساعت', ms: 60 * 60 * 1000, tolerance: 20 * 60 * 1000, cooldownMinutes: 60, thresholds: { crypto: 3.1, local: 1.7, commodity: 1.4, index: 1.4 } },
    { key: '6h', label: '۶ ساعت', ms: 6 * 60 * 60 * 1000, tolerance: 45 * 60 * 1000, cooldownMinutes: 120, thresholds: { crypto: 5.5, local: 3.2, commodity: 2.5, index: 2.5 } }
  ];
  const now = Date.parse(current?.timestamp || '');
  if (!Number.isFinite(now)) return [];
  const events = [];
  for (const window of windows) {
    const targetAge = window.ms;
    const candidate = (history || []).map((snapshot) => ({ snapshot, age: now - Date.parse(snapshot?.timestamp || '') }))
      .filter((row) => Number.isFinite(row.age) && row.age > 0 && Math.abs(row.age - targetAge) <= window.tolerance)
      .sort((a, b) => Math.abs(a.age - targetAge) - Math.abs(b.age - targetAge))[0]?.snapshot;
    if (!candidate) continue;
    for (const [id, metric] of Object.entries(current.metrics || {})) {
      const before = candidate.metrics?.[id];
      if (!before || !positive(before.price) || !positive(metric.price)) continue;
      const move = (Number(metric.price) - Number(before.price)) / Number(before.price) * 100;
      const threshold = window.thresholds[metric.kind] ?? window.thresholds.index;
      if (Math.abs(move) < threshold) continue;
      const severity = Math.abs(move) >= threshold * 2 ? 3 : Math.abs(move) >= threshold * 1.35 ? 2 : 1;
      events.push({
        id: `window:${id}:${window.key}`, cooldownKey: `window:${id}:${window.key}`, type: 'window-move', severity,
        title: `${metric.name} (${metric.symbol}) · حرکت ${move >= 0 ? 'صعودی' : 'نزولی'} ${window.label} اخیر`,
        symbol: metric.symbol, metric, move, beforePrice: before.price, direction: move >= 0 ? 'up' : 'down',
        periodLabel: window.label, periodKey: window.key, cooldownMinutes: window.cooldownMinutes,
        impact: alertImpactText(metric, move >= 0 ? 'up' : 'down', 'price-move')
      });
    }
  }
  return events;
}

function combinePriceMoveEvents(events) {
  const combined = [];
  const byAssetAndDirection = new Map();
  for (const event of events) {
    const isPriceMove = ['shock', 'window-move'].includes(event.type) && event.metric?.id && ['up', 'down'].includes(event.direction);
    if (!isPriceMove) { combined.push({ ...event, cooldownKeys: [event.cooldownKey].filter(Boolean) }); continue; }
    const key = `${event.metric.id}:${event.direction}`;
    const existing = byAssetAndDirection.get(key);
    const moveInfo = event.type === 'window-move'
      ? { periodLabel: event.periodLabel, move: event.move, beforePrice: event.beforePrice, cooldownKey: event.cooldownKey }
      : null;
    if (!existing) {
      const first = { ...event, cooldownKeys: [event.cooldownKey].filter(Boolean), windowMoves: moveInfo ? [moveInfo] : [] };
      byAssetAndDirection.set(key, first);
      combined.push(first);
      continue;
    }
    // Keep a sudden-move event as the primary explanation; attach timeframe
    // moves to it so one asset does not generate a burst of nearly identical alerts.
    if (event.type === 'shock' && existing.type !== 'shock') {
      const at = combined.indexOf(existing);
      const promoted = { ...event, severity: Math.max(existing.severity, event.severity), cooldownKeys: [...existing.cooldownKeys], windowMoves: [...existing.windowMoves] };
      if (event.cooldownKey && !promoted.cooldownKeys.includes(event.cooldownKey)) promoted.cooldownKeys.push(event.cooldownKey);
      if (at >= 0) combined[at] = promoted;
      byAssetAndDirection.set(key, promoted);
      continue;
    }
    if (event.cooldownKey && !existing.cooldownKeys.includes(event.cooldownKey)) existing.cooldownKeys.push(event.cooldownKey);
    if (moveInfo && !existing.windowMoves.some((row) => row.periodLabel === moveInfo.periodLabel)) existing.windowMoves.push(moveInfo);
    existing.severity = Math.max(existing.severity, event.severity);
    if (event.impact && !existing.impact) existing.impact = event.impact;
  }
  return combined;
}

function buildAlertMessage(event, data) {
  const level = event.severity >= 3 ? '🚨 بحرانی' : event.severity === 2 ? '⚠️ مهم' : '🔎 رصد';
  const sign = event.direction === 'up' ? '🟢' : event.direction === 'down' ? '🔴' : '🟠';
  const lines = [`${level} <b>ArzPulse · هشدار خودکار بازار</b>`, `${sign} <b>${html(event.title)}</b>`];
  if (event.details) lines.push(`<blockquote>${html(event.details)}</blockquote>`);
  const metric = event.metric;
  const rows = [];
  if (metric?.price != null && positive(metric.price)) {
    let shownPrice;
    if (metric.currency === 'IRR') {
      const rate = getUsdtIrrRate(data);
      shownPrice = `${formatPrice(metric.price)} ریال${rate > 0 ? ` · ${formatUsd(metric.price, rate)}` : ''}`;
    } else if (metric.currency === 'USD') shownPrice = `$${formatNumber(metric.price, metric.price < 1 ? 8 : 2)}`;
    else if (metric.currency === 'funding') shownPrice = `${(Number(metric.price) * 100).toFixed(4)}٪`;
    else if (metric.currency === 'points') shownPrice = `${formatNumber(metric.price, 0)} از ۱۰۰`;
    else shownPrice = formatNumber(metric.price, 2);
    rows.push(`قیمت/مقدار فعلی   ${shownPrice}`);
  }
  if (event.move != null && event.type === 'shock') rows.push(`تغییر از Snapshot قبلی   ${event.move > 0 ? '+' : ''}${formatNumber(event.move, 2)}٪`);
  if (event.type === 'window-move' && !event.windowMoves?.length && event.move != null) rows.push(`تغییر بازهٔ ${event.periodLabel}   ${event.move > 0 ? '+' : ''}${formatNumber(event.move, 2)}٪`);
  for (const move of event.windowMoves || []) rows.push(`تغییر ${move.periodLabel} اخیر   ${move.move > 0 ? '+' : ''}${formatNumber(move.move, 2)}٪`);
  if (event.move != null && event.type === 'open-interest') rows.push(`تغییر Open Interest   ${event.move > 0 ? '+' : ''}${formatNumber(event.move, 2)}٪`);
  if (event.dailyChange != null) rows.push(`تغییر ۲۴ساعته   ${event.dailyChange > 0 ? '+' : ''}${formatNumber(event.dailyChange, 2)}٪`);
  if (metric?.high && metric?.low && metric.high > metric.low) rows.push(`بازهٔ روز   ${formatNumber(metric.low, 4)} — ${formatNumber(metric.high, 4)}`);
  if (metric?.volumeUsd > 0) rows.push(`حجم ۲۴ساعت   ${formatCompactUsd(metric.volumeUsd)}`);
  else if (metric?.volume > 0) rows.push(`حجم   ${formatNumber(metric.volume, 2)}`);
  if (metric?.trades > 0) rows.push(`تعداد معاملات   ${formatNumber(metric.trades, 0)}`);
  if (metric?.source) rows.push(`منبع   ${html(metric.source)}`);
  if (metric?.timestamp || data?.timestamp) rows.push(`Snapshot   ${html(formatTime(metric.timestamp || data.timestamp))}`);
  if (rows.length) lines.push(`<pre><code>${rows.join('\n')}</code></pre>`);
  if (event.impact) lines.push(`<blockquote><b>برداشت بازار</b>
${html(event.impact)}</blockquote>`);
  const context = data?.marketContext || {};
  const global = context.global;
  if (global && (global.btcDominance != null || global.ethDominance != null)) {
    lines.push(`<blockquote>کانتکست: دامیننس BTC ${global.btcDominance != null ? `${formatNumber(global.btcDominance, 2)}٪` : '—'} · ETH ${global.ethDominance != null ? `${formatNumber(global.ethDominance, 2)}٪` : '—'} · ارزش کل بازار ${positive(global.totalMarketCapUsd) ? formatCompactUsd(global.totalMarketCapUsd) : '—'}</blockquote>`);
  }
  lines.push('<i>هشدار از داده‌های Snapshot ساخته شده است و توصیهٔ خرید یا فروش نیست. تأخیر منبع و نقدشوندگی را بررسی کن.</i>');
  return lines.join('\n\n');
}

async function processAutomaticAlerts(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.SETTINGS_KV) {
    console.warn('[alerts] TELEGRAM_BOT_TOKEN or SETTINGS_KV is missing; automatic alerts skipped.');
    return { sent: 0, reason: 'configuration-missing' };
  }
  const data = await fetchLatestData();
  if (!data || isDataStale(data, { ...env, DATA_STALE_MINUTES: String(Math.min(20, currentStaleMinutes(env))) })) {
    console.warn('[alerts] fresh market snapshot unavailable; retaining previous baseline.');
    return { sent: 0, reason: 'snapshot-unavailable-or-stale' };
  }
  const current = makeAlertSnapshot(data);
  let previous = null;
  let cooldowns = {};
  let alertHistory = [];
  try {
    const [state, storedCooldowns] = await Promise.all([
      env.SETTINGS_KV.get(ALERT_STATE_KEY, { type: 'json' }),
      env.SETTINGS_KV.get(ALERT_COOLDOWNS_KEY, { type: 'json' })
    ]);
    cooldowns = storedCooldowns && typeof storedCooldowns === 'object' ? storedCooldowns : {};
    if (state && state.version === 2 && state.snapshot) {
      previous = state.snapshot;
      alertHistory = Array.isArray(state.history) ? state.history : [];
    } else {
      // Migrate the split v1 keys only if the consolidated v2 state is not present.
      // This keeps existing deployments' baselines and rolling history intact.
      [previous, alertHistory] = await Promise.all([
        env.SETTINGS_KV.get(ALERT_SNAPSHOT_KEY, { type: 'json' }),
        env.SETTINGS_KV.get(ALERT_HISTORY_KEY, { type: 'json' })
      ]);
      if (!Array.isArray(alertHistory)) alertHistory = [];
    }
  } catch (error) {
    console.error('[alerts:kv] baseline read failed:', error.message);
    throw new Error(`Automatic alerts paused because KV read failed: ${error.message}`);
  }
  const snapshotGap = previous?.timestamp ? Date.parse(current.timestamp) - Date.parse(previous.timestamp) : 0;
  const gapTooLong = !Number.isFinite(snapshotGap) || snapshotGap <= 0 || snapshotGap > ALERT_SNAPSHOT_MAX_AGE_MS;
  const hasNewSnapshot = !previous?.timestamp || Date.parse(current.timestamp) > Date.parse(previous.timestamp);
  if (!hasNewSnapshot) return { sent: 0, reason: 'snapshot-unchanged' };
  if (!previous || gapTooLong) {
    await env.SETTINGS_KV.put(ALERT_STATE_KEY, JSON.stringify({ version: 2, snapshot: current, history: [current] }));
    console.log(`[alerts] baseline ${previous ? 'reset after long gap' : 'seeded'} at ${current.timestamp}; no initial alerts sent.`);
    return { sent: 0, reason: previous ? 'baseline-reset' : 'baseline-seeded' };
  }

  const historyCutoff = Date.parse(current.timestamp) - (6 * 60 * 60 * 1000 + 50 * 60 * 1000);
  const retainedHistory = alertHistory.filter((snapshot) => {
    const stamp = Date.parse(snapshot?.timestamp || '');
    return Number.isFinite(stamp) && stamp >= historyCutoff && stamp < Date.parse(current.timestamp);
  });
  const nextHistory = [...retainedHistory, current].slice(-80);
  const events = [...buildAlertEvents(previous, current, env), ...buildWindowMoveEvents(current, retainedHistory, env)]
    .sort((a, b) => b.severity - a.severity || Math.abs(Number(b.move || b.dailyChange || 0)) - Math.abs(Number(a.move || a.dailyChange || 0)))
    .slice(0, ALERT_MAX_EVENTS_PER_RUN * 8);
  const persistBaseline = async () => env.SETTINGS_KV.put(
    ALERT_STATE_KEY,
    JSON.stringify({ version: 2, snapshot: current, history: nextHistory })
  );
  if (!events.length) {
    await persistBaseline();
    return { sent: 0, reason: 'no-threshold-crossings' };
  }
  const now = Date.now();
  const cooldownMs = Math.max(15, Math.min(240, Number.parseInt(env.ALERT_COOLDOWN_MINUTES || '25', 10) || 25)) * 60 * 1000;
  const readyRaw = events.filter((event) => now - Number(cooldowns[event.cooldownKey] || 0) >= Math.max(cooldownMs, Number(event.cooldownMinutes || 0) * 60 * 1000));
  if (!readyRaw.length) {
    await persistBaseline();
    return { sent: 0, reason: 'cooldown' };
  }
  const ready = combinePriceMoveEvents(readyRaw)
    .sort((a, b) => b.severity - a.severity || Math.abs(Number(b.move || b.dailyChange || 0)) - Math.abs(Number(a.move || a.dailyChange || 0)))
    .slice(0, ALERT_MAX_EVENTS_PER_RUN);
  const recipients = await getAlertRecipients(env);
  if (!recipients.length) {
    // Keep the baseline current when no destinations exist; enabling alerts later
    // must not deliver a backlog of historical moves.
    await persistBaseline();
    console.log('[alerts] thresholds crossed but no alert destinations are enabled. Use /alertson in a private chat or keep a /setchannel destination enabled.');
    return { sent: 0, reason: 'no-recipients' };
  }
  const eligibleEvents = ready.filter((event) => recipients.some((recipient) => event.severity >= alertLevelNumber(recipient.level)));
  if (!eligibleEvents.length) {
    await persistBaseline();
    return { sent: 0, reason: 'filtered-by-recipient-level' };
  }

  let sendCount = 0;
  const newCooldowns = { ...cooldowns };
  for (const event of eligibleEvents) {
    const message = buildAlertMessage(event, data);
    let delivered = 0;
    for (const recipient of recipients) {
      if (event.severity < alertLevelNumber(recipient.level)) continue;
      try {
        const result = await sendMessage(recipient.chatId, message, env.TELEGRAM_BOT_TOKEN);
        if (result) { delivered += 1; sendCount += 1; }
      } catch (error) {
        console.error(`[alerts] send failed for ${recipient.chatId} (${event.id}):`, error.message);
      }
    }
    if (delivered > 0) for (const key of (event.cooldownKeys || [event.cooldownKey]).filter(Boolean)) newCooldowns[key] = now;
  }
  // Retain only active cooldown entries; avoid unbounded KV growth.
  for (const [key, value] of Object.entries(newCooldowns)) if (now - Number(value || 0) > 7 * 86400000) delete newCooldowns[key];
  const cooldownsJson = JSON.stringify(newCooldowns);
  if (cooldownsJson !== JSON.stringify(cooldowns)) await env.SETTINGS_KV.put(ALERT_COOLDOWNS_KEY, cooldownsJson);
  // If every send failed, leave the previous baseline in place so the same alert
  // can be retried on the next scheduled run instead of silently disappearing.
  if (sendCount > 0) await persistBaseline();
  console.log(`[alerts] ${sendCount} alert message(s) sent from ${eligibleEvents.length} eligible event(s) to ${recipients.length} destination(s).`);
  return { sent: sendCount, events: eligibleEvents.length };
}

function alertsHelpMessage(preference, isChannel) {
  const enabled = preference?.enabled === true || (isChannel && preference?.enabled !== false);
  const level = ['low', 'medium', 'high'].includes(preference?.level) ? preference.level : 'medium';
  const levelFa = ({ low: 'همه هشدارها', medium: 'مهم و بحرانی', high: 'فقط بحرانی' })[level];
  return [
    '🛰 <b>ArzPulse · تنظیم هشدارهای خودکار</b>',
    `<blockquote>وضعیت این چت: <b>${enabled ? 'فعال' : 'غیرفعال'}</b> · حساسیت: <b>${levelFa}</b></blockquote>`,
    '<b>چه چیزی هشدار می‌دهد؟</b>',
    '• جهش/افت غیرمعمول بین Snapshotها با زمان، قیمت، تغییر، حجم، منبع و توضیح ریسک',
    '• عبور تغییر ۲۴ساعته از آستانهٔ مهم',
    '• تغییر شدید Fear & Greed یا ارزش کل بازار',
    '• Funding غیرعادی، تغییر سریع Open Interest و حرکت فراگیر رمزارزها',
    '',
    `<pre><code>/alertson          فعال‌سازی برای این چت
/alertsoff         غیرفعال‌سازی هشدار این چت
/alertlevel low    همه هشدارها
/alertlevel medium مهم و بحرانی
/alertlevel high   فقط بحرانی
/alerts            وضعیت و راهنما</code></pre>`,
    '<blockquote>هشدارها با مقایسهٔ Snapshotهای متوالی، آستانه‌های قابل تنظیم و وقفهٔ ضدتکرار ساخته می‌شوند. دادهٔ کهنه باعث تولید هشدار قیمت نمی‌شود. هشدار بازار توصیهٔ سرمایه‌گذاری نیست.</blockquote>'
  ].join('\n');
}

function parseCommand(text) {
  const match = String(text || '').trim().match(/^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1].toLowerCase(), args: (match[2] || '').trim() };
}

function adminIdSet(env) {
  return new Set(String(env.BOT_ADMIN_IDS || '').split(',').map((part) => part.trim()).filter(Boolean));
}

function isConfiguredAdmin(user, env) {
  if (!user?.id) return false;
  const ids = adminIdSet(env);
  return ids.size > 0 && ids.has(String(user.id));
}

async function isChatAdmin(message, env) {
  if (isConfiguredAdmin(message.from, env)) return true;
  // channel_post updates do not always contain the posting user's ID. Only a post
  // that came from the same channel itself is accepted when no explicit ID allowlist exists.
  if (message.sender_chat?.id != null && String(message.sender_chat.id) === String(message.chat?.id)) return true;
  if (!message.from?.id || !message.chat?.id || !env.TELEGRAM_BOT_TOKEN) return false;
  try {
    const member = await telegramApi('getChatMember', env.TELEGRAM_BOT_TOKEN, {
      chat_id: message.chat.id,
      user_id: message.from.id
    });
    return ['creator', 'administrator'].includes(member?.status);
  } catch (error) {
    console.warn('[permissions] getChatMember failed:', error.message);
    return false;
  }
}

function requireAdminIdMessage() {
  return '🔐 <b>این دستور مدیریتی است.</b>\n\nبرای فعال‌سازی، شناسهٔ تلگرام مدیر را در متغیر <code>BOT_ADMIN_IDS</code> در Cloudflare Worker قرار بده. برای دیدن شناسه از دستور <code>/id</code> استفاده کن.';
}

function getWelcomeMessage() {
  return [
    '🌌 <b>ArzPulse · Market Intelligence</b>',
    '<blockquote>داده‌های بازار، نمودارهای تاریخی و گزارش‌های خودکار در یک ربات.</blockquote>',
    '',
    '<b>دستورات سریع</b>',
    `<pre><code>/prices   قیمت‌های بازار
/status   سلامت و تازگی داده
/gold     طلای ۱۸ عیار
/dollar   دلار / تتر
/btc      بیت‌کوین
/eth      اتریوم
/usdt     تتر
/not      نات‌کوین
/crypto   فهرست رمزارزهای جهانی
/macro    شاخص‌های کلان و محرک‌های بازار
/sentiment ترس‌وطمع و احساسات بازار
/alerts   تنظیم هشدار خودکار
/alertson فعال‌سازی هشدار
/chart    راهنمای نمودار
/chartall نمودارهای منتخب
/refresh  درخواست آپدیت دستی
/help     راهنمای کامل</code></pre>`,
    '<blockquote>نکته: قیمت‌ها اطلاعات بازار هستند و توصیهٔ سرمایه‌گذاری محسوب نمی‌شوند.</blockquote>',
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد ArzPulse</a>  ·  📈 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>'
  ].join('\n');
}

function getHelpMessage() {
  return [
    '📚 <b>راهنمای ArzPulse</b>',
    '<blockquote>از دستورها در چت خصوصی استفاده کن. در گروه‌ها نام ربات را هم می‌توانی اضافه کنی؛ مثل <code>/prices@ArzPulseBot</code>.</blockquote>',
    '',
    '<b>بازار</b>',
    `<pre><code>/prices
/gold
/dollar
/btc
/eth
/usdt
/not
/status
/crypto   رمزارزهای بیشتر + حجم و تغییر جهانی
/macro    احساسات، دامیننس، فاندینگ و شاخص‌های کلان
/sentiment شاخص ترس و طمع
/alerts   وضعیت و تنظیم هشدار خودکار
/alertson فعال‌سازی هشدار
/alertsoff غیرفعال‌سازی هشدار
/alertlevel low|medium|high سطح حساسیت</code></pre>`,
    '<b>نمودارهای تاریخی</b>',
    `<pre><code>/chart BTC 24h
/chart SOL 7d
/chart BNB 30d
/chart GOLD 7d
/chartall</code></pre>`,
    '<b>مدیریت و نگه‌داری</b>',
    `<pre><code>/refresh  درخواست آپدیت بازار (مدیر مجاز)
/setchannel  ثبت همین گروه/کانال برای گزارش ساعتی
/stopchannel لغو گزارش همین گروه/کانال
/id         شناسهٔ چت و کاربر</code></pre>`,
    '<blockquote>بازه‌های نمودار: <code>24h</code>، <code>7d</code> و <code>30d</code>. داده‌های منابع جهانی ممکن است با تأخیر باشند.</blockquote>',
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد</a>  ·  📈 <a href="https://t.me/ArzPulseBot">@ArzPulseBot</a>'
  ].join('\n');
}

function getChartHelpMessage() {
  return [
    '📈 <b>راهنمای نمودار</b>',
    '<blockquote>تاریخچهٔ موجود از Snapshotهای واقعی بازار ساخته می‌شود. اگر منبعی داده نداشته باشد، عدد ساختگی تولید نمی‌شود.</blockquote>',
    `<pre><code>/chart BTC 24h
/chart SOL 7d
/chart BNB 30d
/chart GOLD 7d
/chart DOLLAR 30d
/chartall</code></pre>`,
    '<b>نمادها:</b> <code>BTC · ETH · BNB · SOL · XRP · ADA · DOGE · LINK · AVAX · DOT · LTC · GOLD · DOLLAR</code>',
    '<b>بازه‌ها:</b> <code>24h · 7d · 30d</code>'
  ].join('\n');
}

function localAssetRows(data) {
  const prices = data?.prices || {};
  const definitions = [
    { symbol: 'BTC', label: 'Bitcoin', fa: 'بیت‌کوین', emoji: '₿' },
    { symbol: 'ETH', label: 'Ethereum', fa: 'اتریوم', emoji: '◆' },
    { symbol: 'USDT', label: 'Tether / USD', fa: 'تتر', emoji: '₮' },
    { symbol: 'NOT', label: 'Notcoin', fa: 'نات‌کوین', emoji: '◉' }
  ];
  return definitions.map((asset) => ({ ...asset, data: prices[asset.symbol] || null }));
}

function generatePricesMessage(data, env) {
  const stale = isDataStale(data, env);
  const usdtIrrRate = getUsdtIrrRate(data);
  const timestamp = data?.timestamp;
  const sections = [
    '📊 <b>ArzPulse · Market Snapshot</b>',
    `<blockquote>آخرین Snapshot: ${html(formatTime(timestamp))}\nتازگی داده: ${html(ageText(timestamp))}</blockquote>`
  ];
  if (stale) sections.push('<blockquote>⚠️ <b>داده‌ها قدیمی‌اند.</b> مقادیر زیر آخرین Snapshot ذخیره‌شده هستند؛ برای درخواست آپدیت از <code>/refresh</code> (مدیر مجاز) استفاده کن.</blockquote>');
  if (data?.hasError) sections.push(`<blockquote>⚠️ بخشی از منابع خطا داشته‌اند (${formatNumber(data.errorCount || data.errorDetails?.length || 0, 0)}). دارایی‌هایی که تازه دریافت نشده‌اند با برچسب کهنگی مشخص می‌شوند.</blockquote>`);

  sections.push('🇮🇷 <b>بازار داخلی</b>');
  for (const asset of localAssetRows(data)) {
    const coin = asset.data;
    if (!coin || ![coin.lastPrice, coin.bestBuy, coin.bestSell].some(positive)) {
      sections.push(`⚪ <b>${asset.emoji} ${asset.symbol} · ${asset.fa}</b>\n<blockquote>اطلاعات این دارایی در Snapshot موجود نیست.</blockquote>`);
      continue;
    }
    const isStaleAsset = Boolean(coin.stale);
    sections.push([
      `${changeMark(coin.change)} <b>${asset.emoji} ${asset.symbol} · ${asset.fa}</b>${isStaleAsset ? ' <i>(قدیمی)</i>' : ''}`,
      `<pre><code>Last      ${formatDualPrice(coin.lastPrice, usdtIrrRate)}
Buy       ${formatDualPrice(coin.bestBuy, usdtIrrRate)}
Sell      ${formatDualPrice(coin.bestSell, usdtIrrRate)}
High      ${formatDualPrice(coin.high, usdtIrrRate)}
Low       ${formatDualPrice(coin.low, usdtIrrRate)}
Volume    ${formatNumber(coin.volume, 4)} ${asset.symbol}</code></pre>`,
      `<blockquote>تغییر ۲۴ ساعت: <b>${formatPercent(coin.change)}</b> · Spread: <code>${positive(coin.bestBuy) && positive(coin.bestSell) ? formatPercent(((coin.bestSell - coin.bestBuy) / coin.bestSell) * 100) : '—'}</code></blockquote>`
    ].join('\n'));
  }

  const usdt = numeric(data?.usdtPrice || data?.prices?.USDT?.bestSell);
  const gold = numeric(data?.gold18K);
  sections.push('🥇 <b>طلا و نرخ مرجع</b>');
  sections.push(`<pre><code>18K Gold / gram  ${formatDualPrice(gold, usdtIrrRate)}
USDT / IRR       ${formatPrice(usdt)} IRR
USDT / USD       ${positive(usdt) ? '$1.00 approx.' : '—'}</code></pre>`);
  sections.push('<blockquote>💱 معادل دلاری قیمت‌های داخلی تخمینی است و با نرخ USDT/IRR همین Snapshot محاسبه می‌شود؛ نرخ رسمی اسکناس دلار نیست.</blockquote>');
  if (data?.derivedStale?.gold18K) sections.push('<blockquote>⚠️ قیمت طلای ۱۸ عیار از یکی از ورودی‌های قدیمی محاسبه شده است.</blockquote>');

  if (data?.market && typeof data.market === 'object') {
    const globalRows = Object.entries({
      BRENT: 'Brent Crude', WTI: 'WTI Crude', XAUUSD: 'Gold Futures', SILVER: 'Silver Futures',
      SP500: 'S&P 500', NASDAQ: 'Nasdaq', DXY: 'Dollar Index'
    }).map(([key, name]) => ({ key, name, data: data.market[key] })).filter((row) => row.data && positive(row.data.last));
    if (globalRows.length) {
      sections.push('🌍 <b>بازار جهانی</b>');
      sections.push('<pre><code>' + globalRows.map((row) => `${row.key.padEnd(7)} ${formatNumber(row.data.last, 3).padStart(13)}   ${formatPercent(row.data.change).padStart(9)}${row.data.stale ? ' *' : ''}`).join('\n') + '</code></pre>');
      sections.push('<blockquote>* قیمت‌های بازار جهانی ممکن است با تأخیر منبع نمایش داده شوند. ارقام بازار جهانی بر حسب واحد قرارداد/شاخص هستند، نه ریال.</blockquote>');
    }
  }
  const context = data?.marketContext || {};
  const fg = context.fearGreed;
  const global = context.global;
  sections.push('🧭 <b>محرک‌های کلیدی بازار</b>');
  sections.push(`<pre><code>Fear & Greed    ${fg ? `${formatNumber(fg.value, 0)}/100 · ${html(fg.classification || '')}` : '—'}
BTC dominance   ${positive(global?.btcDominance) ? `${formatNumber(global.btcDominance, 2)}%` : '—'}
Global cap      ${formatCompactUsd(global?.totalMarketCapUsd)}
24h volume      ${formatCompactUsd(global?.totalVolume24hUsd)}
BTC funding     ${context.derivatives?.BTC ? formatPercent(numeric(context.derivatives.BTC.fundingRate) * 100) : '—'}</code></pre>`);
  sections.push('━━━━━━━━━━━━━━━━━━\n🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد ArzPulse</a>  ·  برای جزئیات بیشتر <code>/crypto</code> و <code>/macro</code>');
  return sections.join('\n\n');
}

function formatCompactUsd(value) {
  const n = numeric(value);
  if (!positive(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${formatNumber(n, n < 1 ? 6 : 2)}`;
}

function globalCryptoLine(symbol, item, rate) {
  const usd = numeric(item?.last);
  if (!positive(usd)) return '';
  const irr = positive(rate) ? `${formatPrice(usd * rate)} IRR` : 'IRR unavailable';
  const change = formatPercent(item.change);
  const mark = numeric(item.change) > 0 ? '🟢' : numeric(item.change) < 0 ? '🔴' : '⚪';
  return `${mark} <code>${symbol.padEnd(5)}</code> <b>$${formatNumber(usd, usd < 0.01 ? 8 : 4)}</b> · ${irr} · ${change} · Vol ${formatCompactUsd(item.volumeUsd)}`;
}

function generateCryptoMessage(data) {
  const rate = getUsdtIrrRate(data);
  const sourceData = data?.globalCrypto || {};
  const rows = GLOBAL_CRYPTOS.map((symbol) => ({ symbol, item: sourceData[symbol] }))
    .filter((x) => x.item && positive(x.item.last))
    .sort((a, b) => Number(b.item.volumeUsd || 0) - Number(a.item.volumeUsd || 0));
  const lines = rows.map(({ symbol, item }) => globalCryptoLine(symbol, item, rate));
  const freshCount = rows.filter(({ item }) => !item.stale).length;
  return [
    '🪙 <b>ArzPulse · Global Crypto Board</b>',
    `<blockquote>نماد معتبر: <b>${formatNumber(rows.length, 0)}</b> · داده تازه: <b>${formatNumber(freshCount, 0)}</b> · نرخ تقریبی تبدیل: ${positive(rate) ? `${formatPrice(rate)} IRR/USDT` : 'در دسترس نیست'}</blockquote>`,
    lines.join('\n'),
    '<blockquote>قیمت USD و حجم جهانی از Binance Spot هستند. معادل IRR تخمینی و با نرخ USDT/IRR همان Snapshot محاسبه می‌شود؛ حجم جهانی، حجم معاملات جفت USDT است نه کل همه صرافی‌ها.</blockquote>',
    `<blockquote>Snapshot: <code>${html(formatTime(data?.timestamp))}</code> · منبع قیمت: <a href="https://www.binance.com/en/markets">Binance Markets</a></blockquote>`,
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد ArzPulse</a>'
  ].join('\n\n');
}

function generateMacroMessage(data) {
  const context = data?.marketContext || {};
  const fg = context.fearGreed;
  const global = context.global;
  const crypto = Object.entries(data?.globalCrypto || {}).map(([symbol, item]) => ({ symbol, ...item })).filter((x) => positive(x.last) && !x.stale);
  const up = crypto.filter((x) => numeric(x.change) > 0).length;
  const down = crypto.filter((x) => numeric(x.change) < 0).length;
  const flat = Math.max(0, crypto.length - up - down);
  const derivatives = context.derivatives || {};
  const fundingLine = ['BTC', 'ETH'].map((symbol) => {
    const item = derivatives[symbol];
    return item ? `${symbol}: ${formatPercent(numeric(item.fundingRate) * 100)} / 8h` : `${symbol}: —`;
  }).join(' · ');
  const marketLines = Object.entries({ DXY: 'Dollar Index', SP500: 'S&P 500', NASDAQ: 'Nasdaq', BRENT: 'Brent', WTI: 'WTI', XAUUSD: 'Gold' })
    .map(([key, name]) => ({ key, name, item: data?.market?.[key] }))
    .filter((x) => positive(x.item?.last))
    .map((x) => `${x.key.padEnd(7)} ${formatNumber(x.item.last, 3)} · ${formatPercent(x.item.change)}${x.item.stale ? ' *' : ''}`);
  const rows = [
    '🧭 <b>ArzPulse · Market Drivers</b>',
    `<blockquote>Snapshot: <code>${html(formatTime(data?.timestamp))}</code> · ${isDataStale(data, {}) ? '⚠️ دادهٔ اصلی ممکن است قدیمی باشد' : 'دادهٔ اصلی تازه است'}</blockquote>`,
    '🧠 <b>Sentiment & Crypto Market</b>',
    `<pre><code>Fear & Greed       ${fg ? `${formatNumber(fg.value, 0)}/100 · ${html(fg.classification || '')}${fg.stale ? ' *' : ''}` : '—'}
Yesterday          ${fg?.yesterday ? `${formatNumber(fg.yesterday.value, 0)}/100 · ${html(fg.yesterday.classification || '')}` : '—'}
Total market cap   ${formatCompactUsd(global?.totalMarketCapUsd)}
24h global volume  ${formatCompactUsd(global?.totalVolume24hUsd)}
BTC dominance      ${positive(global?.btcDominance) ? `${formatNumber(global.btcDominance, 2)}%` : '—'}
ETH dominance      ${positive(global?.ethDominance) ? `${formatNumber(global.ethDominance, 2)}%` : '—'}
Market cap 24h     ${formatPercent(global?.marketCapChange24h)}
Global breadth     ${formatNumber(up, 0)} up / ${formatNumber(down, 0)} down / ${formatNumber(flat, 0)} flat</code></pre>`,
    '📉 <b>Derivatives positioning</b>',
    `<pre><code>${html(fundingLine)}
BTC open interest  ${formatCompactUsd(derivatives.BTC?.openInterestUsd)}
BTC mark / index   ${positive(derivatives.BTC?.markPrice) ? formatNumber(derivatives.BTC.markPrice, 2) : '—'} / ${positive(derivatives.BTC?.indexPrice) ? formatNumber(derivatives.BTC.indexPrice, 2) : '—'}</code></pre>`,
    '🌐 <b>Macro & Commodities</b>',
    `<pre><code>${html(marketLines.join('\n') || 'Global macro data unavailable')}</code></pre>`,
    '<blockquote>Funding rates are per settlement period (typically 8h) and may be annualized differently by platforms. Positive rates often indicate longs pay shorts; open interest is position notional, not net directional exposure. Fear & Greed is from Alternative.me and must be interpreted as sentiment, not a prediction.</blockquote>',
    `<blockquote>Sources: <a href="https://alternative.me/crypto/fear-and-greed-index/">Alternative.me</a> · <a href="https://www.binance.com/en/markets">Binance</a> · <a href="https://www.coingecko.com/">CoinGecko</a> · macro quotes may be delayed.</blockquote>`,
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد ArzPulse</a>'
  ];
  return rows.join('\n\n');
}

function generateSentimentMessage(data) {
  const context = data?.marketContext || {};
  const fg = context.fearGreed;
  const crypto = Object.entries(data?.globalCrypto || {}).map(([symbol, item]) => ({ symbol, ...item })).filter((x) => positive(x.last) && !x.stale);
  const up = crypto.filter((x) => numeric(x.change) > 0).length;
  const down = crypto.filter((x) => numeric(x.change) < 0).length;
  return [
    '🧠 <b>ArzPulse · Market Sentiment</b>',
    fg ? `<blockquote>Fear & Greed: <b>${formatNumber(fg.value, 0)}/100 · ${html(fg.classification || 'Unknown')}</b>${fg.stale ? ' · ⚠️ stale' : ''}\nYesterday: ${fg.yesterday ? `${formatNumber(fg.yesterday.value, 0)}/100 · ${html(fg.yesterday.classification || '')}` : '—'}\nUpdated: ${html(formatTime(fg.timestamp))}</blockquote>` : '<blockquote>Fear & Greed currently unavailable.</blockquote>',
    `<pre><code>Global crypto breadth  ${formatNumber(up, 0)} up / ${formatNumber(down, 0)} down
BTC dominance          ${positive(context.global?.btcDominance) ? `${formatNumber(context.global.btcDominance, 2)}%` : '—'}
ETH dominance          ${positive(context.global?.ethDominance) ? `${formatNumber(context.global.ethDominance, 2)}%` : '—'}
BTC funding             ${context.derivatives?.BTC ? formatPercent(numeric(context.derivatives.BTC.fundingRate) * 100) : '—'}
ETH funding             ${context.derivatives?.ETH ? formatPercent(numeric(context.derivatives.ETH.fundingRate) * 100) : '—'}</code></pre>`,
    '<blockquote>شاخص ترس و طمع روزانه به‌روزرسانی می‌شود؛ سایر داده‌ها ممکن است سریع‌تر عوض شوند. این شاخص به‌تنهایی سیگنال خریدوفروش نیست. منبع: <a href="https://alternative.me/crypto/fear-and-greed-index/">Alternative.me</a>.</blockquote>'
  ].join('\n\n');
}

function generateGlobalCryptoSingleMessage(symbol, data, env) {
  const item = data?.globalCrypto?.[symbol];
  if (!item || !positive(item.last)) return `⚠️ دادهٔ جهانی ${html(symbol)} فعلاً در Snapshot موجود نیست. دستور <code>/crypto</code> را برای فهرست بازار بفرست.`;
  const rate = getUsdtIrrRate(data);
  const localEstimate = positive(rate) ? `${formatPrice(numeric(item.last) * rate)} IRR` : '—';
  return [
    `${changeMark(item.change)} <b>${html(GLOBAL_CRYPTO_NAMES[symbol] || symbol)} · ${html(symbol)}</b>`,
    `<blockquote>قیمت جهانی: <code>$${formatNumber(item.last, numeric(item.last) < 0.01 ? 8 : 4)}</code>\nمعادل تقریبی: <code>${localEstimate}</code>\nتغییر ۲۴ ساعت: <b>${formatPercent(item.change)}</b></blockquote>`,
    `<pre><code>24h high       $${formatNumber(item.high, 8)}
24h low        $${formatNumber(item.low, 8)}
Weighted avg   $${formatNumber(item.weightedAverage, 8)}
Bid / Ask      $${formatNumber(item.bid, 8)} / $${formatNumber(item.ask, 8)}
Base volume    ${formatNumber(item.volumeBase, 4)} ${html(symbol)}
Quote volume   ${formatCompactUsd(item.volumeUsd)}
Trades         ${formatNumber(item.trades, 0)}
Source         Binance Spot
Updated        ${html(formatTime(item.timestamp))}</code></pre>`,
    item.stale ? '<blockquote>⚠️ آخرین رکورد این نماد از Snapshot قبلی نگه داشته شده است.</blockquote>' : '',
    '<blockquote>معادل IRR برآوردی است و از نرخ USDT/IRR نوبیتکس استفاده می‌کند؛ قیمت جهانی معادل قیمت خریدوفروش در صرافی ایرانی نیست.</blockquote>'
  ].filter(Boolean).join('\n\n');
}

function generateGoldMessage(data, env) {
  const stale = isDataStale(data, env) || Boolean(data?.derivedStale?.gold18K);
  const usdtIrrRate = getUsdtIrrRate(data);
  return [
    '🥇 <b>ArzPulse · 18K Gold</b>',
    `<blockquote>هر گرم طلای ۱۸ عیار\n<code>${formatDualPrice(data?.gold18K, usdtIrrRate)}</code></blockquote>`,
    `<pre><code>USDT / IRR   ${formatPrice(data?.usdtPrice || data?.prices?.USDT?.bestSell)} ریال
USDT / USD   $1.00 approx.
XAUT / USDT  ${formatPrice(data?.prices?.XAUT?.bestSell)} USD
Update       ${html(formatTime(data?.timestamp))}</code></pre>`,
    '<blockquote>معادل دلاری طلا با نرخ USDT/IRR همین Snapshot محاسبه می‌شود و تقریبی است.</blockquote>',
    '<blockquote>فرمول محاسبه: (XAUT/USDT × USDT/IRR ÷ 31.1034768) × 0.75. نتیجه تخمینی است و جایگزین نرخ رسمی بازار طلا نیست.</blockquote>',
    stale ? '<blockquote>⚠️ حداقل یکی از داده‌های مورد استفاده قدیمی است.</blockquote>' : '',
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">ArzPulse Dashboard</a>'
  ].filter(Boolean).join('\n\n');
}

function generateSingleAssetMessage(coin, name, symbol, env, data) {
  const usdtIrrRate = getUsdtIrrRate(data);
  if (!coin || ![coin.lastPrice, coin.bestBuy, coin.bestSell].some(positive)) {
    return `⚠️ <b>${html(name)} (${html(symbol)})</b>\n<blockquote>در آخرین Snapshot دادهٔ قابل استفاده‌ای وجود ندارد.</blockquote>`;
  }
  const stale = Boolean(coin.stale);
  return [
    `${changeMark(coin.change)} <b>${html(name)} · ${html(symbol)}</b>`,
    `<blockquote>قیمت آخر: <code>${formatDualPrice(coin.lastPrice, usdtIrrRate)}</code>\nتغییر ۲۴ ساعت: <b>${formatPercent(coin.change)}</b></blockquote>`,
    `<pre><code>Best buy  ${formatDualPrice(coin.bestBuy, usdtIrrRate)}
Best sell ${formatDualPrice(coin.bestSell, usdtIrrRate)}
Day high  ${formatDualPrice(coin.high, usdtIrrRate)}
Day low   ${formatDualPrice(coin.low, usdtIrrRate)}
Volume    ${formatNumber(coin.volume, 4)} ${html(symbol)}</code></pre>`,
    '<blockquote>معادل دلاری تخمینی و بر پایه نرخ USDT/IRR همین Snapshot است.</blockquote>',
    data?.globalCrypto?.[symbol] ? `<blockquote>🌍 <b>مقایسه بازار جهانی</b>\nقیمت Binance: <code>$${formatNumber(data.globalCrypto[symbol].last, numeric(data.globalCrypto[symbol].last) < 0.01 ? 8 : 4)}</code> · تغییر جهانی: <b>${formatPercent(data.globalCrypto[symbol].change)}</b>\nحجم جهانی ۲۴ساعت: <code>${formatCompactUsd(data.globalCrypto[symbol].volumeUsd)}</code> · معاملات: <code>${formatNumber(data.globalCrypto[symbol].trades, 0)}</code></blockquote>` : '',
    stale || isDataStale({ timestamp: coin.fetchedAt }, env) ? '<blockquote>⚠️ اطلاعات این دارایی ممکن است قدیمی باشد.</blockquote>' : '',
    '🌐 <a href="https://mehrdadmb2.github.io/ArzPulse/">داشبورد ArzPulse</a>'
  ].filter(Boolean).join('\n\n');
}

function historyValue(symbol, item) {
  if (symbol === 'GOLD') return numeric(item?.GOLD18K);
  if (symbol === 'DOLLAR') return numeric(item?.DOLLAR || item?.USDT);
  return numeric(item?.[symbol]);
}

function dateKey(date) { return date.toISOString().slice(0, 10); }

async function fetchHistoryForSymbol(symbol, days = 30) {
  const dayCount = clampInt(days, 30, 1, MAX_HISTORY_DAYS + 2);
  const today = new Date();
  const urls = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = new Date(today.getTime());
    date.setUTCDate(date.getUTCDate() - offset);
    urls.push(`${HISTORY_BASE}${dateKey(date)}.json`);
  }

  const dailyResults = await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetchWithTimeout(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } }, HTTP_TIMEOUT_MS);
      if (!response.ok) return null;
      const json = await response.json();
      return Array.isArray(json) ? json : null;
    } catch (error) {
      console.warn('[history] file unavailable:', url.split('/').pop(), error.message);
      return null;
    }
  }));

  const dedupe = new Map();
  for (const rows of dailyResults) {
    if (!rows) continue;
    for (const row of rows) {
      const timestamp = Date.parse(row?.time || '');
      const value = historyValue(symbol, row);
      if (!Number.isFinite(timestamp) || !positive(value)) continue;
      dedupe.set(timestamp, { time: new Date(timestamp), value });
    }
  }
  const points = [...dedupe.values()].sort((a, b) => a.time - b.time);
  return { values: points.map((point) => point.value), times: points.map((point) => point.time), count: points.length };
}

function filterHistoryToPeriod(history, period) {
  const durations = { '24h': 24 * 3600000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
  const cutoff = Date.now() - durations[period];
  const rows = history.times.map((time, index) => ({ time, value: history.values[index] }))
    .filter((row) => row.time.getTime() >= cutoff && positive(row.value));
  // Keep two prior points as a graceful fallback if today's partial file is sparse.
  const selected = rows.length >= (period === '24h' ? 5 : 2) ? rows : history.times.map((time, index) => ({ time, value: history.values[index] })).filter((row) => positive(row.value)).slice(-Math.max(10, rows.length));
  return { values: selected.map((row) => row.value), times: selected.map((row) => row.time), count: selected.length };
}

function makeChartConfig(symbol, period, values, times) {
  const info = COLORS[symbol] || { line: '#67e8f9', fill: 'rgba(103,232,249,0.16)', fa: getSymbolName(symbol) };
  const maxPoints = period === '24h' ? 130 : 100;
  const step = Math.max(1, Math.ceil(values.length / maxPoints));
  const sampledValues = values.filter((_, index) => index % step === 0);
  const sampledTimes = times.filter((_, index) => index % step === 0);
  if (sampledValues.length && sampledValues.at(-1) !== values.at(-1)) {
    sampledValues.push(values.at(-1));
    sampledTimes.push(times.at(-1));
  }
  const labels = sampledTimes.map((time) => period === '24h'
    ? time.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })
    : time.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', month: '2-digit', day: '2-digit' }));
  return {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${info.fa || getSymbolName(symbol)} (${symbol})`,
        data: sampledValues,
        borderColor: info.line,
        backgroundColor: info.fill,
        pointBackgroundColor: info.line,
        pointRadius: sampledValues.length > 70 ? 0 : 2,
        pointHoverRadius: 5,
        borderWidth: 3,
        fill: true,
        tension: 0.28
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: true, labels: { color: '#e5e7eb', font: { family: 'Vazirmatn, Arial', size: 13 } } },
        title: {
          display: true,
          text: `${getSymbolName(symbol)} · ${period}`,
          color: '#f9fafb',
          font: { family: 'Vazirmatn, Arial', size: 18, weight: 'bold' }
        },
        subtitle: { display: true, text: 'ArzPulse historical snapshots · not investment advice', color: '#9ca3af' },
        tooltip: { enabled: true }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af', maxTicksLimit: 12, maxRotation: 0 } },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#9ca3af', callback: (value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  };
}

async function renderChartPng(symbol, period, history) {
  if (!history?.count || history.count < 2) throw new Error('برای این نمودار نقاط تاریخی کافی وجود ندارد.');
  const chart = makeChartConfig(symbol, period, history.values, history.times);
  const response = await fetchWithTimeout(QUICKCHART_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'image/png' },
    body: JSON.stringify({ chart, width: 1100, height: 640, format: 'png', backgroundColor: '#111827', devicePixelRatio: 2 })
  }, QUICKCHART_TIMEOUT_MS);
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(`QuickChart HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('image/')) throw new Error(`QuickChart returned ${contentType || 'an unknown content type'} instead of an image`);
  return new Uint8Array(await response.arrayBuffer());
}

async function sendPhotoBytes(chatId, bytes, caption, token) {
  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption.slice(0, 1024));
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([bytes], { type: 'image/png' }), 'arzpulse-chart.png');
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form }, 7000);
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      console.error('[sendPhoto] Telegram error:', response.status, result?.description || 'unknown error');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[sendPhoto] failed:', error.message);
    return false;
  }
}


async function sendMediaGroupBytes(chatId, items, token) {
  if (!Array.isArray(items) || items.length < 2 || items.length > 10) throw new Error('sendMediaGroup requires 2–10 images.');
  const form = new FormData();
  form.append('chat_id', String(chatId));
  const media = items.map((item, index) => ({
    type: 'photo', media: `attach://chart${index}`,
    caption: String(item.caption || '').slice(0, 950), parse_mode: 'HTML'
  }));
  form.append('media', JSON.stringify(media));
  items.forEach((item, index) => form.append(`chart${index}`, new Blob([item.bytes], { type: 'image/png' }), `arzpulse-${index + 1}.png`));
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: 'POST', body: form }, 7000);
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    const description = result?.description || `Telegram API HTTP ${response.status}`;
    console.error('[sendMediaGroup] failed:', response.status, description);
    throw new Error(description);
  }
  return result.result;
}

async function dispatchGitHubUpdate(env) {
  const owner = String(env.GITHUB_OWNER || 'mehrdadmb2').trim();
  const repo = String(env.GITHUB_REPO || 'ArzPulse').trim();
  const workflow = String(env.GITHUB_WORKFLOW || 'update-prices.yml').trim();
  const ref = String(env.GITHUB_REF || 'main').trim();
  if (!env.GITHUB_TOKEN) throw new Error('Secret GITHUB_TOKEN is not configured');
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !/^[A-Za-z0-9_.-]+\.ya?ml$/.test(workflow) || !/^[A-Za-z0-9_./-]+$/.test(ref)) {
    throw new Error('GitHub workflow configuration contains invalid values');
  }
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'ArzPulse-Telegram-Worker'
    },
    body: JSON.stringify({ ref })
  }, 10000);
  if (response.status !== 204) {
    const detail = (await response.text().catch(() => '')).slice(0, 400);
    console.error('[github-dispatch] failed:', response.status, detail);
    if (response.status === 401 || response.status === 403) throw new Error(`GitHub authorization failed (${response.status}); check GITHUB_TOKEN permissions and repository access.`);
    if (response.status === 404) throw new Error('GitHub workflow was not found; check GITHUB_OWNER, GITHUB_REPO and GITHUB_WORKFLOW.');
    throw new Error(`GitHub workflow dispatch failed with HTTP ${response.status}.`);
  }
  return true;
}

async function requestRefreshLock(env) {
  if (!env.SETTINGS_KV) throw new Error('SETTINGS_KV binding is missing; manual refresh lock cannot be safely enforced.');
  const now = Date.now();
  try {
    const current = await env.SETTINGS_KV.get(REFRESH_LOCK_KEY, { type: 'json', cacheTtl: 30 });
    if (current?.until && Number(current.until) > now) {
      const remaining = Math.ceil((Number(current.until) - now) / 1000);
      return { acquired: false, remaining };
    }
    await env.SETTINGS_KV.put(REFRESH_LOCK_KEY, JSON.stringify({ until: now + REFRESH_LOCK_SECONDS * 1000, at: new Date(now).toISOString() }), { expirationTtl: REFRESH_LOCK_SECONDS });
    return { acquired: true, remaining: 0 };
  } catch (error) {
    console.error('[kv] refresh lock failed:', error.message);
    throw new Error('KV is temporarily unavailable. The automatic five-minute updater remains responsible for scheduled updates; retry manual refresh later.');
  }
}

async function requestRefreshForUser(message, env) {
  if (!isConfiguredAdmin(message.from, env)) {
    await sendMessage(message.chat.id, requireAdminIdMessage(), env.TELEGRAM_BOT_TOKEN);
    return;
  }
  let lock;
  try { lock = await requestRefreshLock(env); }
  catch (error) {
    await sendMessage(message.chat.id, `⚠️ <b>درخواست آپدیت پذیرفته نشد.</b>\n<blockquote>${html(error.message)}</blockquote>`, env.TELEGRAM_BOT_TOKEN);
    return;
  }
  if (!lock.acquired) {
    await sendMessage(message.chat.id, `⏳ <b>یک درخواست تازه ثبت شده است.</b>\n<blockquote>برای جلوگیری از اجرای تکراری، حدود ${formatNumber(Math.ceil(lock.remaining / 60), 0)} دقیقه صبر کن.</blockquote>`, env.TELEGRAM_BOT_TOKEN);
    return;
  }
  try {
    await dispatchGitHubUpdate(env);
    await sendMessage(message.chat.id, '✅ <b>درخواست به‌روزرسانی ثبت شد.</b>\n<blockquote>جمع‌آوری داده در GitHub Actions به‌صورت غیرهم‌زمان انجام می‌شود. برای بررسی نتیجه از <code>/status</code> استفاده کن؛ این پیام به معنی پایان موفق جمع‌آوری نیست.</blockquote>', env.TELEGRAM_BOT_TOKEN);
  } catch (error) {
    await sendMessage(message.chat.id, `❌ <b>GitHub Actions اجرا نشد.</b>\n<blockquote>${html(error.message)}</blockquote>`, env.TELEGRAM_BOT_TOKEN);
  }
}

async function commandChart(message, symbol, period, token) {
  const supportedSymbols = new Set([...GLOBAL_CRYPTOS, 'USDT', 'NOT', 'GOLD', 'DOLLAR']);
  const supportedPeriods = new Set(['24h', '7d', '30d']);
  if (!supportedSymbols.has(symbol) || !supportedPeriods.has(period)) {
    await sendMessage(message.chat.id, `${getChartHelpMessage()}\n\n⚠️ <b>نماد یا بازه معتبر نیست.</b>`, token);
    return;
  }
  const waitId = await sendMessage(message.chat.id, `⏳ <b>در حال آماده‌سازی نمودار ${html(getSymbolName(symbol))}</b>\n<blockquote>بازه: <code>${html(period)}</code> · دادهٔ تاریخی واقعی</blockquote>`, token);
  if (!waitId) return;
  try {
    const days = period === '24h' ? 2 : period === '7d' ? 8 : 30;
    const fetched = await fetchHistoryForSymbol(symbol, days);
    const history = filterHistoryToPeriod(fetched, period);
    const minimum = period === '24h' ? 5 : 2;
    if (history.count < minimum) throw new Error(`نقاط تاریخی کافی نیست (${history.count}/${minimum}). پس از ثبت Snapshotهای بیشتر دوباره امتحان کن.`);
    const png = await renderChartPng(symbol, period, history);
    const caption = `📈 <b>${html(getSymbolName(symbol))} · ${html(symbol)}</b>\n<blockquote>بازه: <code>${html(period)}</code>\nتعداد نقاط: <code>${formatNumber(history.count, 0)}</code>\nمنبع: ArzPulse daily snapshots</blockquote>`;
    const ok = await sendPhotoBytes(message.chat.id, png, caption, token);
    if (ok) await editMessage(message.chat.id, waitId, `✅ <b>نمودار ${html(symbol)} ارسال شد.</b>`, token);
    else await editMessage(message.chat.id, waitId, '❌ <b>ارسال تصویر به تلگرام ناموفق بود.</b> دوباره تلاش کن.', token);
  } catch (error) {
    console.error('[chart] failed:', error.message);
    await editMessage(message.chat.id, waitId, `⚠️ <b>نمودار ساخته نشد.</b>\n<blockquote>${html(error.message)}</blockquote>`, token);
  }
}

async function commandChartAll(message, token) {
  const waitId = await sendMessage(message.chat.id, '📈 <b>در حال آماده‌سازی نمودارهای منتخب…</b>\n<blockquote>نمودارها به‌صورت گروهی ارسال می‌شوند تا تعداد درخواست‌های تلگرام کمتر شود.</blockquote>', token);
  if (!waitId) return;
  const symbols = ['BTC', 'ETH', 'USDT', 'NOT'];
  const settled = await Promise.all(symbols.map(async (symbol) => {
    try {
      const fetched = await fetchHistoryForSymbol(symbol, 2);
      const history = filterHistoryToPeriod(fetched, '24h');
      if (history.count < 5) throw new Error(`history points ${history.count}/5`);
      const bytes = await renderChartPng(symbol, '24h', history);
      return {
        symbol, bytes,
        caption: `📈 <b>${html(getSymbolName(symbol))} (${symbol})</b>\n<blockquote>بازه: <code>24h</code> · نقاط: <code>${formatNumber(history.count, 0)}</code></blockquote>`
      };
    } catch (error) {
      console.warn(`[chartall:${symbol}]`, error.message);
      return { symbol, error: error.message };
    }
  }));
  const ready = settled.filter((item) => item.bytes);
  const failures = settled.filter((item) => item.error);
  let sentCount = 0;
  const sentSymbols = [];
  if (ready.length >= 2) {
    try {
      await sendMediaGroupBytes(message.chat.id, ready, token);
      sentCount = ready.length;
      sentSymbols.push(...ready.map((item) => item.symbol));
    } catch (error) {
      console.error('[chartall:media-group] failed:', error.message);
      failures.push({ symbol: 'MEDIA_GROUP', error: 'گروه تصاویر به تلگرام نرسید؛ نمودارها را جداگانه با /chart SYMBOL 24h درخواست کن.' });
    }
  } else if (ready.length === 1) {
    if (await sendPhotoBytes(message.chat.id, ready[0].bytes, ready[0].caption, token)) { sentCount = 1; sentSymbols.push(ready[0].symbol); }
    else failures.push({ symbol: ready[0].symbol, error: 'Telegram image upload failed' });
  }
  const summary = [
    `✅ <b>نمودارهای ارسال‌شده: ${sentCount}/${symbols.length}</b>`,
    sentCount ? `<pre><code>${sentSymbols.join(' · ')}</code></pre>` : '',
    failures.length ? `<blockquote>موارد ناموفق:\n${html(failures.map((item) => `${item.symbol}: ${item.error}`).join('\n'))}</blockquote>` : ''
  ].filter(Boolean).join('\n');
  await editMessage(message.chat.id, waitId, summary, token);
}

async function handleCommand(message, command, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = message.chat.id;
  const args = command.args.split(/\s+/).filter(Boolean);

  switch (command.name) {
    case 'start':
      await sendMessage(chatId, getWelcomeMessage(), token);
      return;
    case 'help':
      await sendMessage(chatId, getHelpMessage(), token);
      return;
    case 'crypto':
    case 'coins': {
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, '⚠️ دادهٔ رمزارزها فعلاً در دسترس نیست.', token); return; }
      await sendMessage(chatId, generateCryptoMessage(data), token);
      return;
    }
    case 'macro':
    case 'market': {
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, '⚠️ داده‌های بازار در دسترس نیستند.', token); return; }
      await sendMessage(chatId, generateMacroMessage(data), token);
      return;
    }
    case 'sentiment': {
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, '⚠️ دادهٔ احساسات بازار در دسترس نیست.', token); return; }
      await sendMessage(chatId, generateSentimentMessage(data), token);
      return;
    }
    case 'alerts': {
      if (!env.SETTINGS_KV) { await sendMessage(chatId, '⚠️ ذخیره‌سازی هشدارها تنظیم نشده است؛ Binding با نام <code>SETTINGS_KV</code> لازم است.', token); return; }
      try {
        const preferences = await getAlertPreferences(env);
        const preference = preferences[String(chatId)];
        const channels = await getChannelSettings(env);
        await sendMessage(chatId, alertsHelpMessage(preference, channels.includes(String(chatId))), token);
      } catch (error) { await sendMessage(chatId, `❌ خواندن تنظیمات هشدار ناموفق بود.\n<blockquote>${html(error.message)}</blockquote>`, token); }
      return;
    }
    case 'alertson':
    case 'alertsoff': {
      if (!env.SETTINGS_KV) { await sendMessage(chatId, '⚠️ ذخیره‌سازی هشدارها تنظیم نشده است؛ Binding با نام <code>SETTINGS_KV</code> لازم است.', token); return; }
      if (message.chat.type !== 'private' && !await isChatAdmin(message, env)) {
        await sendMessage(chatId, '🔐 برای تغییر هشدارهای گروه، دستور را مدیر گروه اجرا کند.', token); return;
      }
      try {
        const preferences = await getAlertPreferences(env);
        const old = preferences[String(chatId)] || {};
        const enabled = command.name === 'alertson';
        preferences[String(chatId)] = { enabled, level: ['low', 'medium', 'high'].includes(old.level) ? old.level : 'medium', updatedAt: new Date().toISOString() };
        await saveAlertPreferences(env, preferences);
        await sendMessage(chatId, enabled
          ? '✅ <b>هشدارهای خودکار فعال شدند.</b>\n<blockquote>از این پس هشدارهای مهم قیمت، بازار، ترس‌وطمع، Funding و Open Interest در این چت ارسال می‌شوند. برای تنظیم حساسیت <code>/alertlevel</code> را بفرست.</blockquote>'
          : '🛑 <b>هشدارهای خودکار این چت غیرفعال شدند.</b>\n<blockquote>اگر این چت قبلاً گزارش ساعتی دریافت می‌کرد، آن گزارش مستقل از هشدارها باقی می‌ماند.</blockquote>', token);
      } catch (error) { await sendMessage(chatId, `❌ ذخیره تنظیمات هشدار ناموفق بود.\n<blockquote>${html(error.message)}</blockquote>`, token); }
      return;
    }
    case 'alertlevel': {
      if (!env.SETTINGS_KV) { await sendMessage(chatId, '⚠️ Binding با نام <code>SETTINGS_KV</code> لازم است.', token); return; }
      const level = String(args[0] || '').toLowerCase();
      if (!['low', 'medium', 'high'].includes(level)) {
        await sendMessage(chatId, 'برای تنظیم حساسیت یکی از این گزینه‌ها را بفرست: <code>/alertlevel low</code>، <code>/alertlevel medium</code> یا <code>/alertlevel high</code>.', token); return;
      }
      if (message.chat.type !== 'private' && !await isChatAdmin(message, env)) {
        await sendMessage(chatId, '🔐 برای تغییر حساسیت هشدارهای گروه، دستور را مدیر گروه اجرا کند.', token); return;
      }
      try {
        const preferences = await getAlertPreferences(env);
        preferences[String(chatId)] = { enabled: true, level, updatedAt: new Date().toISOString() };
        await saveAlertPreferences(env, preferences);
        const label = ({ low: 'همه هشدارها', medium: 'هشدارهای مهم و بحرانی', high: 'فقط هشدارهای بحرانی' })[level];
        await sendMessage(chatId, `✅ حساسیت هشدار تنظیم شد: <b>${label}</b>.\n<blockquote>هشدارها برای این چت فعال هستند. برای توقف از <code>/alertsoff</code> استفاده کن.</blockquote>`, token);
      } catch (error) { await sendMessage(chatId, `❌ ذخیره سطح هشدار ناموفق بود.\n<blockquote>${html(error.message)}</blockquote>`, token); }
      return;
    }
    case 'chart':
      if (args.length < 2) { await sendMessage(chatId, getChartHelpMessage(), token); return; }
      await commandChart(message, args[0].toUpperCase(), args[1].toLowerCase(), token);
      return;
    case 'chartall':
      await commandChartAll(message, token);
      return;
    case 'id':
      await sendMessage(chatId,
        `🆔 <b>شناسه‌ها</b>\n<pre><code>Chat ID: ${html(chatId)}\nUser ID: ${html(message.from?.id ?? 'ناموجود')}\nChat type: ${html(message.chat.type || 'unknown')}</code></pre>\n<blockquote>برای فعال کردن فرمان‌های مدیریتی، User ID را به <code>BOT_ADMIN_IDS</code> اضافه کن.</blockquote>`, token);
      return;
    case 'setchannel': {
      if (message.chat.type === 'private') {
        await sendMessage(chatId, '⚠️ <b>این دستور را داخل گروه/کانال مقصد اجرا کن.</b>\n<blockquote>ربات باید مجوز ارسال پیام در مقصد را داشته باشد.</blockquote>', token);
        return;
      }
      if (!await isChatAdmin(message, env)) {
        await sendMessage(chatId, '🔐 <b>فقط مدیر چت می‌تواند مقصد ارسال خودکار را ثبت کند.</b>', token);
        return;
      }
      if (!env.SETTINGS_KV) {
        await sendMessage(chatId, '❌ <b>تنظیمات ذخیره‌سازی پیکربندی نشده است.</b>\n<blockquote>Binding با نام <code>SETTINGS_KV</code> را به Worker متصل کن.</blockquote>', token);
        return;
      }
      const channels = await getChannelSettings(env);
      const target = String(chatId);
      if (channels.includes(target)) {
        await sendMessage(chatId, 'ℹ️ این گروه/کانال از قبل در فهرست گزارش خودکار قرار دارد.', token);
        return;
      }
      if (channels.length >= MAX_CHANNELS) {
        await sendMessage(chatId, `⚠️ ظرفیت تنظیم‌شدهٔ ربات ${MAX_CHANNELS} مقصد است. ابتدا یک مقصد دیگر را با <code>/stopchannel</code> حذف کن.`, token);
        return;
      }
      try {
        await saveChannelSettings(env, [...channels, target]);
        await sendMessage(chatId, '✅ <b>مقصد ثبت شد.</b>\n<blockquote>گزارش قیمت‌ها طبق زمان‌بندی Worker به این چت ارسال خواهد شد. برای لغو از <code>/stopchannel</code> استفاده کن.</blockquote>', token);
      } catch (error) {
        await sendMessage(chatId, `❌ ذخیره تنظیمات ناموفق بود.\n<blockquote>${html(error.message)}</blockquote>`, token);
      }
      return;
    }
    case 'stopchannel': {
      if (message.chat.type === 'private') {
        await sendMessage(chatId, '⚠️ این دستور را داخل همان گروه/کانالی اجرا کن که می‌خواهی گزارش آن متوقف شود.', token);
        return;
      }
      if (!await isChatAdmin(message, env)) {
        await sendMessage(chatId, '🔐 <b>فقط مدیر چت می‌تواند مقصد را حذف کند.</b>', token);
        return;
      }
      try {
        const channels = await getChannelSettings(env);
        const next = channels.filter((id) => id !== String(chatId));
        if (next.length === channels.length) await sendMessage(chatId, 'ℹ️ این چت در فهرست گزارش خودکار نبود.', token);
        else {
          await saveChannelSettings(env, next);
          await sendMessage(chatId, '🛑 <b>گزارش خودکار این چت متوقف شد.</b>', token);
        }
      } catch (error) {
        await sendMessage(chatId, `❌ حذف مقصد ناموفق بود.\n<blockquote>${html(error.message)}</blockquote>`, token);
      }
      return;
    }
    case 'refresh':
    case 'trigger':
      await requestRefreshForUser(message, env);
      return;
    case 'status': {
      const data = await fetchLatestData();
      if (!data) {
        await sendMessage(chatId, '🚨 <b>دادهٔ بازار در دسترس نیست.</b>\n<blockquote>آدرس latest.json، انتشار GitHub Pages و گزارش GitHub Actions را بررسی کن.</blockquote>', token);
        return;
      }
      const stale = isDataStale(data, env);
      const status = stale ? '🔴 قدیمی' : data.hasError ? '🟠 در دسترس با خطای جزئی' : '🟢 به‌روز';
      const staleAssets = [...Object.entries(data.prices || {}), ...Object.entries(data.market || {}), ...Object.entries(data.globalCrypto || {})].filter(([, item]) => item?.stale).map(([symbol]) => symbol);
      const body = [
        '🩺 <b>ArzPulse · وضعیت سیستم</b>',
        `<blockquote>وضعیت داده: <b>${status}</b>\nآخرین Snapshot: <code>${html(formatTime(data.timestamp))}</code>\nسن داده: <code>${html(ageText(data.timestamp))}</code>\nحد آستانهٔ کهنگی: <code>${formatNumber(currentStaleMinutes(env), 0)} دقیقه</code></blockquote>`,
        `<pre><code>Successful sources  ${formatNumber(data.successfulSources ?? '—', 0)}
Local sources       ${formatNumber(data.successfulLocalSources ?? '—', 0)}
Source errors       ${formatNumber(data.errorCount ?? data.errorDetails?.length ?? 0, 0)}
Stale assets        ${formatNumber(staleAssets.length, 0)}</code></pre>`,
        staleAssets.length ? `<blockquote>نمادهای قدیمی: <code>${html(staleAssets.join(', '))}</code></blockquote>` : '',
        data.hasError && data.errorDetails?.length ? `<blockquote>خطاهای آخرین جمع‌آوری:\n${html(data.errorDetails.slice(0, 5).join('\n'))}</blockquote>` : '',
        '<blockquote>ربات گزارش قیمت را ارائه می‌کند؛ زمان اجرای GitHub Actions را با صفحهٔ Actions بررسی کن.</blockquote>'
      ].filter(Boolean).join('\n\n');
      await sendMessage(chatId, body, token);
      return;
    }
    case 'prices':
    case 'price': {
      const data = await fetchLatestData();
      if (!data) {
        await sendMessage(chatId, '⚠️ <b>دریافت قیمت‌ها ناموفق بود.</b>\n<blockquote>آخرین داده از GitHub Pages دریافت نشد. کمی بعد دوباره تلاش کن.</blockquote>', token);
        return;
      }
      await sendMessage(chatId, generatePricesMessage(data, env), token);
      return;
    }
    case 'gold': {
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, '⚠️ دادهٔ طلا فعلاً در دسترس نیست.', token); return; }
      await sendMessage(chatId, generateGoldMessage(data, env), token);
      return;
    }
    case 'dollar': {
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, '⚠️ دادهٔ دلار فعلاً در دسترس نیست.', token); return; }
      const price = data.usdtPrice || data.dollarPrice || data.prices?.USDT?.bestSell;
      await sendMessage(chatId, [
        '💵 <b>ArzPulse · Dollar Reference</b>',
        `<blockquote>مرجع دلار بر پایهٔ بازار USDT/IRR نوبیتکس است و لزوماً نرخ اسکناس بازار آزاد نیست.</blockquote>`,
        `<pre><code>USDT / IRR  ${formatPrice(price)} ریال
USDT / USD  $1.00 approx.
24h change  ${formatPercent(data.dollarChange ?? data.prices?.USDT?.change)}
Updated     ${html(formatTime(data.timestamp))}</code></pre>`,
        isDataStale(data, env) ? '<blockquote>⚠️ Snapshot قدیمی است.</blockquote>' : ''
      ].filter(Boolean).join('\n\n'), token);
      return;
    }
    case 'btc': case 'eth': case 'usdt': case 'not': case 'bnb': case 'sol': case 'xrp': case 'ada': case 'doge': case 'trx': case 'link': case 'avax': case 'dot': case 'ltc': case 'bch': case 'shib': case 'uni': case 'near': case 'sui': case 'xlm': case 'etc': case 'atom': case 'apt': case 'fil': case 'arb': case 'op': case 'hbar': case 'inj': case 'aave': case 'pepe': {
      const symbol = command.name.toUpperCase();
      const data = await fetchLatestData();
      if (!data) { await sendMessage(chatId, `⚠️ دادهٔ ${symbol} در دسترس نیست.`, token); return; }
      if (data.prices?.[symbol] && [data.prices[symbol].lastPrice, data.prices[symbol].bestBuy, data.prices[symbol].bestSell].some(positive)) {
        await sendMessage(chatId, generateSingleAssetMessage(data.prices[symbol], getSymbolName(symbol), symbol, env, data), token);
      } else {
        await sendMessage(chatId, generateGlobalCryptoSingleMessage(symbol, data, env), token);
      }
      return;
    }
    default:
      if (message.chat.type === 'private') {
        const lower = String(message.text || '').toLowerCase();
        if (lower.includes('سلام') || /\b(hi|hello|salam)\b/.test(lower)) await sendMessage(chatId, getWelcomeMessage(), token);
        else if (lower.includes('قیمت') || lower.includes('price')) await sendMessage(chatId, '🤔 برای دریافت قیمت‌ها <code>/prices</code> و برای راهنمای کامل <code>/help</code> را بفرست.', token);
        else await sendMessage(chatId, `❓ دستور <code>${html(message.text || '')}</code> شناخته نشد.\nراهنما: <code>/help</code>`, token);
      }
  }
}

async function handleUpdate(update, env) {
  const message = update?.message || update?.channel_post;
  if (!message?.chat || !message?.text) return;
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.error('[config] TELEGRAM_BOT_TOKEN missing');
    return;
  }
  const command = parseCommand(message.text);
  if (command) {
    try { await handleCommand(message, command, env); }
    catch (error) {
      console.error(`[command:${command.name}] failed:`, error?.stack || error);
      await sendMessage(message.chat.id, `⚠️ <b>فرمان اجرا نشد.</b>\n<blockquote>خطای داخلی ثبت شد. برای جزئیات، Logs در Cloudflare Worker را بررسی کن.</blockquote>`, env.TELEGRAM_BOT_TOKEN);
    }
    return;
  }
  if (message.chat.type === 'private') {
    const text = String(message.text || '').toLowerCase();
    if (text.includes('سلام') || /\b(hi|hello|salam)\b/.test(text)) {
      await sendMessage(message.chat.id, getWelcomeMessage(), env.TELEGRAM_BOT_TOKEN);
    } else if (text.includes('قیمت') || text.includes('price')) {
      await sendMessage(message.chat.id, '📊 برای دیدن بازار <code>/prices</code>، برای نمودار <code>/chart</code> و برای وضعیت سیستم <code>/status</code> را بفرست.', env.TELEGRAM_BOT_TOKEN);
    }
  }
}

async function sendAutoUpdates(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token || !env.SETTINGS_KV) {
    console.warn('[scheduled] Telegram token or SETTINGS_KV is not configured; automatic channel updates skipped.');
    return;
  }
  const channels = await getChannelSettings(env);
  if (!channels.length) return;
  const data = await fetchLatestData();
  if (!data) {
    console.warn('[scheduled] price data unavailable; automatic channel update skipped.');
    return;
  }
  const message = generatePricesMessage(data, env);
  let success = 0;
  for (const chatId of channels) {
    try {
      const delivered = await sendMessage(chatId, message, token);
      if (delivered) success += 1;
      else throw new Error('Telegram sendMessage returned no message id');
    } catch (error) {
      console.error(`[scheduled] channel ${chatId} send failed:`, error.message);
    }
  }
  console.log(`[scheduled] automatic reports sent to ${success}/${channels.length} configured destination(s).`);
}

function authorizedAdminRequest(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const header = request.headers.get('x-admin-secret') || '';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return header === env.ADMIN_SECRET || bearer === env.ADMIN_SECRET;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function safeHealth(env) {
  return {
    status: 'ok',
    service: 'ArzPulse Telegram Bot',
    timestamp: new Date().toISOString(),
    telegramTokenConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
    telegramWebhookSecretConfigured: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
    githubTokenConfigured: Boolean(env.GITHUB_TOKEN),
    settingsKvBound: Boolean(env.SETTINGS_KV),
    adminAllowlistConfigured: adminIdSet(env).size > 0,
    githubRepository: `${env.GITHUB_OWNER || 'mehrdadmb2'}/${env.GITHUB_REPO || 'ArzPulse'}`
  };
}

async function diagnosticDetails(env) {
  const health = safeHealth(env);
  if (env.SETTINGS_KV) {
    try {
      const channels = await getChannelSettings(env);
      health.settingsKv = { readOk: true, configuredDestinations: channels.length };
    } catch (error) {
      health.settingsKv = { readOk: false, error: error.message };
    }
  } else {
    health.settingsKv = { readOk: false, error: 'SETTINGS_KV binding is missing' };
  }
  const latest = await fetchLatestData();
  health.marketData = latest ? {
    available: true,
    timestamp: latest.timestamp || null,
    age: ageText(latest.timestamp),
    stale: isDataStale(latest, env),
    hasError: Boolean(latest.hasError),
    errorCount: Number(latest.errorCount || latest.errorDetails?.length || 0)
  } : { available: false };
  if (env.TELEGRAM_BOT_TOKEN) {
    try {
      const webhook = await telegramApi('getWebhookInfo', env.TELEGRAM_BOT_TOKEN, {});
      health.telegramWebhook = {
        configured: Boolean(webhook?.url),
        pendingUpdateCount: Number(webhook?.pending_update_count || 0),
        lastErrorDate: webhook?.last_error_date ? new Date(webhook.last_error_date * 1000).toISOString() : null,
        lastErrorMessage: webhook?.last_error_message || null,
        allowedUpdates: webhook?.allowed_updates || []
      };
    } catch (error) {
      health.telegramWebhook = { configured: false, diagnosticError: error.message };
    }
  }
  return health;
}

async function handlePublicRootTrigger(env) {
  // The deployed public root URL is intentionally a trigger endpoint as well as
  // a health response. A short KV cooldown prevents repeated visits from flooding
  // GitHub Actions; scheduled five-minute runs do not depend on this lock.
  try {
    const lock = await requestRefreshLock(env);
    if (!lock.acquired) {
      return jsonResponse({
        ...safeHealth(env),
        workflowDispatch: {
          ok: true,
          dispatched: false,
          reason: 'recent-refresh-lock',
          retryAfterSeconds: lock.remaining
        }
      });
    }
    await dispatchGitHubUpdate(env);
    return jsonResponse({
      ...safeHealth(env),
      workflowDispatch: {
        ok: true,
        dispatched: true,
        workflow: String(env.GITHUB_WORKFLOW || 'update-prices.yml'),
        ref: String(env.GITHUB_REF || 'main'),
        message: 'GitHub Actions workflow_dispatch accepted; the workflow runs asynchronously.'
      }
    });
  } catch (error) {
    console.error('[root-trigger] failed:', error?.stack || error);
    return jsonResponse({
      ...safeHealth(env),
      workflowDispatch: { ok: false, dispatched: false, error: error.message }
    }, 502);
  }
}

async function handleAdminEndpoint(request, env, route) {
  if (!authorizedAdminRequest(request, env)) return jsonResponse({ error: 'unauthorized', message: 'Configure ADMIN_SECRET and send it via x-admin-secret or Authorization: Bearer.' }, env.ADMIN_SECRET ? 401 : 503);
  if (route === '/diagnostics') return jsonResponse(await diagnosticDetails(env));
  if (route === '/send') {
    await sendAutoUpdates(env);
    return jsonResponse({ ok: true, message: 'Channel update pass completed. Check Worker logs for per-destination failures.' });
  }
  if (route === '/check' || route === '/trigger') {
    try {
      const lock = await requestRefreshLock(env);
      if (!lock.acquired) return jsonResponse({ ok: true, dispatched: false, reason: 'recent-refresh-lock', retryAfterSeconds: lock.remaining });
      await dispatchGitHubUpdate(env);
      return jsonResponse({ ok: true, dispatched: true, message: 'Workflow dispatch accepted; collection completes asynchronously.' });
    } catch (error) {
      return jsonResponse({ ok: false, error: error.message }, 502);
    }
  }
  return jsonResponse({ error: 'not-found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/webhook') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      if (!env.TELEGRAM_WEBHOOK_SECRET) {
        console.error('[webhook] TELEGRAM_WEBHOOK_SECRET is not configured; refusing unauthenticated updates.');
        return new Response('Webhook secret is not configured', { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
      const provided = request.headers.get('x-telegram-bot-api-secret-token') || '';
      if (provided !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 });
      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > 1024 * 1024) return new Response('Payload Too Large', { status: 413 });
      let update;
      try { update = await request.json(); }
      catch { return new Response('Bad Request', { status: 400 }); }
      if (!update || typeof update !== 'object' || !Number.isInteger(update.update_id)) {
        return new Response('Invalid Telegram update', { status: 400 });
      }

      // Telegram receives an immediate 200 response; processing continues under waitUntil,
      // preventing slow chart rendering or upstream requests from causing webhook retries.
      const updateId = update?.update_id;
      if (Number.isInteger(updateId)) {
        const now = Date.now();
        for (const [id, at] of recentUpdateIds) if (now - at > 10 * 60 * 1000) recentUpdateIds.delete(id);
        if (recentUpdateIds.has(updateId)) return new Response('OK', { status: 200 });
        recentUpdateIds.set(updateId, now);
        while (recentUpdateIds.size > 512) recentUpdateIds.delete(recentUpdateIds.keys().next().value);
      }
      ctx.waitUntil(handleUpdate(update, env).catch((error) => console.error('[webhook] background handler failed:', error?.stack || error)));
      return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (url.pathname === '/') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
      return handlePublicRootTrigger(env);
    }
    if (url.pathname === '/health' || url.pathname === '/test') {
      return jsonResponse(safeHealth(env));
    }
    if (url.pathname === '/diagnostics' || url.pathname === '/check' || url.pathname === '/send' || url.pathname === '/trigger') {
      return handleAdminEndpoint(request, env, url.pathname);
    }
    return jsonResponse({ error: 'not-found', service: 'ArzPulse Telegram Bot' }, 404);
  },

  async scheduled(event, env, ctx) {
    // The existing public `arzpulse-bot` Worker dispatches GitHub Actions and
    // independently evaluates Telegram alert thresholds every five minutes.
    if (event?.cron === '*/5 * * * *') {
      const dispatchTask = dispatchGitHubUpdate(env)
        .then(() => console.log('[scheduled] GitHub workflow dispatch accepted for', `${env.GITHUB_OWNER || 'mehrdadmb2'}/${env.GITHUB_REPO || 'ArzPulse'}`, env.GITHUB_WORKFLOW || 'update-prices.yml'))
        .catch((error) => console.error('[scheduled] market workflow dispatch failed:', error?.stack || error));
      const alertTask = processAutomaticAlerts(env)
        .catch((error) => console.error('[scheduled] automatic alerts failed:', error?.stack || error));
      ctx.waitUntil(Promise.allSettled([dispatchTask, alertTask]));
      return;
    }
    // Keep the already configured hourly Telegram channel digest unchanged.
    ctx.waitUntil(sendAutoUpdates(env).catch((error) => console.error('[scheduled] channel report failed:', error?.stack || error)));
  }
};
