// Minimal GitHub REST client (fetch): weekly-review issues for the dead-man switch and the weekly report.
const API = 'https://api.github.com';

export function githubFromEnv(env = process.env) {
  const token = env.GITHUB_TOKEN?.trim(), repo = env.GITHUB_REPOSITORY?.trim();
  return token && repo ? { token, repo } : null;
}

async function gh(cfg, method, url, body) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'omra-network-automation', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) { const e = new Error(`GitHub ${method} ${url}: ${res.status} ${data?.message || text}`); e.status = res.status; throw e; }
  return data;
}

// Latest closed_at among issues with the label (pull requests excluded), or null.
export async function latestClosedIssue(cfg, label) {
  const list = await gh(cfg, 'GET', `/repos/${cfg.repo}/issues?state=closed&labels=${encodeURIComponent(label)}&sort=updated&direction=desc&per_page=50`);
  const closed = list.filter(i => !i.pull_request && i.closed_at).sort((a, b) => b.closed_at.localeCompare(a.closed_at));
  return closed[0] ? { number: closed[0].number, title: closed[0].title, closed_at: closed[0].closed_at } : null;
}

export async function ensureLabel(cfg, name, color = '0e8a16', description = 'Weekly review: closing the issue = review done') {
  try { await gh(cfg, 'POST', `/repos/${cfg.repo}/labels`, { name, color, description }); }
  catch (e) { if (e.status !== 422) throw e; } // 422 = already exists
}

// Creates the issue, or updates the body of an open issue with the same title (re-runs in the same week).
export async function upsertIssue(cfg, { title, body, labels }) {
  const open = await gh(cfg, 'GET', `/repos/${cfg.repo}/issues?state=open&labels=${encodeURIComponent(labels[0])}&per_page=50`);
  const same = open.find(i => !i.pull_request && i.title === title);
  if (same) return { ...(await gh(cfg, 'PATCH', `/repos/${cfg.repo}/issues/${same.number}`, { body })), updated: true };
  return { ...(await gh(cfg, 'POST', `/repos/${cfg.repo}/issues`, { title, body, labels })), updated: false };
}
