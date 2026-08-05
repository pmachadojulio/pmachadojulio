import { respond, authGuard } from './_lib.js';

async function ensureTable(env) {
  if (!env.DB) return null;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS suscriptores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      origen TEXT NOT NULL DEFAULT 'web'
    )`
  ).run();
  return env.DB;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return respond({ ok: false, error: 'Email inválido' }, 400);

    const db = await ensureTable(env);
    if (db) {
      await db.prepare('INSERT OR IGNORE INTO suscriptores (email) VALUES (?)').bind(email).run();
    }

    try {
      await fetch('https://formsubmit.co/ajax/pmachado.julio@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Nuevo suscriptor a la newsletter — jcmachado.com',
          _template: 'table',
          _captcha: 'false',
          email
        })
      });
    } catch (_) {}

    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: 'Error al suscribir' }, 500);
  }
}

export async function onRequestGet({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  const db = await ensureTable(env);
  if (!db) return respond({ ok: false, error: 'Base D1 no configurada' }, 503);
  const { results } = await db.prepare('SELECT * FROM suscriptores ORDER BY fecha DESC').all();
  return respond({ ok: true, suscriptores: results });
}

export async function onRequestDelete({ env, request }) {
  if (!(await authGuard({ env, request }))) return respond({ ok: false, error: 'No autorizado' }, 401);
  const url = new URL(request.url, 'https://jcmachado.com');
  const id = Number(url.searchParams.get('id'));
  if (!id) return respond({ ok: false, error: 'Falta id' }, 400);
  const db = await ensureTable(env);
  if (!db) return respond({ ok: false, error: 'Base D1 no configurada' }, 503);
  await db.prepare('DELETE FROM suscriptores WHERE id = ?').bind(id).run();
  return respond({ ok: true });
}
