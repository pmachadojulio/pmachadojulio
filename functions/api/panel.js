import { respond, authGuard, loadObras } from './_lib.js';

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

async function gaAccessToken(env) {
  const sa = JSON.parse(env.GA_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
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
  if (!data.access_token) throw new Error('No obtuve token de GA');
  return data.access_token;
}

async function gaRunReport(env, token) {
  const now = new Date();
  const ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);
  const body = {
    dateRanges: [{ startDate: fmt(ago), endDate: fmt(now) }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' }
    ],
    dimensions: [{ name: 'pagePath' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10
  };
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${env.GA_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  return res.json();
}

export async function onRequestGet({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  try {
    const obras = (await loadObras(env)).obras || [];
    const total = obras.length;
    const disponibles = obras.filter(o => o.disponible && !o.vendida).length;
    const vendidas = obras.filter(o => o.vendida).length;
    const printsVendidos = obras.reduce((acc, o) => acc + (o.prints_vendidos || 0), 0);
    const inventario = obras.reduce((acc, o) => acc + (o.edicion_total || 0) - (o.prints_vendidos || 0), 0);

    let suscriptores = null;
    if (env.DB) {
      try {
        const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM suscriptores').first();
        suscriptores = r ? r.n : 0;
      } catch (_) {}
    }

    const stats = {
      obras: { total, disponibles, vendidas, printsVendidos, inventario },
      suscriptores
    };

    const gaConfig = !!(env.GA_PROPERTY_ID && env.GA_SERVICE_ACCOUNT_JSON);
    let ga = null;
    if (gaConfig) {
      try {
        const token = await gaAccessToken(env);
        const report = await gaRunReport(env, token);
        if (report.rows) {
          const totals = { usuarios: 0, sesiones: 0, vistas: 0 };
          report.totals?.[0]?.metricValues?.forEach((v, i) => {
            if (i === 0) totals.usuarios = Number(v.value);
            if (i === 1) totals.sesiones = Number(v.value);
            if (i === 2) totals.vistas = Number(v.value);
          });
          ga = {
            ok: true,
            ...totals,
            paginas: report.rows.map(r => ({
              path: r.dimensionValues[0].value,
              vistas: Number(r.metricValues[2]?.value || 0)
            }))
          };
        } else if (report.error) {
          ga = { ok: false, error: report.error.message };
        }
      } catch (err) {
        ga = { ok: false, error: String(err.message || err) };
      }
    } else {
      ga = { ok: false, configurar: true };
    }

    return respond({ ok: true, stats, ga, gaConfig });
  } catch (err) {
    return respond({ ok: false, error: String(err.message || err) }, 500);
  }
}
