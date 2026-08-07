import { respond, authGuard, submitIndexNow } from './_lib.js';

const SITE = 'https://jcmachado.com';
const INDEXNOW_KEY = '4ca0292d3c23b515a23b8c2b0dee355f';

function pemToDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlFromBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlFromBytes(new Uint8Array(sig))}`;
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('No obtuve token de Google');
  return data.access_token;
}

async function inspectUrl(siteUrl, url, token) {
  const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl })
  });
  if (res.status === 403) return { forbidden: true, status: 403 };
  const data = await res.json();
  if (!res.ok) return { status: res.status, error: data?.error?.message || 'Error de Search Console' };
  const idx = data.inspectionResult?.indexStatusResult;
  const fetchR = data.inspectionResult?.pageFetchResult;
  return {
    verdict: idx?.verdict || null,
    coverageState: idx?.coverageState || null,
    lastCrawlTime: idx?.lastCrawlTime || null,
    robotsTxtState: idx?.robotsTxtState || null,
    pageFetchState: fetchR?.pageFetchState || null,
    indexed: idx?.verdict === 'PASS'
  };
}

async function pool(items, worker, concurrency = 5) {
  const out = new Array(items.length);
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= items.length) return;
    out[idx] = await worker(items[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return out;
}

export async function onRequestGet({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const sitemapRes = await fetch(`${SITE}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    const urls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    const unique = [...new Set(urls)];

    const keyRes = await fetch(`${SITE}/${INDEXNOW_KEY}.txt`, { method: 'HEAD' });

    const google = { config: false, needSetup: false, error: null, inspectedAt: null, urls: null };
    const saJson = env.SC_SERVICE_ACCOUNT_JSON || env.GA_SERVICE_ACCOUNT_JSON;
    const siteUrl = env.SC_SITE_URL || 'sc-domain:jcmachado.com';
    if (saJson) {
      google.config = true;
      try {
        const token = await googleToken(JSON.parse(saJson), 'https://www.googleapis.com/auth/webmasters.readonly');
        google.urls = await pool(unique, async u => {
          const r = await inspectUrl(siteUrl, u, token);
          return { url: u, ...r };
        }, 5);
        if (google.urls.some(r => r.forbidden || r.error)) google.needSetup = true;
        google.inspectedAt = new Date().toISOString();
      } catch (err) {
        google.error = String(err.message || err);
        google.needSetup = true;
      }
    }

    return respond({
      ok: true,
      sitemap: { url: `${SITE}/sitemap.xml`, total: unique.length, urls: unique },
      indexnow: { keyOk: keyRes.ok || keyRes.status === 200 },
      google
    });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}

export async function onRequestPost({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const body = await request.json().catch(() => ({}));
    const urls = Array.isArray(body.urls) ? body.urls : [];
    if (!urls.length) return respond({ ok: false, error: 'Faltan URLs' }, 400);
    const full = urls.map(u => (String(u).startsWith('http') ? u : SITE + u));
    const res = await submitIndexNow(full);
    return respond({ ok: res.ok, status: res.status, error: res.error || null });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}
