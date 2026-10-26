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
