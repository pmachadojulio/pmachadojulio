#!/usr/bin/env node
/**
 * ml_fichas.js — genera las publicaciones de Mercado Libre desde data/obras.json
 *
 * Output:
 *   marketing/mercadolibre/listas.json      → payloads para scripts/ml_publicar.js
 *   marketing/mercadolibre/fichas.md        → vista previa legible (copy-paste manual si preferís)
 *   imagenes/ml/<slug>.jpg                  → fotos JPG (ML es quisquilloso con WEBP)
 *
 * Uso: node scripts/ml_fichas.js [--max N]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://jcmachado.com';
const WA = '5493534018769';

const obrasJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'obras.json'), 'utf8'));
const obras = Array.isArray(obrasJson) ? obrasJson : obrasJson.obras;
const slugify = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const precioNum = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

function clipTitle(s) {
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length <= 60) return s;
  return s.slice(0, 57).replace(/[-–,\s]+\S*$/, '') + '…';
}

function descripcion(o, tipo) {
  const url = `${SITE}/obra/${slugify(o.titulo || o.id)}/`;
  const medidas = o.ancho_cm && o.alto_cm ? `${o.alto_cm}×${o.ancho_cm} cm` : '';
  if (tipo === 'replica') {
    return [
      `RÉPLICA NUMERADA — "${o.titulo}" de Julio Machado`,
      ``,
      `Réplica numerada y firmada, impresa sobre papel de algodón mate de alta gramaje con tintas pigmentadas de archivalía. Cada réplica sale del taller con certificado de autenticidad numerado y QR que verifica su edición.`,
      ``,
      `Técnica original: ${o.tecnica || 'óleo'}.`,
      medidas ? `Medidas: ${medidas}.` : '',
      ``,
      `¿Por qué una réplica numerada? El original tiene el aura; la réplica te lo acerca. Es el espejo que le devuelve al original su unicidad — y una forma real de tener arte argentino contemporáneo hecho a mano, no un póster anónimo.`,
      ``,
      `✔ Certificado de autenticidad numerado con QR`,
      `✔ Firmado por el artista`,
      `✔ Envíos a todo el país (protegido con cartón rígido)`,
      ``,
      `Conocé la obra completa, su proceso y más fotos acá: ${url}`,
      `Consultas directas por WhatsApp: https://wa.me/${WA}`,
      ``,
      `Julio Machado — Pintor y sociólogo. Retratos al óleo y obra gráfica. jcmachado.com`
    ].filter(l => l !== '').join('\n');
  }
  return [
    `"${o.titulo}" — OBRA ORIGINAL de Julio Machado`,
    ``,
    `${o.tecnica || 'Óleo'}.${medidas ? ' Medidas: ' + medidas + '.' : ''} Año ${o.anio || ''}.`,
    ``,
    (o.descripcion || '').split('\n').slice(0, 2).join(' ').slice(0, 600),
    ``,
    `✔ Obra original única, firmada`,
    `✔ Certificado de autenticidad`,
    `✔ Se entrega con certificado y QR verificable`,
    ``,
    `Más fotos, video del proceso y detalle de la pincelada: ${url}`,
    `Consultas directas por WhatsApp: https://wa.me/${WA}`,
    ``,
    `Julio Machado — Pintor y sociólogo. jcmachado.com`
  ].filter(l => l !== undefined).join('\n');
}

// Fotos: convertir WEBP → JPG con sips (macOS) y dejarlas servidas en /imagenes/ml/
const mlDir = path.join(ROOT, 'imagenes', 'ml');
fs.mkdirSync(mlDir, { recursive: true });
function fotoUrl(o) {
  if (!o.imagen) return null;
  const srcAbs = path.join(ROOT, o.imagen.replace(/^\//, ''));
  const base = path.basename(o.imagen).replace(/\.[^.]+$/, '');
  const dstRel = `/imagenes/ml/${base}.jpg`;
  const dstAbs = path.join(ROOT, dstRel.replace(/^\//, ''));
  try {
    if (!fs.existsSync(dstAbs)) execSync(`sips -s format jpeg -s formatOptions 85 "${srcAbs}" --out "${dstAbs}"`, { stdio: 'pipe' });
    return SITE + dstRel;
  } catch (e) {
    console.warn(`⚠ no pude convertir ${o.imagen}, uso la original`);
    return SITE + o.imagen;
  }
}

const listas = [];
for (const o of obras) {
  const disp = o.disponible !== false && !o.vendida;
  const slug = slugify(o.titulo || o.id);
  const foto = fotoUrl(o);

  // Réplica numerada (todas tienen print_precio $30.000)
  listas.push({
    key: `replica-${slug}`,
    tipo: 'replica',
    titulo_ml: clipTitle(`Réplica Numerada "${o.titulo}" Julio Machado Certificada`),
    price: precioNum(o.print_precio),
    available_quantity: 5,
    pictures: foto ? [foto] : [],
    descripcion: descripcion(o, 'replica'),
    web_url: `${SITE}/obra/${slug}/`,
    obra_id: o.id,
    publicar: true
  });

  // Original barato (sketchbooks $100k y óleos chicos hasta $200k)
  const po = precioNum(o.precio);
  if (disp && po > 0 && po <= 200000) {
    listas.push({
      key: `original-${slug}`,
      tipo: 'original',
      titulo_ml: clipTitle(`${o.titulo} — Óleo Original Julio Machado ${o.ancho_cm && o.alto_cm ? o.alto_cm + 'x' + o.ancho_cm : ''}`.trim()),
      price: po,
      available_quantity: 1,
      pictures: foto ? [foto] : [],
      descripcion: descripcion(o, 'original'),
      web_url: `${SITE}/obra/${slug}/`,
      obra_id: o.id,
      publicar: true
    });
  }
}

const outDir = path.join(ROOT, 'marketing', 'mercadolibre');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'listas.json'), JSON.stringify(listas, null, 2));

const md = ['# Fichas Mercado Libre — vista previa', '', `Total: **${listas.length}** publicaciones (${listas.filter(x => x.tipo === 'replica').length} réplicas + ${listas.filter(x => x.tipo === 'original').length} originales). Publicación automática: \`node scripts/ml_publicar.js publish\``, ''];
for (const l of listas) {
  md.push(`## [${l.tipo.toUpperCase()}] ${l.titulo_ml}`, '', `- **Precio:** $${l.price.toLocaleString('es-ar')} ARS`);
  md.push(`- **Título (${l.titulo_ml.length}/60 chars):** ${l.titulo_ml}`);
  md.push(`- **Foto:** ${l.pictures[0] || '⚠ sin foto'}`);
  md.push('', '```', l.descripcion, '```', '', '---', '');
}
fs.writeFileSync(path.join(outDir, 'fichas.md'), md.join('\n'));

const largos = listas.filter(l => l.titulo_ml.length > 60).length;
console.log(`✓ ${listas.length} fichas generadas en marketing/mercadolibre/ (${largos} títulos exceden 60 chars)`);
console.log(`✓ ${listas.filter(l => l.pictures[0]).length} fotos JPG listas en imagenes/ml/`);
