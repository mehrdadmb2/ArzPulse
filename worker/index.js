/**
 * ArzPulse Cloudflare Worker
 * Every 5 minutes, dispatches the GitHub Actions workflow that refreshes market data.
 *
 * Required Worker secrets/vars:
 *   GITHUB_TOKEN  -> GitHub PAT with Actions: Read and write (fine-grained) on the repo
 *   GITHUB_OWNER  -> e.g. mehrdadmb2
 *   GITHUB_REPO   -> ArzPulse
 *   WORKFLOW_FILE -> update-prices.yml (optional; default shown in code)
 */

const DEFAULT_WORKFLOW = 'update-prices.yml';

async function dispatchWorkflow(env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const workflow = env.WORKFLOW_FILE || DEFAULT_WORKFLOW;

  if (!env.GITHUB_TOKEN || !owner || !repo) {
    throw new Error('Missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ArzPulse-Cloudflare-Worker'
    },
    body: JSON.stringify({ ref: env.GITHUB_REF || 'main' })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub dispatch failed: HTTP ${response.status} ${body.slice(0, 500)}`);
  }

  return { owner, repo, workflow, dispatchedAt: new Date().toISOString() };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(dispatchWorkflow(env).then(r => console.log(JSON.stringify(r))).catch(err => console.error(err)));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, service: 'ArzPulse Action Dispatcher', schedule: '*/5 * * * *' });
    }

    if (request.method === 'POST' && url.pathname === '/dispatch') {
      try {
        const result = await dispatchWorkflow(env);
        return Response.json({ ok: true, ...result });
      } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 502 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
