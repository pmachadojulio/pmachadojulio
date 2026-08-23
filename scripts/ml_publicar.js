#!/usr/bin/env node
/**
 * ml_publicar.js — publica las fichas generadas en Mercado Libre vía API oficial.
 *
 * Setup único (una vez):
 *   1. Crear app en https://developers.mercadolibre.com.ar
 *      - Redirect URI: https://jcmachado.com/admin/ml-callback.html
 *   2. node scripts/ml_publicar.js auth-url        → abre navegador, autorizás, copiás el code
 *   3. node scripts/ml_publicar.js auth <code>     → guarda tokens en marketing/mercadolibre/ml_tokens.json
 *
 * Uso diario:
 *   node scripts/ml_publicar.js publish --dry      → muestra qué publicaría, sin publicar
 *   node scripts/ml_publicar.js publish --max 5    → publica hasta 5 ítems
 *   node scripts/ml_publicar.js refresh            → refresca token manualmente
 *
 * Tokens NUNCA se suben a git (.gitignore). Log de resultados: ml_log.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'marketing', 'mercadolibre');
const TOKENS = path.join(DIR, 'ml_tokens.json');
const LOG = path.join(DIR, 'ml_log.json');
const API = 'https://api.mercadolibre.com';
const AUTH = 'https://auth.mercadolibre.com';
const REDIRECT_URI = 'https://jcmachado.com/admin/ml-callback.html';

function config() {
  const appId = process.env.ML_APP_ID || (tokens().app_id);
  const secret = process.env.ML_SECRET || (tokens().secret);
  if (!appId || !secret) {
    console.error('Faltan credenciales. Exportá ML_APP_ID y ML_SECRET (o guardalas una vez con "save-config").');
    process.exit(1);
  }
  return { appId, secret };
}
function tokens() { try { return JSON.parse(fs.readFileSync(TOKENS, 'utf8')); } catch (e) { return {}; } }
function saveTokens(t) { fs.writeFileSync(TOKENS, JSON.stringify(t, null, 2)); console.log('✓ tokens guardados en', TOKENS); }

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch (e) { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function tokenRefresh(force = false) {
  const t = tokens();
  // Token de larga duración (ML ya no emite refresh_token): usar directo si sigue vigente
  if (t.access_token && t.expires_at && !force && Date.now() < t.expires_at - 10 * 60 * 1000) return t.access_token;
  const { appId, secret } = config();
  if (!t.refresh_token) { console.error('Token vencido o ausente. Regenerar con: node scripts/ml_publicar.js auth-url'); process.exit(1); }
  // ML access tokens duran 6h; refrescar si falta >10 min para vencer
  if (!force && t.expires_at && Date.now() < t.expires_at - 10 * 60 * 1000) return t.access_token;
  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: appId, client_secret: secret });
  const r = await fetch(`${API}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
  const j = await r.json();
  if (!r.ok) throw new Error('refresh falló: ' + JSON.stringify(j));
  saveTokens({ ...t, ...j, expires_at: Date.now() + j.expires_in * 1000 });
  return j.access_token;
}

async function categoria(token, q) {
  const rows = await apiFetch(`${API}/sites/MLA/domain_discovery/search?q=${encodeURIComponent(q)}&limit=3`, { headers: { Authorization: `Bearer ${token}` } });
  return rows[0];
}

async function publicarUno(token, l, dry) {
  const cat = await categoria(token, `${l.tipo === 'replica' ? 'retrato arte impresion' : 'pintura original arte'}`);
  const payload = {
    // Dominios nuevos de ML: sin "title" — el nombre sale de family_name + attributes
    family_name: l.titulo_ml,
    category_id: cat.category_id,
    price: l.price,
    currency_id: 'ARS',
    available_quantity: l.available_quantity,
    buying_mode: 'buy_it_now',
    condition: 'new',
    listing_type_id: 'free',
    description: { plain_text: l.descripcion },
    pictures: l.pictures.map(u => ({ source: u })),
    shipping: { mode: 'me2', local_pick_up: true, free_shipping: l.price >= 35000 },
    attributes: [
      { id: 'BRAND', value_name: 'Julio Machado' },
      { id: 'MODEL', value_name: (l.tipo === 'replica' ? 'Réplica numerada - ' : 'Original - ') + l.key.replace(/^(replica|original)-/, '') }
    ]
  };
  if (dry) {
    console.log(`[DRY] ${l.key} → ${payload.title} | $${payload.price} | cat ${cat.category_id} (${cat.category_name})`);
    return { key: l.key, ok: true, dry: true };
  }
  const intento = async (listingTypeId) => {
    payload.listing_type_id = listingTypeId;
    return apiFetch(`${API}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };
  let item;
  try {
    item = await intento('free');
  } catch (e) {
    if (/temporarily_unavailable/.test(e.message)) item = await intento('silver'); // Clásica
    else throw e;
  }
  console.log(`✓ PUBLICADO ${l.key}: ${item.permalink}`);
  return { key: l.key, ok: true, permalink: item.permalink, id: item.id };
}

/* ---------- comandos ---------- */
const [, , cmd, ...rest] = process.argv;
const argVal = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };

if (cmd === 'save-config') {
  const t = tokens(); t.app_id = rest[0]; t.secret = rest[1]; saveTokens(t); process.exit(0);
}
if (cmd === 'auth-url') {
  const { appId } = config();
  const url = `${AUTH}/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  console.log('\n1. Abrí esta URL en el navegador y autorizá la app:\n\n' + url);
  console.log('\n2. Te va a redirigir a ' + REDIRECT_URI + ' mostrando un código.');
  console.log('3. Copialo y corré:  node scripts/ml_publicar.js auth EL_CODIGO\n');
  process.exit(0);
}
if (cmd === 'auth') {
  const code = rest.find(a => !a.startsWith('--'));
  if (!code) { console.error('Uso: auth <codigo>'); process.exit(1); }
  const { appId, secret } = config();
  const params = new URLSearchParams({ grant_type: 'authorization_code', client_id: appId, client_secret: secret, redirect_uri: REDIRECT_URI, code });
  (async () => {
    const r = await fetch(`${API}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
    const j = await r.json();
    if (j.error) throw new Error(JSON.stringify(j));
    const me = await apiFetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${j.access_token}` } });
    saveTokens({ ...tokens(), ...j, expires_at: Date.now() + j.expires_in * 1000, user_id: me.id, nickname: me.nickname });
    console.log(`✓ Autenticado como ${me.nickname} (user ${me.id}). Ya podés: node scripts/ml_publicar.js publish --dry`);
  })().catch(e => { console.error('✗', e.message); process.exit(1); });
} else if (cmd === 'refresh') {
  tokenRefresh(true).then(() => console.log('✓ token refrescado')).catch(e => { console.error(e.message); process.exit(1); });
} else if (cmd === 'publish') {
  const dry = rest.includes('--dry');
  const max = Number(argVal('--max') || 9999);
  const listas = JSON.parse(fs.readFileSync(path.join(DIR, 'listas.json'), 'utf8')).filter(l => l.publicar !== false && l.pictures.length);
  (async () => {
    const token = await tokenRefresh();
    const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
    const yaHechas = new Set(log.filter(x => x.ok && !x.dry).map(x => x.key));
    const pendientes = listas.filter(l => !yaHechas.has(l.key)).slice(0, max);
    console.log(`${pendientes.length} publicaciones pendientes${dry ? ' (DRY RUN)' : ''}\n`);
    for (const l of pendientes) {
      try {
        const r = await publicarUno(token, l, dry);
        log.push({ ...r, ts: new Date().toISOString() });
      } catch (e) {
        console.error(`✗ ${l.key}: ${e.message.slice(0, 200)}`);
        log.push({ key: l.key, ok: false, error: e.message.slice(0, 300), ts: new Date().toISOString() });
      }
      await new Promise(r => setTimeout(r, 500));
    }
    fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
    console.log(`\nLog actualizado: ${LOG}. Publicadas sin error: ${log.filter(x => x.ok && !x.dry).length}/${listas.length}`);
  })().catch(e => { console.error('✗', e.message); process.exit(1); });
} else {

console.log([
  'Uso:',
  '  save-config <APP_ID> <SECRET>   guarda credenciales de tu app ML',
  '  auth-url                        imprime la URL de autorización',
  '  auth <code>                     canjea el código por tokens',
  '  refresh                         fuerza refresh del token',
  '  publish [--dry] [--max N]       publica fichas de listas.json'
].join('\n'));
}
