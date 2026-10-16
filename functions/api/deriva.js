import { respond, ghGet, ghPut, encodeB64, decodeB64 } from './_lib.js';

// Admin Deriva: login con clave SEPARADA (DERIVA_PASSWORD) + guardado de
// data/deriva.json vía GitHub API. No toca el admin general (auditoría aparte).
// Requiere env: DERIVA_PASSWORD y GITHUB_TOKEN (con write en el repo).

const AUD = 'deriva-admin';

async function hmacSign(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function secretFor(env) {
  return env.DERIVA_SECRET || env.DERIVA_PASSWORD || 'deriva-fallback-secret';
}

async function createToken(env) {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const sig = await hmacSign(secretFor(env), `${exp}.${AUD}`);
  return `${exp}.${sig}`;
}

async function verifyToken(env, header) {
  if (!header || !header.startsWith('Bearer ')) return false;
  const parts = header.slice(7).trim().split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const sig = await hmacSign(secretFor(env), `${exp}.${AUD}`);
  return sig === parts[1];
}

function cleanConfig(d) {
  const str = (v, max) => String(v ?? '').slice(0, max);
  const ids = Array.isArray(d.curaduria) ? d.curaduria.filter(x => typeof x === 'string').slice(0, 40) : [];
  return {
    curaduria: [...new Set(ids)],
    coleccion_titulo: str(d.coleccion_titulo, 200),
    coleccion_intro: str(d.coleccion_intro, 2000),
    manifiesto_p1: str(d.manifiesto_p1, 2000),
    manifiesto_p2: str(d.manifiesto_p2, 2000),
    convocatoria_p1: str(d.convocatoria_p1, 2000),
    convocatoria_p2: str(d.convocatoria_p2, 2000)
  };
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return respond({ ok: false, error: 'JSON inválido' }, 400); }

  if (body.action === 'login') {
    if (!env.DERIVA_PASSWORD) return respond({ ok: false, error: 'DERIVA_PASSWORD no configurada en Cloudflare' }, 500);
    if (body.password !== env.DERIVA_PASSWORD) return respond({ ok: false, error: 'Clave incorrecta' }, 401);
    return respond({ ok: true, token: await createToken(env) });
  }

  if (body.action === 'save') {
    if (!(await verifyToken(env, request.headers.get('Authorization')))) {
      return respond({ ok: false, error: 'No autorizado' }, 401);
    }
    if (!env.GITHUB_TOKEN) return respond({ ok: false, error: 'GITHUB_TOKEN no configurado en Cloudflare' }, 500);
    try {
      const clean = cleanConfig(body.data || {});
      if (!clean.curaduria.length) return respond({ ok: false, error: 'La curaduría no puede quedar vacía' }, 400);
      const cur = await ghGet(env, 'data/deriva.json');
      const sha = cur.ok ? cur.data.sha : null;
      const res = await ghPut(env, 'data/deriva.json',
        encodeB64(JSON.stringify(clean, null, 2) + '\n'),
        `Admin Deriva: curaduría (${clean.curaduria.length}) + textos`, sha);
      if (!res.ok) return respond({ ok: false, error: `GitHub rechazó el guardado (${res.data?.message || res.status})` }, 500);
      return respond({ ok: true, n: clean.curaduria.length });
    } catch (err) {
      return respond({ ok: false, error: String(err.message || err) }, 500);
    }
  }

  return respond({ ok: false, error: 'Acción desconocida' }, 400);
}
