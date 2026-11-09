import test from 'node:test';
import assert from 'node:assert/strict';
import bot from '../index.js';

function ctxRecorder() {
  const tasks = [];
  return { tasks, ctx: { waitUntil(promise) { tasks.push(Promise.resolve(promise)); } } };
}

test('health endpoint is public but never returns secret values', async () => {
  const response = await bot.fetch(new Request('https://worker.test/health'), {
    TELEGRAM_BOT_TOKEN: 'should-not-leak', GITHUB_TOKEN: 'also-should-not-leak', ADMIN_SECRET: 'never-print'
  }, ctxRecorder().ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.telegramTokenConfigured, true);
  assert.equal(JSON.stringify(body).includes('should-not-leak'), false);
  assert.equal(JSON.stringify(body).includes('never-print'), false);
});

test('webhook rejects GET and validates the configured Telegram secret', async () => {
  const env = { TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret', TELEGRAM_BOT_TOKEN: 'fake-token' };
  const getResponse = await bot.fetch(new Request('https://worker.test/webhook'), env, ctxRecorder().ctx);
  assert.equal(getResponse.status, 405);

  const bad = await bot.fetch(new Request('https://worker.test/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'wrong' },
    body: JSON.stringify({ update_id: 990001, message: { text: '/start', chat: { id: 1, type: 'private' } } })
  }), env, ctxRecorder().ctx);
  assert.equal(bad.status, 401);
});

test('valid /start webhook is acknowledged quickly and emits Telegram HTML formatting', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    telegramCalls.push({ url, init });
    if (!url.startsWith('https://api.telegram.org/botfake-token/')) throw new Error(`Unexpected network call in smoke test: ${url}`);
    return new Response(JSON.stringify({ ok: true, result: { message_id: 77, chat: { id: 42 } } }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test-webhook-secret' },
      body: JSON.stringify({ update_id: 990002, message: { text: '/start', chat: { id: 42, type: 'private' }, from: { id: 42 } } })
    }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret' }, ctx);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'OK');
    await Promise.all(tasks);
    assert.equal(telegramCalls.length, 1);
    const payload = JSON.parse(telegramCalls[0].init.body);
    assert.equal(payload.parse_mode, 'HTML');
    assert.match(payload.text, /<pre><code>/);
    assert.match(payload.text, /<blockquote>/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('manual diagnostic and trigger endpoints require ADMIN_SECRET', async () => {
  for (const route of ['/diagnostics', '/check', '/send', '/trigger']) {
    const response = await bot.fetch(new Request(`https://worker.test${route}`, { method: 'GET' }), {}, ctxRecorder().ctx);
    assert.equal(response.status, 503, `${route} should be disabled when ADMIN_SECRET is missing`);
  }
});


test('webhook fails closed if TELEGRAM_WEBHOOK_SECRET is not configured', async () => {
  const response = await bot.fetch(new Request('https://worker.test/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ update_id: 990003, message: { text: '/start', chat: { id: 1, type: 'private' } } })
  }), { TELEGRAM_BOT_TOKEN: 'fake-token' }, ctxRecorder().ctx);
  assert.equal(response.status, 503);
});

test('webhook rejects malformed updates after secret validation', async () => {
  const response = await bot.fetch(new Request('https://worker.test/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test-secret' },
    body: JSON.stringify({ hello: 'world' })
  }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'test-secret' }, ctxRecorder().ctx);
  assert.equal(response.status, 400);
});

test('unknown paths return 404 and do not expose secrets', async () => {
  const response = await bot.fetch(new Request('https://worker.test/not-a-route'), {
    TELEGRAM_BOT_TOKEN: 'never-leak', ADMIN_SECRET: 'also-never-leak'
  }, ctxRecorder().ctx);
  assert.equal(response.status, 404);
  const body = await response.text();
  assert.equal(body.includes('never-leak'), false);
});

test('new /crypto command returns expanded global crypto data from snapshot', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const snapshot = {
    timestamp: new Date().toISOString(),
    usdtPrice: 900000,
    prices: { USDT: { lastPrice: 900000, bestBuy: 899000, bestSell: 901000, change: 0.3 } },
    globalCrypto: {
      BTC: { last: 65000, change: 2.2, high: 66000, low: 63000, volumeUsd: 21000000000, volumeBase: 320000, trades: 1200000, timestamp: new Date().toISOString(), source: 'Binance Spot' },
      SOL: { last: 145, change: -1.4, high: 151, low: 142, volumeUsd: 2200000000, volumeBase: 15000000, trades: 220000, timestamp: new Date().toISOString(), source: 'Binance Spot' }
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) {
      return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 92, chat: { id: 42 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in /crypto test: ${url}`);
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test-secret' },
      body: JSON.stringify({ update_id: 991001, message: { text: '/crypto', chat: { id: 42, type: 'private' }, from: { id: 42 } } })
    }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'test-secret' }, ctx);
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    assert.ok(telegramCalls.some((call) => /Global Crypto Board/.test(call.text)));
    assert.ok(telegramCalls.some((call) => /BTC/.test(call.text) && /SOL/.test(call.text)));
    assert.ok(telegramCalls.some((call) => /Binance Spot/.test(call.text)));
  } finally { globalThis.fetch = originalFetch; }
});

test('new /macro command includes sentiment, global metrics and derivative context', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const snapshot = {
    timestamp: new Date().toISOString(),
    prices: { USDT: { lastPrice: 900000, bestSell: 900000 } },
    market: { DXY: { last: 103.2, change: -0.4 }, SP500: { last: 6100, change: 0.5 }, BRENT: { last: 71.3, change: -1.1 } },
    globalCrypto: { BTC: { last: 65000, change: 2.2 }, SOL: { last: 145, change: -1.4 } },
    marketContext: {
      fearGreed: { value: 62, classification: 'Greed', yesterday: { value: 55, classification: 'Greed' }, timestamp: new Date().toISOString() },
      global: { totalMarketCapUsd: 2300000000000, totalVolume24hUsd: 89000000000, btcDominance: 54.2, marketCapChange24h: 1.3 },
      derivatives: { BTC: { fundingRate: 0.0001, markPrice: 65020, indexPrice: 64990, openInterestUsd: 18000000000 }, ETH: { fundingRate: -0.00005, markPrice: 3200, indexPrice: 3198 } }
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 93, chat: { id: 42 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in /macro test: ${url}`);
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'test-secret' },
      body: JSON.stringify({ update_id: 991002, message: { text: '/macro', chat: { id: 42, type: 'private' }, from: { id: 42 } } })
    }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'test-secret' }, ctx);
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    const text = telegramCalls.map((call) => call.text).join('\n');
    assert.match(text, /Market Drivers/);
    assert.match(text, /Fear &amp; Greed|Fear & Greed/);
    assert.match(text, /BTC dominance/);
    assert.match(text, /open interest/i);
    assert.match(text, /DXY/);
  } finally { globalThis.fetch = originalFetch; }
});

test('alert commands store per-chat preferences in SETTINGS_KV', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map();
  const settingsKV = {
    async get(key, options = {}) {
      const raw = kvData.get(key);
      if (raw == null) return null;
      return options.type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) { kvData.set(key, String(value)); }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      const payload = JSON.parse(init.body); telegramCalls.push(payload);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 101, chat: { id: 12345 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in alerts command test: ${url}`);
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'alert-test' },
      body: JSON.stringify({ update_id: 992001, message: { text: '/alertlevel low', chat: { id: 12345, type: 'private' }, from: { id: 12345 } } })
    }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'alert-test', SETTINGS_KV: settingsKV }, ctx);
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    const prefs = JSON.parse(kvData.get('alerts:subscribers:v1'));
    assert.equal(prefs['12345'].enabled, true);
    assert.equal(prefs['12345'].level, 'low');
    assert.match(telegramCalls[0].text, /حساسیت هشدار تنظیم شد/);
  } finally { globalThis.fetch = originalFetch; }
});

test('five-minute schedule emits a detailed price-shock alert with cooldown baseline', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map([['channels', JSON.stringify(['4242'])]]);
  const settingsKV = {
    async get(key, options = {}) {
      const raw = kvData.get(key);
      if (raw == null) return null;
      return options.type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) { kvData.set(key, String(value)); }
  };
  let btc = 100;
  let stamp = new Date(Date.now() - 5 * 60_000).toISOString();
  let dayChange = 1;
  const snapshot = () => ({
    timestamp: stamp, usdtPrice: 900000, dollarPrice: 900000,
    prices: { USDT: { lastPrice: 900000, bestBuy: 899000, bestSell: 901000, change: 0.1, source: 'Nobitex', fetchedAt: stamp } },
    market: {},
    globalCrypto: { BTC: { last: btc, change: dayChange, high: btc * 1.02, low: btc * 0.98, volumeUsd: 25000000000, trades: 1000000, timestamp: stamp, source: 'Binance Spot', stale: false } },
    marketContext: { global: { totalMarketCapUsd: 2300000000000, btcDominance: 54, ethDominance: 18, source: 'CoinGecko', timestamp: stamp } }
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot()), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.github.com/repos/mehrdadmb2/ArzPulse/actions/workflows/update-prices.yml/dispatches')) return new Response(null, { status: 204 });
    if (url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 78, chat: { id: 4242 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in scheduled alert test: ${url}`);
  };
  try {
    const env = { TELEGRAM_BOT_TOKEN: 'fake-token', GITHUB_TOKEN: 'fake-github-token', SETTINGS_KV: settingsKV, DATA_STALE_MINUTES: '15' };
    let state = ctxRecorder();
    await bot.scheduled({ cron: '*/5 * * * *' }, env, state.ctx);
    await Promise.all(state.tasks);
    assert.equal(telegramCalls.length, 0, 'first tick should only establish a baseline');
    btc = 102; stamp = new Date().toISOString(); dayChange = 1.1;
    state = ctxRecorder();
    await bot.scheduled({ cron: '*/5 * * * *' }, env, state.ctx);
    await Promise.all(state.tasks);
    assert.equal(telegramCalls.length, 1);
    assert.match(telegramCalls[0].text, /هشدار خودکار بازار/);
    assert.match(telegramCalls[0].text, /بیت‌کوین/);
    assert.match(telegramCalls[0].text, /تغییر از Snapshot قبلی/);
    assert.ok(kvData.has('alerts:state:v2'), 'rolling alert baseline and snapshots should use the consolidated KV state');
    assert.ok(kvData.has('alerts:cooldowns:v1'));
  } finally { globalThis.fetch = originalFetch; }
});

test('sudden move and timeframe move are combined into one detailed alert', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map([['channels', JSON.stringify(['5252'])]]);
  const settingsKV = {
    async get(key, options = {}) {
      const raw = kvData.get(key);
      if (raw == null) return null;
      return options.type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) { kvData.set(key, String(value)); }
  };
  let btc = 100;
  let stamp = new Date(Date.now() - 10 * 60_000).toISOString();
  const snapshot = () => ({
    timestamp: stamp, usdtPrice: 900000, dollarPrice: 900000,
    prices: { USDT: { lastPrice: 900000, bestBuy: 899000, bestSell: 901000, change: 0.1, source: 'Nobitex', fetchedAt: stamp } },
    market: {},
    globalCrypto: { BTC: { last: btc, change: 1, high: btc * 1.02, low: btc * 0.98, volumeUsd: 25000000000, trades: 1000000, timestamp: stamp, source: 'Binance Spot', stale: false } },
    marketContext: { global: { totalMarketCapUsd: 2300000000000, btcDominance: 54, ethDominance: 18, source: 'CoinGecko', timestamp: stamp } }
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot()), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.github.com/repos/mehrdadmb2/ArzPulse/actions/workflows/update-prices.yml/dispatches')) return new Response(null, { status: 204 });
    if (url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 79, chat: { id: 5252 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in combined-alert test: ${url}`);
  };
  try {
    const env = { TELEGRAM_BOT_TOKEN: 'fake-token', GITHUB_TOKEN: 'fake-github-token', SETTINGS_KV: settingsKV, DATA_STALE_MINUTES: '15' };
    let state = ctxRecorder();
    await bot.scheduled({ cron: '*/5 * * * *' }, env, state.ctx);
    await Promise.all(state.tasks);
    assert.equal(telegramCalls.length, 0);
    btc = 103;
    stamp = new Date().toISOString();
    state = ctxRecorder();
    await bot.scheduled({ cron: '*/5 * * * *' }, env, state.ctx);
    await Promise.all(state.tasks);
    assert.equal(telegramCalls.length, 1, 'shock and timeframe context should be combined instead of duplicated');
    assert.match(telegramCalls[0].text, /تغییر از Snapshot قبلی/);
    assert.match(telegramCalls[0].text, /تغییر ۱۵ دقیقه اخیر/);
    const cooldowns = JSON.parse(kvData.get('alerts:cooldowns:v1'));
    assert.ok(cooldowns['move:global:BTC']);
    assert.ok(cooldowns['window:global:BTC:15m']);
  } finally { globalThis.fetch = originalFetch; }
});


test('v8 /stocks and /forex commands render real snapshot sections and source freshness', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const snapshot = {
    timestamp: new Date().toISOString(),
    prices: {}, market: {},
    equities: {
      AAPL: { last: 225.5, change: 1.2, high: 227, low: 221, volume: 1200000, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: false },
      NVDA: { last: 188.2, change: -2.1, high: 192, low: 185, volume: 3200000, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: false },
      SPCX: { last: 135.4, change: 3.1, high: 137, low: 130, volume: 200000, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: false }
    },
    forex: {
      EURUSD: { last: 1.15432, change: 0.21, high: 1.16, low: 1.15, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: false },
      USDJPY: { last: 153.82, change: -0.16, high: 154.2, low: 153.5, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: false }
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 140, chat: { id: 42 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in v8 markets test: ${url}`);
  };
  try {
    for (const [updateId, command] of [[993001, '/stocks'], [993002, '/forex'], [993003, '/spcx']]) {
      const state = ctxRecorder();
      const response = await bot.fetch(new Request('https://worker.test/webhook', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'v8-markets' },
        body: JSON.stringify({ update_id: updateId, message: { text: command, chat: { id: 42, type: 'private' }, from: { id: 42 } } })
      }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'v8-markets' }, state.ctx);
      assert.equal(response.status, 200);
      await Promise.all(state.tasks);
    }
    const output = telegramCalls.map((call) => call.text).join('\n');
    assert.match(output, /US Equities/);
    assert.match(output, /AAPL/);
    assert.match(output, /SPCX/);
    assert.match(output, /Forex Board/);
    assert.match(output, /EURUSD/);
    assert.match(output, /Yahoo Finance Chart/);
  } finally { globalThis.fetch = originalFetch; }
});

test('/chart supports real equity and forex history symbols', async () => {
  const originalFetch = globalThis.fetch;
  const telegramMethods = [];
  const now = Date.now();
  const historyRows = [
    { time: new Date(now - 2 * 60 * 60_000).toISOString(), AAPL: 220.5, EURUSD: 1.15125 },
    { time: new Date(now - 60 * 60_000).toISOString(), AAPL: 223.4, EURUSD: 1.15310 }
  ];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify({ timestamp: new Date().toISOString(), equities: {}, forex: {} }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/history/')) return new Response(JSON.stringify(historyRows), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://quickchart.io/chart')) return new Response(new Uint8Array([137,80,78,71]), { status: 200, headers: { 'content-type': 'image/png' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      const method = url.split('/').pop();
      telegramMethods.push(method);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 200 + telegramMethods.length, chat: { id: 42 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in equity/FX chart test: ${url}`);
  };
  try {
    for (const [updateId, command] of [[993050, '/chart AAPL 7d'], [993051, '/chart EURUSD 7d']]) {
      const state = ctxRecorder();
      const response = await bot.fetch(new Request('https://worker.test/webhook', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'chart-test' },
        body: JSON.stringify({ update_id: updateId, message: { text: command, chat: { id: 42, type: 'private' }, from: { id: 42 } } })
      }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'chart-test' }, state.ctx);
      assert.equal(response.status, 200);
      await Promise.all(state.tasks);
    }
    assert.equal(telegramMethods.filter((method) => method === 'sendPhoto').length, 2);
    assert.equal(telegramMethods.filter((method) => method === 'editMessageText').length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('/alertscope persists per-chat market filters without enabling alerts implicitly', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map();
  const settingsKV = {
    async get(key, options = {}) { const raw=kvData.get(key); if(raw==null)return null; return options.type==='json'?JSON.parse(raw):raw; },
    async put(key,value) { kvData.set(key,String(value)); }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url=String(input);
    if(url.startsWith('https://api.telegram.org/botfake-token/')) { telegramCalls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ok:true,result:{message_id:141,chat:{id:42}}}),{status:200,headers:{'content-type':'application/json'}}); }
    throw new Error(`Unexpected network call in alertscope test: ${url}`);
  };
  try {
    const state=ctxRecorder();
    const response=await bot.fetch(new Request('https://worker.test/webhook',{method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':'scope-test'},body:JSON.stringify({update_id:993100,message:{text:'/alertscope stocks forex',chat:{id:42,type:'private'},from:{id:42}}})}),{TELEGRAM_BOT_TOKEN:'fake-token',TELEGRAM_WEBHOOK_SECRET:'scope-test',SETTINGS_KV:settingsKV},state.ctx);
    assert.equal(response.status,200); await Promise.all(state.tasks);
    const preferences=JSON.parse(kvData.get('alerts:subscribers:v1'));
    assert.deepEqual(preferences['42'].markets,['stocks','forex']);
    assert.equal(preferences['42'].enabled,false);
    assert.match(telegramCalls[0].text,/دامنهٔ هشدار به‌روزرسانی شد/);
  } finally { globalThis.fetch=originalFetch; }
});


test('forex price shocks use FX thresholds and only notify forex-scoped subscribers', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map([
    ['alerts:subscribers:v1', JSON.stringify({ '6262': { enabled: true, level: 'low', markets: ['forex'] } })],
    ['channels', JSON.stringify([])]
  ]);
  const settingsKV = {
    async get(key, options = {}) { const raw=kvData.get(key); if(raw==null)return null; return options.type==='json'?JSON.parse(raw):raw; },
    async put(key,value) { kvData.set(key,String(value)); }
  };
  let fxPrice = 1.15;
  let stamp = new Date(Date.now() - 5 * 60_000).toISOString();
  const snapshot = () => ({
    timestamp: stamp, prices: {}, market: {}, equities: {},
    forex: { EURUSD: { last: fxPrice, change: 0.1, high: fxPrice * 1.01, low: fxPrice * 0.99, source: 'Yahoo Finance Chart (unofficial / delayed)', stale: false, fetchedAt: stamp } }
  });
  globalThis.fetch = async (input, init = {}) => {
    const url=String(input);
    if(url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot()),{status:200,headers:{'content-type':'application/json'}});
    if(url.startsWith('https://api.github.com/repos/mehrdadmb2/ArzPulse/actions/workflows/update-prices.yml/dispatches')) return new Response(null,{status:204});
    if(url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) { telegramCalls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ok:true,result:{message_id:191,chat:{id:6262}}}),{status:200,headers:{'content-type':'application/json'}}); }
    throw new Error(`Unexpected network call in forex alert test: ${url}`);
  };
  try {
    const env={TELEGRAM_BOT_TOKEN:'fake-token',GITHUB_TOKEN:'fake-github-token',SETTINGS_KV:settingsKV,DATA_STALE_MINUTES:'15',ALERT_FOREX_MOVE_PCT:'0.18'};
    let state=ctxRecorder(); await bot.scheduled({cron:'*/5 * * * *'},env,state.ctx); await Promise.all(state.tasks);
    assert.equal(telegramCalls.length,0,'first snapshot establishes baseline only');
    fxPrice=1.1532; stamp=new Date().toISOString();
    state=ctxRecorder(); await bot.scheduled({cron:'*/5 * * * *'},env,state.ctx); await Promise.all(state.tasks);
    assert.equal(telegramCalls.length,1);
    assert.match(telegramCalls[0].text,/EURUSD/);
    assert.match(telegramCalls[0].text,/Yahoo Finance Chart/);
    assert.match(telegramCalls[0].text,/هشدار خودکار بازار/);
  } finally { globalThis.fetch=originalFetch; }
});

test('stock price shocks use dedicated thresholds and deliver to stock-scoped subscribers', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map([
    ['alerts:subscribers:v1', JSON.stringify({ '5252': { enabled: true, level: 'low', markets: ['stocks'] } })],
    ['channels', JSON.stringify([])]
  ]);
  const settingsKV = {
    async get(key, options = {}) { const raw=kvData.get(key); if(raw==null)return null; return options.type==='json'?JSON.parse(raw):raw; },
    async put(key,value) { kvData.set(key,String(value)); }
  };
  let stockPrice = 100;
  let stamp = new Date(Date.now() - 5 * 60_000).toISOString();
  const snapshot = () => ({
    timestamp: stamp, prices: {}, market: {},
    equities: { NVDA: { last: stockPrice, change: 0.4, high: stockPrice * 1.02, low: stockPrice * 0.98, volume: 1000000, source: 'Yahoo Finance Chart (unofficial / delayed)', stale: false, fetchedAt: stamp } },
    forex: { EURUSD: { last: 1.15, change: 0.1, source: 'Yahoo Finance Chart (unofficial / delayed)', stale: false, fetchedAt: stamp } }
  });
  globalThis.fetch = async (input, init = {}) => {
    const url=String(input);
    if(url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot()),{status:200,headers:{'content-type':'application/json'}});
    if(url.startsWith('https://api.github.com/repos/mehrdadmb2/ArzPulse/actions/workflows/update-prices.yml/dispatches')) return new Response(null,{status:204});
    if(url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) { telegramCalls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ok:true,result:{message_id:181,chat:{id:5252}}}),{status:200,headers:{'content-type':'application/json'}}); }
    throw new Error(`Unexpected network call in stock alert test: ${url}`);
  };
  try {
    const env={TELEGRAM_BOT_TOKEN:'fake-token',GITHUB_TOKEN:'fake-github-token',SETTINGS_KV:settingsKV,DATA_STALE_MINUTES:'15',ALERT_STOCK_MOVE_PCT:'0.8'};
    let state=ctxRecorder(); await bot.scheduled({cron:'*/5 * * * *'},env,state.ctx); await Promise.all(state.tasks);
    assert.equal(telegramCalls.length,0,'first snapshot establishes baseline only');
    stockPrice=101.2; stamp=new Date().toISOString();
    state=ctxRecorder(); await bot.scheduled({cron:'*/5 * * * *'},env,state.ctx); await Promise.all(state.tasks);
    assert.equal(telegramCalls.length,1);
    assert.match(telegramCalls[0].text,/NVDA/);
    assert.match(telegramCalls[0].text,/Yahoo Finance Chart/);
    assert.match(telegramCalls[0].text,/هشدار خودکار بازار/);
  } finally { globalThis.fetch=originalFetch; }
});

test('v8 /prices includes the full local, crypto, stock, forex and macro watchlists', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const now = new Date().toISOString();
  const equities = Object.fromEntries(['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','AVGO','AMD','ORCL','PLTR','COIN','SPCX'].map((symbol, index) => [symbol, { last: 100 + index, change: 0.4, high: 105 + index, low: 95 + index, volume: 100000, timestamp: now, fetchedAt: now, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: true }]));
  const forex = Object.fromEntries(['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','USDTRY','EURGBP','EURJPY','GBPJPY','USDCNH'].map((symbol, index) => [symbol, { last: 1 + index / 10, change: 0.1, high: 1.2 + index / 10, low: 0.9 + index / 10, timestamp: now, fetchedAt: now, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: true }]));
  const globalCrypto = Object.fromEntries(['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','LINK','AVAX','DOT','LTC','BCH','SHIB','UNI','NEAR','SUI','XLM','ETC','ATOM','APT','FIL','ARB','OP','HBAR','INJ','AAVE','PEPE'].map((symbol, index) => [symbol, { last: 10 + index, change: 0.6, high: 12 + index, low: 8 + index, volumeUsd: 1000000, volumeBase: 1000, trades: 200, timestamp: now, source: 'Binance Spot' }]));
  const market = Object.fromEntries(['SP500','NASDAQ','DOW','RUSSELL2000','VIX','DXY','NIKKEI','FTSE100','DAX','HANGSENG','BRENT','WTI','XAUUSD','SILVER','NATGAS','COPPER','PLATINUM','PALLADIUM','US10Y'].map((symbol, index) => [symbol, { last: 100 + index, change: 0.25, source: 'Yahoo Finance Chart', timestamp: now }]));
  const snapshot = { timestamp: now, usdtPrice: 1000000, dollarPrice: 1000000, gold18K: 50000000, prices: { BTC: { lastPrice: 9000000000, bestBuy: 8990000000, bestSell: 9010000000, high: 9100000000, low: 8800000000, volume: 100, change: 1 }, ETH: { lastPrice: 300000000, bestBuy: 299000000, bestSell: 301000000, high: 305000000, low: 295000000, volume: 20, change: -1 }, USDT: { lastPrice: 1000000, bestBuy: 999000, bestSell: 1001000, high: 1002000, low: 998000, volume: 1000, change: 0.1 } }, equities, forex, globalCrypto, market, marketContext: { fearGreed: { value: 55, classification: 'Neutral' }, global: { btcDominance: 54, ethDominance: 18, totalMarketCapUsd: 2000000000000, totalVolume24hUsd: 80000000000 }, derivatives: { BTC: { fundingRate: 0.0001 } } } };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) { telegramCalls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ ok: true, result: { message_id: 200, chat: { id: 4200 } } }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    throw new Error(`Unexpected network call in v8 /prices test: ${url}`);
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'prices-v8' }, body: JSON.stringify({ update_id: 994001, message: { text: '/prices', chat: { id: 4200, type: 'private' }, from: { id: 4200 } } }) }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'prices-v8' }, ctx);
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    const combined = telegramCalls.map((call) => call.text).join('\n');
    for (const expected of ['Complete Market Snapshot','MSFT','SPCX','EURGBP','USDCNH','PEPE','NATGAS','Fear & Greed']) assert.match(combined, new RegExp(expected));
    assert.match(combined, /Yahoo Finance Chart/);
    assert.ok(telegramCalls.length >= 1);
    // Local-market cards must keep every price field on its own visible line.
    assert.match(combined, /<blockquote><b>آخرین قیمت:<\/b> <code>[\s\S]*?<\/code>\n<b>بهترین خرید:<\/b>/);
    assert.match(combined, /<b>بهترین فروش:<\/b>[\s\S]*?\n<b>بیشترین قیمت ۲۴ساعت:<\/b>/);
    assert.match(combined, /<b>کمترین قیمت ۲۴ساعت:<\/b>[\s\S]*?\n<b>حجم معاملات:<\/b>/);
    assert.match(combined, /<b>تغییر ۲۴ساعت:<\/b>/);
    // Large converted USD values should not flood the message with eight decimals.
    assert.match(combined, /\$۹٬۰۰۰(?:\s|<)/);
    assert.doesNotMatch(combined, /۹٬۰۰۰٫۰۰۰۰۰۰۰۰/);
  } finally { globalThis.fetch = originalFetch; }
});


test('/price alias uses the same readable multi-line local-market card layout', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const now = new Date().toISOString();
  const snapshot = {
    timestamp: now,
    usdtPrice: 2655990,
    prices: {
      BTC: { lastPrice: 196670010040, bestBuy: 196200020020, bestSell: 196345584670, high: 202540427100, low: 194987637620, volume: 8.9992, change: -2.5 },
      ETH: { lastPrice: 5602510120, bestBuy: 5590000000, bestSell: 5590478100, high: 5981417430, low: 5520000000, volume: 225.9611, change: -5.98 },
      USDT: { lastPrice: 2655990, bestBuy: 2650960, bestSell: 2655990, change: -0.24 }
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 300 + telegramCalls.length, chat: { id: 4210 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in /price alias test: ${url}`);
  };
  try {
    const { ctx, tasks } = ctxRecorder();
    const response = await bot.fetch(new Request('https://worker.test/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'price-alias-secret' },
      body: JSON.stringify({ update_id: 994099, message: { text: '/price', chat: { id: 4210, type: 'private' }, from: { id: 4210 } } })
    }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'price-alias-secret' }, ctx);
    assert.equal(response.status, 200);
    await Promise.all(tasks);
    const combined = telegramCalls.map((call) => call.text).join('\n');
    assert.match(combined, /BTC · بیت‌کوین/);
    assert.match(combined, /آخرین قیمت:/);
    assert.match(combined, /بهترین خرید:/);
    assert.match(combined, /بهترین فروش:/);
    assert.match(combined, /بیشترین قیمت ۲۴ساعت:/);
    assert.match(combined, /کمترین قیمت ۲۴ساعت:/);
    assert.match(combined, /حجم معاملات:/);
    assert.match(combined, /تغییر ۲۴ساعت:/);
    assert.match(combined, /\n<b>بهترین خرید:<\/b>/);
    assert.doesNotMatch(combined, /\\n/);
    assert.match(combined, /\$۷۴٬/);
    assert.doesNotMatch(combined, /٫\d{5,}/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('per-chat settings persist English digits and Toman output across subsequent price reports', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const kvData = new Map();
  const settingsKV = { async get(key, options = {}) { const raw=kvData.get(key); if(raw==null)return null; return options.type==='json'?JSON.parse(raw):raw; }, async put(key,value) { kvData.set(key,String(value)); } };
  const now = new Date().toISOString();
  const snapshot = { timestamp: now, usdtPrice: 1000000, dollarPrice: 1000000, prices: { BTC: { lastPrice: 1234567890, bestBuy: 1234000000, bestSell: 1235000000, high: 1300000000, low: 1200000000, volume: 10, change: 1.23 }, USDT: { lastPrice: 1000000, bestBuy: 999000, bestSell: 1001000, change: 0.1 } }, equities: { SPCX: { last: 100, change: 1.1, high: 102, low: 98, volume: 1000, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: true, timestamp: now } }, forex: { EURUSD: { last: 1.15342, change: 0.1, source: 'Yahoo Finance Chart (unofficial / delayed)', delayed: true, timestamp: now } }, globalCrypto: {}, market: {} };
  globalThis.fetch = async (input, init = {}) => {
    const url=String(input);
    if(url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot),{status:200,headers:{'content-type':'application/json'}});
    if(url.startsWith('https://api.telegram.org/botfake-token/sendMessage')) { telegramCalls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ok:true,result:{message_id:201,chat:{id:4300}}}),{status:200,headers:{'content-type':'application/json'}}); }
    throw new Error(`Unexpected network call in display-settings test: ${url}`);
  };
  try {
    const env={TELEGRAM_BOT_TOKEN:'fake-token',TELEGRAM_WEBHOOK_SECRET:'display-v8',SETTINGS_KV:settingsKV};
    let updateId=994010;
    for (const text of ['/numbers en','/currency irt','/prices','/settings']) {
      const {ctx,tasks}=ctxRecorder();
      const response=await bot.fetch(new Request('https://worker.test/webhook',{method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':'display-v8'},body:JSON.stringify({update_id:updateId++,message:{text,chat:{id:4300,type:'private'},from:{id:4300}}})}),env,ctx);
      assert.equal(response.status,200); await Promise.all(tasks);
    }
    const prefs=JSON.parse(kvData.get('chat:settings:v1'))['4300'];
    assert.equal(prefs.numberFormat,'en');
    assert.equal(prefs.currency,'irt');
    const combined=telegramCalls.map((call)=>call.text).join('\n');
    assert.match(combined,/English/);
    assert.match(combined,/تومان/);
    assert.match(combined,/1,000,000|123,456,789/);
    assert.match(combined,/واحد نمایش/);
  } finally { globalThis.fetch=originalFetch; }
});

test('scheduled personal digest follows per-chat interval and market scope', async () => {
  const originalFetch=globalThis.fetch;
  const telegramCalls=[];
  const kvData=new Map();
  const settingsKV={async get(key,options={}){const raw=kvData.get(key);if(raw==null)return null;return options.type==='json'?JSON.parse(raw):raw;},async put(key,value){kvData.set(key,String(value));}};
  const now=new Date().toISOString();
  const snapshot={timestamp:now,prices:{},equities:{AAPL:{last:200,change:1.2,high:203,low:198,volume:10000,source:'Yahoo Finance Chart (unofficial / delayed)',delayed:true,timestamp:now},NVDA:{last:150,change:-0.5,high:152,low:148,volume:20000,source:'Yahoo Finance Chart (unofficial / delayed)',delayed:true,timestamp:now}},forex:{EURUSD:{last:1.15,change:0.2,source:'Yahoo Finance Chart (unofficial / delayed)',delayed:true,timestamp:now}},globalCrypto:{},market:{}};
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);
    if(url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json'))return new Response(JSON.stringify(snapshot),{status:200,headers:{'content-type':'application/json'}});
    if(url.startsWith('https://api.github.com/repos/mehrdadmb2/ArzPulse/actions/workflows/update-prices.yml/dispatches'))return new Response(null,{status:204});
    if(url.startsWith('https://api.telegram.org/botfake-token/sendMessage')){telegramCalls.push(JSON.parse(init.body));return new Response(JSON.stringify({ok:true,result:{message_id:202,chat:{id:4400}}}),{status:200,headers:{'content-type':'application/json'}});}
    throw new Error(`Unexpected network call in digest test: ${url}`);
  };
  try{
    const env={TELEGRAM_BOT_TOKEN:'fake-token',TELEGRAM_WEBHOOK_SECRET:'digest-v8',GITHUB_TOKEN:'fake-github-token',SETTINGS_KV:settingsKV};
    let updateId=994020;
    for(const text of ['/digest 10m','/digestmarket stocks forex']){
      const {ctx,tasks}=ctxRecorder();
      await bot.fetch(new Request('https://worker.test/webhook',{method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':'digest-v8'},body:JSON.stringify({update_id:updateId++,message:{text,chat:{id:4400,type:'private'},from:{id:4400}}})}),env,ctx);
      await Promise.all(tasks);
    }
    const map=JSON.parse(kvData.get('chat:settings:v1'));
    assert.equal(map['4400'].digest.enabled,true);
    assert.equal(map['4400'].digest.intervalMinutes,10);
    assert.deepEqual(map['4400'].digest.markets,['stocks','forex']);
    map['4400'].digest.lastSentAt=Date.now()-11*60*1000;
    kvData.set('chat:settings:v1',JSON.stringify(map));
    telegramCalls.length=0;
    const state=ctxRecorder();
    await bot.scheduled({cron:'*/5 * * * *'},env,state.ctx);
    await Promise.all(state.tasks);
    const report=telegramCalls.map((call)=>call.text).join('\n');
    assert.match(report,/Complete Market Snapshot/);
    assert.match(report,/AAPL/);
    assert.match(report,/EURUSD/);
    assert.doesNotMatch(report,/🇮🇷 <b>بازار داخلی/);
    const after=JSON.parse(kvData.get('chat:settings:v1'));
    assert.ok(after['4400'].digest.lastSentAt>Date.now()-60_000);
  }finally{globalThis.fetch=originalFetch;}
});

test('/indices and /commodities render instrument-appropriate units', async () => {
  const originalFetch = globalThis.fetch;
  const telegramCalls = [];
  const snapshot = {
    timestamp: new Date().toISOString(),
    prices: { USDT: { bestSell: 1000000 } },
    dollarPrice: 1000000,
    market: {
      SP500: { last: 5200.25, change: 0.5, source: 'Yahoo Finance Chart' },
      VIX: { last: 18.75, change: -1.2 },
      US10Y: { last: 4.25, change: 0.02 },
      BRENT: { last: 78.4, change: 1.1 }
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.startsWith('https://api.telegram.org/botfake-token/')) {
      telegramCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 300 + telegramCalls.length, chat: { id: 42 } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected network call in macro category test: ${url}`);
  };
  try {
    for (const [updateId, command] of [[993220, '/indices'], [993221, '/commodities']]) {
      const state = ctxRecorder();
      const response = await bot.fetch(new Request('https://worker.test/webhook', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'macro-category-test' },
        body: JSON.stringify({ update_id: updateId, message: { text: command, chat: { id: 42, type: 'private' }, from: { id: 42 } } })
      }), { TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_WEBHOOK_SECRET: 'macro-category-test' }, state.ctx);
      assert.equal(response.status, 200);
      await Promise.all(state.tasks);
    }
    const output = telegramCalls.map((call) => call.text).join('\n');
    assert.match(output, /Global Indices/);
    assert.match(output, /۵٬۲۰۰٫۲۵ pts/);
    assert.match(output, /۴٫۲۵%/);
    assert.match(output, /Global Commodities/);
    assert.match(output, /BRENT/);
  } finally { globalThis.fetch = originalFetch; }
});


test('root and public health endpoints are read-only and never dispatch a GitHub workflow', async () => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls += 1; throw new Error('Public health must not make upstream calls'); };
  try {
    const response = await bot.fetch(new Request('https://arzpulse-bot.game-developer-mb.workers.dev/'), {
      TELEGRAM_BOT_TOKEN: 'fake-token',
      TELEGRAM_WEBHOOK_SECRET: 'fake-webhook-secret',
      GITHUB_TOKEN: 'fake-github-token',
      SETTINGS_KV: { get: async () => null, put: async () => {} },
      BOT_USERNAME: 'ExRateTrackerBot'
    }, ctxRecorder().ctx);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.service, 'ArzPulse Telegram Bot');
    assert.equal(body.botUsername, 'ExRateTrackerBot');
    assert.equal(body.endpoints.webhook, 'POST /webhook');
    assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('health explicitly reports degraded webhook configuration without exposing secrets', async () => {
  const response = await bot.fetch(new Request('https://worker.test/health'), {
    TELEGRAM_BOT_TOKEN: 'secret-token-value',
    SETTINGS_KV: { get: async () => null }
  }, ctxRecorder().ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.readiness, 'degraded');
  assert.equal(body.telegramWebhookSecretConfigured, false);
  assert.equal(body.adminSecretConfigured, false);
  assert.ok(body.warnings.some((warning) => warning.includes('TELEGRAM_WEBHOOK_SECRET')));
  assert.ok(body.warnings.some((warning) => warning.includes('ADMIN_SECRET')));
  assert.equal(JSON.stringify(body).includes('secret-token-value'), false);
});

test('protected webhook setup registers the exact worker URL and configured secret', async () => {
  const originalFetch = globalThis.fetch;
  const apiCalls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = url.split('/').pop();
    apiCalls.push({ method, payload: JSON.parse(init.body || '{}') });
    if (method === 'setWebhook') {
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'getWebhookInfo') {
      return new Response(JSON.stringify({ ok: true, result: {
        url: 'https://arzpulse-bot.game-developer-mb.workers.dev/webhook',
        pending_update_count: 0,
        allowed_updates: ['message', 'channel_post']
      } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected Telegram API call: ${url}`);
  };
  try {
    const response = await bot.fetch(new Request('https://arzpulse-bot.game-developer-mb.workers.dev/webhook/setup', {
      method: 'POST',
      headers: { authorization: 'Bearer admin-secret' }
    }), {
      ADMIN_SECRET: 'admin-secret',
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_WEBHOOK_SECRET: 'strong_webhook_secret-123',
      BOT_USERNAME: 'ExRateTrackerBot'
    }, ctxRecorder().ctx);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.urlMatches, true);
    assert.equal(apiCalls[0].method, 'setWebhook');
    assert.equal(apiCalls[0].payload.url, 'https://arzpulse-bot.game-developer-mb.workers.dev/webhook');
    assert.equal(apiCalls[0].payload.secret_token, 'strong_webhook_secret-123');
    assert.deepEqual(apiCalls[0].payload.allowed_updates, ['message', 'channel_post']);
  } finally { globalThis.fetch = originalFetch; }
});

test('webhook setup rejects unauthenticated and missing-secret requests', async () => {
  const unauthenticated = await bot.fetch(new Request('https://worker.test/webhook/setup', { method: 'POST' }), {
    TELEGRAM_BOT_TOKEN: 'bot-token',
    TELEGRAM_WEBHOOK_SECRET: 'secret'
  }, ctxRecorder().ctx);
  assert.equal(unauthenticated.status, 503);

  const missingSecret = await bot.fetch(new Request('https://worker.test/webhook/setup', {
    method: 'POST', headers: { authorization: 'Bearer admin-secret' }
  }), {
    ADMIN_SECRET: 'admin-secret',
    TELEGRAM_BOT_TOKEN: 'bot-token'
  }, ctxRecorder().ctx);
  assert.equal(missingSecret.status, 502);
  const body = await missingSecret.json();
  assert.match(body.error, /TELEGRAM_WEBHOOK_SECRET/);
});

test('protected diagnostics verifies Bot API identity, webhook URL and market snapshot', async () => {
  const originalFetch = globalThis.fetch;
  const dataSnapshot = {
    timestamp: new Date().toISOString(),
    prices: { USDT: { lastPrice: 900000, bestSell: 900000 } },
    market: {}
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://api.telegram.org/botbot-token/getMe')) {
      return new Response(JSON.stringify({ ok: true, result: { id: 123, is_bot: true, username: 'ExRateTrackerBot' } }), { status: 200 });
    }
    if (url.startsWith('https://api.telegram.org/botbot-token/getWebhookInfo')) {
      return new Response(JSON.stringify({ ok: true, result: {
        url: 'https://wrong-worker.example/webhook',
        pending_update_count: 3,
        last_error_date: 1794230000,
        last_error_message: 'Wrong webhook URL'
      } }), { status: 200 });
    }
    if (url.startsWith('https://mehrdadmb2.github.io/ArzPulse/data/latest.json')) {
      return new Response(JSON.stringify(dataSnapshot), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected diagnostics fetch: ${url}`);
  };
  try {
    const response = await bot.fetch(new Request('https://worker.test/diagnostics', {
      headers: { 'x-admin-secret': 'admin-secret' }
    }), {
      ADMIN_SECRET: 'admin-secret',
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
      BOT_USERNAME: 'ExRateTrackerBot',
      GITHUB_TOKEN: 'github-token',
      SETTINGS_KV: { get: async () => null, put: async () => {} }
    }, ctxRecorder().ctx);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.telegramIdentity.username, 'ExRateTrackerBot');
    assert.equal(body.telegramIdentity.usernameMatchesExpected, true);
    assert.equal(body.telegramWebhook.urlMatchesExpected, false);
    assert.equal(body.telegramWebhook.pendingUpdateCount, 3);
    assert.equal(body.checks.telegramWebhook.status, 'url-mismatch');
    assert.equal(body.readiness, 'degraded');
    assert.ok(body.warnings.some((warning) => warning.includes('does not match')));
  } finally { globalThis.fetch = originalFetch; }
});


test('GITHUB_DISPATCH_ENABLED=false prevents duplicate scheduled dispatch from the bot Worker', async () => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls += 1; throw new Error('No dispatch expected when disabled'); };
  try {
    const { ctx, tasks } = ctxRecorder();
    await bot.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.now() }, {
      GITHUB_DISPATCH_ENABLED: 'false'
    }, ctx);
    await Promise.all(tasks);
    assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
