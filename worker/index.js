export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerGitHubWorkflow(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response("ArzPulse updater is alive.", { headers: { "content-type": "text/plain; charset=utf-8" }});
    }
    if (url.pathname === "/trigger") {
      if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_WORKFLOW) {
        return new Response("Missing Cloudflare secrets/vars.", { status: 500 });
      }
      const ok = await triggerGitHubWorkflow(env);
      return new Response(ok ? "Workflow dispatched." : "Workflow dispatch failed.", { status: ok ? 200 : 502 });
    }
    return new Response("Not found", { status: 404 });
  }
};

async function triggerGitHubWorkflow(env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const workflow = env.GITHUB_WORKFLOW || "update-prices.yml";
  const ref = env.GITHUB_REF || "main";
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ArzPulse-Cloudflare-Updater"
    },
    body: JSON.stringify({ ref })
  });

  return res.status === 204;
}
