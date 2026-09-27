import { respond, authGuard } from './_lib.js';

// Pixel de apertura para emails HTML (newsletter, futuros envíos API).
// Política de privacidad: solo métrica agregada por cid (aperturas + última fecha).
// NO se guarda IP ni fingerprint. Gmail cachea por proxy: registra la primera
// apertura por destinatario, suficiente para "abrió / no abrió".
// Sin D1 configurada responde el gif igual y no guarda nada (no rompe emails).

const CID_RE = /^[A-Za-z]+-0*\d+$/;

const GIF_1PX_B64 = 'R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

async function ensureTable(env) {
  if (!env.DB) return null;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS aperturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cid TEXT NOT NULL,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      ua TEXT NOT NULL DEFAULT ''
    )`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_aperturas_cid ON aperturas (cid)`
  ).run();
  return env.DB;
}

function gifResponse() {
  const bin = atob(GIF_1PX_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, max-age=0',
      'Content-Length': String(bytes.length)
    }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url, 'https://jcmachado.com');

  // Resumen para el panel admin (requiere login admin).
  if (url.searchParams.get('resumen') === '1') {
    if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
    const db = await ensureTable(env);
    if (!db) return respond({ ok: false, error: 'Base D1 no configurada' }, 503);
    const { results } = await db.prepare(
      'SELECT cid, COUNT(*) AS n, MAX(fecha) AS ultima FROM aperturas GROUP BY cid'
    ).all();
    return respond({ ok: true, aperturas: results });
  }

  // Pixel: /api/abiertos?cid=V-014
  const cid = String(url.searchParams.get('cid') || '').trim().toUpperCase();
  if (CID_RE.test(cid)) {
    try {
      const db = await ensureTable(env);
      if (db) {
        const ua = String(request.headers.get('User-Agent') || '').slice(0, 120);
        await db.prepare('INSERT INTO aperturas (cid, ua) VALUES (?, ?)').bind(cid, ua).run();
      }
    } catch (_) {}
  }
  return gifResponse();
}
