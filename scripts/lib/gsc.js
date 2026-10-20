// Search Console API over REST with a service-account JWT signed by node:crypto (no googleapis dependency).
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const b64url = buf => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// GOOGLE_SA_JSON = the service-account key file content (JSON).
export function parseServiceAccount(json) {
  const sa = typeof json === 'string' ? JSON.parse(json) : json;
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SA_JSON must contain client_email and private_key');
  return sa;
}

export function signJwt(sa, { now = Math.floor(Date.now() / 1000), scope = SCOPE } = {}) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: sa.client_email, scope, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key);
  return `${input}.${b64url(sig)}`;
}

export async function accessToken(sa) {
  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(sa) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${data.error_description || data.error || ''}`);
  return data.access_token;
}

// searchAnalytics.query for sc-domain:<domain>; paginates by 25,000 rows.
export async function searchAnalytics(token, domain, { startDate, endDate, dimensions = ['date'], dataState = 'all', rowLimit = 25000 }) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`sc-domain:${domain}`)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; ; startRow += rowLimit) {
    const res = await fetch(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions, type: 'web', dataState, rowLimit, startRow }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Search Console ${domain}: ${res.status} ${data.error?.message || ''}`);
    const batch = data.rows || [];
    rows.push(...batch.map(r => ({ ...Object.fromEntries(dimensions.map((d, i) => [d, r.keys[i]])), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })));
    if (batch.length < rowLimit) break;
  }
  return rows;
}

// Impressions of the last 7 days vs the weekly average of the 4 weeks before (daily rows: {date, impressions}).
export function impressionTrend(daily, endDate) {
  const by = new Map(daily.map(r => [r.date, r.impressions]));
  const sum = (from, days) => { let s = 0; for (let i = 0; i < days; i++) { const d = new Date(from + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - i); s += by.get(d.toISOString().slice(0, 10)) || 0; } return s; };
  const back = n => { const d = new Date(endDate + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  const last7 = sum(endDate, 7);
  const baseline = sum(back(7), 28) / 4;
  return { impr7d: last7, baselineWeekly: Math.round(baseline), ratio: baseline ? last7 / baseline : null };
}

// STRATEGY 6.5 (after publishing): queries where ≥ 2 network URLs each hold ≥ 20 % of impressions over 28 days.
export function cannibalSuspects(rows, { minShare = 0.2, minImpressions = 20 } = {}) {
  const byQuery = new Map();
  for (const r of rows) { if (!byQuery.has(r.query)) byQuery.set(r.query, []); byQuery.get(r.query).push(r); }
  const out = [];
  for (const [query, list] of byQuery) {
    const total = list.reduce((s, r) => s + r.impressions, 0);
    if (total < minImpressions) continue;
    const strong = list.filter(r => r.impressions / total >= minShare);
    if (strong.length >= 2) out.push({ query, impressions: total, pages: strong.map(r => ({ page: r.page, share: Math.round(100 * r.impressions / total) / 100 })) });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}
