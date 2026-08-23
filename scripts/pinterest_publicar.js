#!/usr/bin/env node
/**
 * pinterest_publicar.js — publica pines automáticamente vía API v5 (gratis, sin anuncios).
 *
 * Prerequisito (una vez): crear una app en https://developers.pinterest.com/
 *   - Platforms: Web
 *   - Redirect URI: https://jcmachado.com/admin/pinterest-callback.html
 *   - Scopes: boards:read, boards:write, pins:read, pins:write, user_accounts:read
 *
 * Uso:
 *   node scripts/pinterest_publicar.js save-config <APP_ID> <APP_SECRET>
 *   node scripts/pinterest_publicar.js auth-url
 *   node scripts/pinterest_publicar.js auth <code>
 *   node scripts/pinterest_publicar.js publish --dry [--max N]
 *   node scripts/pinterest_publicar.js publish [--max N]
 *   node scripts/pinterest_publicar.js status
 */
const fs = require('fs');
const path = require('path');
const API = 'https://api.pinterest.com/v5';
const AUTH_BASE = 'https://www.pinterest.com/oauth';
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'marketing', 'pinterest');
const TOKENS = path.join(DIR, 'pinterest_tokens.json');
const LOG = path.join(DIR, 'pinterest_log.json');
const REDIRECT = 'https://jcmachado.com/admin/pinterest-callback.html';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';

function tokens() { try { return JSON.parse(fs.readFileSync(TOKENS, 'utf8')); } catch { return {}; } }
function saveTokens(t) { fs.writeFileSync(TOKENS, JSON.stringify(t, null, 2)); console.log('✓ tokens guardados en', TOKENS); }
function csvRows() {
  const src = fs.readFileSync(path.join(DIR, 'pines_bulk.csv'), 'utf8');
  // Parser simple CSV con comillas
  const rows = [];
  for (const line of src.trim().split('\n').slice(1)) {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 430)}`);
  return j;
}
async function refreshIfNeeded() {
  const t = tokens();
  if (!t.access_token) { console.error('Sin tokens. Corré: save-config <APP_ID> <SECRET> + auth-url'); process.exit(1); }
  if (t.expires_at && Date.now() < t.expires_at - 10 * 60 * 1000 && !process.argv.includes('--force-refresh')) return t.access_token;
  if (!t.refresh_token) return t.access_token; // Pinterest a veces da tokens largos
  const p = new URLSearchParams({ grant_type: 'refresh_token', client_id: t.app_id, client_secret: t.secret, refresh_token: t.refresh_token });
  const r = await fetch(`${API}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
  const j = await r.json();
  if (!r.ok) throw new Error('refresh falló: ' + JSON.stringify(j).slice(0, 300));
  saveTokens({ ...t, ...j, expires_at: Date.now() + (j.expires_in || 86400 * 30) * 1000 });
  return j.access_token;
}
async function fetchBoards(token) {
  const boards = [];
  let bookmark;
  do {
    const qs = bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : '';
    const r = await apiFetch(`${API}/boards?ad_account_id_typo=ignore&page_size=50${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    boards.push(...(r.items || []));
    bookmark = r.bookmark;
  } while (bookmark);
  return boards;
}

const [, , cmd, ...rest] = process.argv;
const arg = n => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };

if (cmd === 'save-config') {
  const t = tokens(); t.app_id = rest[0]; t.secret = rest[1]; saveTokens(t); process.exit(0);
}
if (cmd === 'auth-url') {
  const t = tokens();
  if (!t.app_id) { console.error('Faltan credenciales. Primero: save-config <APP_ID> <SECRET>'); process.exit(1); }
  const u = `${AUTH_BASE}/?client_id=${t.app_id}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;
  console.log('\n1. Abrí esta URL y autorizá la app:\n\n' + u + '\n\n2. Te redirige a la página con el código.\n3. Corré: node scripts/pinterest_publicar.js auth EL_CODIGO\n');
  process.exit(0);
}
if (cmd === 'auth') {
  const code = rest.find(a => !a.startsWith('--'));
  if (!code) { console.error('Uso: auth <codigo>'); process.exit(1); }
  (async () => {
    const t = tokens();
    const p = new URLSearchParams({ grant_type: 'authorization_code', client_id: t.app_id, client_secret: t.secret, code, redirect_uri: REDIRECT });
    const j = await apiFetch(`${API}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
    saveTokens({ ...t, ...j, expires_at: Date.now() + (j.expires_in || 86400 * 30) * 1000 });
    console.log('✓ Autenticado. Scopes:', j.scope || '');
    const me = await apiFetch(`${API}/user_account`, { headers: { Authorization: `Bearer ${j.access_token}` } }).catch(() => null);
    if (me) console.log('  Usuario:', me.username || me.business_name || '');
    console.log('Ya podés: node scripts/pinterest_publicar.js publish --dry');
  })().catch(e => { console.error('✗', e.message); process.exit(1); });
} else if (cmd === 'publish') {
  const dry = rest.includes('--dry');
  const max = Number(arg('--max') || 999);
  (async () => {
    const token = await refreshIfNeeded();
    const boards = await fetchBoards(token);
    const byName = new Map(boards.map(b => [String(b.name).toLowerCase(), b]));
    const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
    const hechos = new Set(log.filter(x => x.ok && !x.dry).map(x => x.csv_title));
    let pendientes = csvRows().filter(cols => !hechos.has(cols[0])).slice(0, max);
    console.log(`${pendientes.length} pines pendientes${dry ? ' (DRY RUN)' : ''}\n`);
    for (const cols of pendientes) {
      const [csvTitle, mediaUrl, boardName, description, link, keywords] = cols;
      const board = byName.get(String(boardName).toLowerCase());
      if (!board) { console.error(`✗ Sin tablero "${boardName}" para "${csvTitle}" — crealo primero en Pinterest`); log.push({ csv_title: csvTitle, ok: false, error: 'tablero no encontrado: ' + boardName, ts: new Date().toISOString() }); continue; }
      const body = { board_id: board.id, media_source: { source_type: 'image_url', url: mediaUrl }, title: csvTitle.slice(0, 100), description: (description + '\n\n' + (link ? link : '')).slice(0, 500), link, alt_text: csvTitle };
      if (dry) { console.log(`[DRY] ${csvTitle.slice(0, 60)} → ${boardName}`); log.push({ csv_title: csvTitle, ok: true, dry: true, board: boardName, ts: new Date().toISOString() }); }
      else {
        try {
          const pin = await apiFetch(`${API}/pins`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          console.log(`✓ ${csvTitle.slice(0, 55)} → https://www.pinterest.com/pin/${pin.id}/`);
          log.push({ csv_title: csvTitle, ok: true, pin_id: pin.id, board: boardName, ts: new Date().toISOString() });
        } catch (e) {
          console.error(`✗ ${csvTitle.slice(0, 55)}: ${e.message.slice(0, 280)}`);
          log.push({ csv_title: csvTitle, ok: false, error: e.message.slice(0, 420), ts: new Date().toISOString() });
        }
      }
      await new Promise(r => setTimeout(r, 900));
    }
    fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
    console.log(`\nLog: ${LOG} — nuevos OK: ${log.filter(x => x.ok && !x.dry).length} total`);
  })().catch(e => { console.error('✗', e.message); process.exit(1); });
} else if (cmd === 'status') {
  const t = tokens(); console.log(t.access_token ? `token: sí (expira ${t.expires_at ? new Date(t.expires_at).toISOString() : 'sin fecha'})` : 'sin token');
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
  console.log(`log: ${log.filter(x => x.ok && !x.dry).length} OK, ${log.filter(x => !x.ok).length} errores`);
} else {
  console.log(['Uso:', '  save-config <APP_ID> <SECRET>', '  auth-url', '  auth <code>', '  publish [--dry] [--max N]', '  status'].join('\n'));
}
