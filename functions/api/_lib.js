const REPO = 'pmachadojulio/pmachadojulio';

export function jsonHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8' };
}

export function respond(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders() });
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function encodeB64(str) {
  return bytesToBase64(new TextEncoder().encode(str));
}

export function decodeB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSign(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return bytesToHex(new Uint8Array(sig));
}

function secretFor(env) {
  return env.ADMIN_SECRET || env.ADMIN_PASSWORD || 'jcm-admin-fallback-secret';
}

export async function createToken(env) {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const sig = await hmacSign(secretFor(env), `${exp}.jcmadmin`);
  return `${exp}.${sig}`;
}

export async function verifyToken(env, header) {
  if (!header || !header.startsWith('Bearer ')) return false;
  const token = header.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const sig = await hmacSign(secretFor(env), `${exp}.jcmadmin`);
  return sig === parts[1];
}

export async function authGuard({ env, request }) {
  const ok = await verifyToken(env, request.headers.get('Authorization'));
  return ok;
}

export async function ghGet(env, path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'jcm-admin'
    }
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function ghPut(env, path, contentB64, message, sha) {
  const body = { message, content: contentB64 };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'jcm-admin'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export async function loadObras(env) {
  const { ok, data } = await ghGet(env, 'data/obras.json');
  if (!ok) throw new Error(`No pude leer obras.json (${data.message || data})`);
  return JSON.parse(decodeB64(data.content));
}

export async function saveObras(env, obrasJson, message) {
  const { ok, data } = await ghGet(env, 'data/obras.json');
  if (!ok) throw new Error(`No pude leer obras.json (${data.message || data})`);
  const { ok: okPut } = await ghPut(env, 'data/obras.json', encodeB64(JSON.stringify(obrasJson, null, 2)), message, data.sha);
  if (!okPut) throw new Error('GitHub rechazó la actualización de obras.json');
}

export function nextId(obras) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const o of obras || []) {
    const m = String(o.id || '').match(/^JM-(\d{4})-(\d{3})$/);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  return `JM-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function cleanObraFields(obra) {
  const num = v => (v === '' || v === null || v === undefined ? null : Number(v));
  const str = v => (v === null || v === undefined ? '' : String(v));
  return {
    titulo: str(obra.titulo),
    id: str(obra.id),
    categoria: str(obra.categoria),
    anio: num(obra.anio),
    tecnica: str(obra.tecnica),
    ancho_cm: num(obra.ancho_cm),
    alto_cm: num(obra.alto_cm),
    descripcion: str(obra.descripcion),
    imagen: str(obra.imagen),
    precio: str(obra.precio),
    print_precio: str(obra.print_precio),
    mercadopago_original: str(obra.mercadopago_original),
    paypal_original: str(obra.paypal_original),
    mercadopago_print: str(obra.mercadopago_print),
    paypal_print: str(obra.paypal_print),
    edicion_total: num(obra.edicion_total),
    prints_vendidos: num(obra.prints_vendidos),
    disponible: !!obra.disponible,
    vendida: !!obra.vendida,
    qr_url: str(obra.qr_url),
    certificado: str(obra.certificado)
  };
}
