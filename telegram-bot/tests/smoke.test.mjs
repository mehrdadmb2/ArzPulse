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
