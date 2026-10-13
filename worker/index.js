// ArzPulse market-data updater Worker.
// This is NOT the Telegram bot Worker. It only dispatches the GitHub data workflow.
const GITHUB_API_VERSION = '2022-11-28';
const REQUEST_TIMEOUT_MS = 8000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = request.headers.get('x-admin-secret') || '';
  return secureEqual(bearer, env.ADMIN_SECRET) || secureEqual(header, env.ADMIN_SECRET);
}

async function triggerGitHubWorkflow(env) {
  const owner = String(env.GITHUB_OWNER || 'mehrdadmb2').trim();
  const repo = String(env.GITHUB_REPO || 'ArzPulse').trim();
  const workflow = String(env.GITHUB_WORKFLOW || 'update-prices.yml').trim();
  const ref = String(env.GITHUB_REF || 'main').trim();
  if (!env.GITHUB_TOKEN) throw new Error('Secret GITHUB_TOKEN is not configured.');
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !/^[A-Za-z0-9_.-]+\.ya?ml$/.test(workflow) || !/^[A-Za-z0-9_./-]+$/.test(ref)) {
    throw new Error('GitHub workflow owner, repository, filename or ref is invalid.');
  }

  const endpoint = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('GitHub API timeout'), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'x-github-api-version': GITHUB_API_VERSION,
        'content-type': 'application/json',
        'user-agent': 'ArzPulse-Cloudflare-Updater'
      },
      body: JSON.stringify({ ref })
    });
  } finally {
    clearTimeout(timer);
  }

  // GitHub workflow_dispatch returns 204 on success.
  if (response.status === 204) {
    console.log(`[dispatch] accepted ${owner}/${repo}/${workflow}@${ref}`);
    return true;
  }
  const detail = (await response.text().catch(() => '')).slice(0, 500);
  console.error(`[dispatch] GitHub API returned ${response.status}: ${detail}`);
  if (response.status === 401 || response.status === 403) throw new Error(`GitHub authorization failed (${response.status}); verify GITHUB_TOKEN and Actions: write permission.`);
  if (response.status === 404) throw new Error('Workflow not found; verify GITHUB_OWNER, GITHUB_REPO and GITHUB_WORKFLOW.');
  throw new Error(`GitHub workflow dispatch failed with HTTP ${response.status}.`);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerGitHubWorkflow(env).catch((error) => {
      console.error('[scheduled] workflow dispatch failed:', error?.stack || error);
      throw error;
    }));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        status: 'ok',
        service: 'ArzPulse market-data updater',
        timestamp: new Date().toISOString(),
        githubTokenConfigured: Boolean(env.GITHUB_TOKEN),
        target: `${env.GITHUB_OWNER || 'mehrdadmb2'}/${env.GITHUB_REPO || 'ArzPulse'}`,
        workflow: env.GITHUB_WORKFLOW || 'update-prices.yml',
        scheduledEveryMinutes: 5
      });
    }
    if (url.pathname === '/trigger') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      if (!env.ADMIN_SECRET) return json({ error: 'manual trigger is disabled until ADMIN_SECRET is configured' }, 503);
      if (!isAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      try {
        await triggerGitHubWorkflow(env);
        return json({ ok: true, message: 'Workflow dispatch accepted. Data collection runs asynchronously.' });
      } catch (error) {
        return json({ ok: false, error: error.message }, 502);
      }
    }
    return json({ error: 'not-found' }, 404);
  }
};
