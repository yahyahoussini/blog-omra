// IndexNow: key per site and submission helper (ported from the prototype).
// Reaches Bing, Yandex, Seznam, Naver, Yep; Google does not use IndexNow.
import { sha256 } from './util.js';

// Key from config/sites/<domain>.json (indexnow_key) or derived deterministically from the domain.
// Keys are public by design (served as /<key>.txt); 8-128 chars [a-zA-Z0-9-].
export function indexNowKey(domain, siteConfig = {}) {
  const key = siteConfig.indexnow_key || sha256(`indexnow:${domain}`).slice(0, 32);
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error(`invalid IndexNow key for ${domain}`);
  return key;
}

export async function submitIndexNow(host, key, urls) {
  if (!urls.length) return { status: 'skipped' };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(0, 10000) }),
  });
  // 200 OK | 202 accepted, key validation pending | 400 | 403 key invalid | 422 URL not on host | 429 too many requests
  return { status: res.status, host, count: urls.length };
}
