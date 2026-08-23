#!/usr/bin/env node
/**
 * ml_mejorar.js — sube la calidad de las publicaciones ML:
 *   - medidas del paquete (calculadas desde las dimensiones de la obra)
 *   - SKU interno (= id de obra)
 *   - embalaje Caja + tag Frágil
 *
 * Uso: node scripts/ml_mejorar.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const API = 'https://api.mercadolibre.com';
const DIR = path.join(__dirname, '..', 'marketing', 'mercadolibre');

const tokens = JSON.parse(fs.readFileSync(path.join(DIR, 'ml_tokens.json'), 'utf8'));
const H = { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' };
const dry = process.argv.includes('--dry');

const listas = JSON.parse(fs.readFileSync(path.join(DIR, 'listas.json'), 'utf8'));
const porKey = Object.fromEntries(listas.map(l => [l.key, l]));
const obrasJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'obras.json'), 'utf8'));
const obras = Array.isArray(obrasJson) ? obrasJson : obrasJson.obras;
const slugify = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const logPath = path.join(DIR, 'ml_log.json');
const publicadas = JSON.parse(fs.readFileSync(logPath, 'utf8')).filter(x => x.ok && !x.dry && x.id);

function unidad(v, u) { return `${Math.round(v)} ${u}`; }

function paquete(l, o) {
  const w = o.ancho_cm || 30, h = o.alto_cm || 30;
  if (l.tipo === 'replica') {
    // lámina plana con cartón rígido
    return { PACKAGE_LENGTH: unidad(h + 4, 'cm'), PACKAGE_WIDTH: unidad(w + 4, 'cm'), PACKAGE_HEIGHT: unidad(4, 'cm'), PACKAGE_WEIGHT: unidad(0.8, 'kg') };
  }
  // óleo sobre panel/tela con marco protegido
  return { PACKAGE_LENGTH: unidad(h + 10, 'cm'), PACKAGE_WIDTH: unidad(w + 10, 'cm'), PACKAGE_HEIGHT: unidad(9, 'cm'), PACKAGE_WEIGHT: unidad(2.5, 'kg') };
}

(async () => {
  let ok = 0, fail = 0;
  for (const p of publicadas) {
    const l = porKey[p.key];
    if (!l) continue;
    const slug = l.key.replace(/^(replica|original)-/, '');
    const o = obras.find(x => x.id === l.obra_id) || obras.find(x => slugify(x.titulo || x.id) === slug);
    try {
      const it = await fetch(`${API}/items/${p.id}`, { headers: H }).then(r => r.json());
      if (!it.attributes) throw new Error('sin atributos: ' + JSON.stringify(it).slice(0, 120));
      const actuales = new Map(it.attributes.map(a => [a.id, a]));
      const nuevos = { ...paquete(l, o || {}), SELLER_SKU: `${l.obra_id}-${l.tipo.toUpperCase().slice(0, 3)}` };
      for (const [id, value_name] of Object.entries(nuevos)) {
        const prev = actuales.get(id);
        actuales.set(id, prev ? { ...prev, value_name } : { id, value_name });
      }
      if (!actuales.has('SHIPMENT_PACKING')) actuales.set('SHIPMENT_PACKING', { id: 'SHIPMENT_PACKING', value_name: 'Caja' });
      if (!actuales.has('PRODUCT_FEATURES')) actuales.set('PRODUCT_FEATURES', { id: 'PRODUCT_FEATURES', value_name: 'Frágil' });
      const body = { attributes: [...actuales.values()] };
      if (dry) {
        console.log(`[DRY] ${p.key}: ${Object.keys(nuevos).join(', ')}`);
      } else {
        const r = await fetch(`${API}/items/${p.id}`, { method: 'PUT', headers: H, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 160));
        console.log(`✓ ${p.key} actualizado (${j.id})`);
        ok++;
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`✗ ${p.key}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nListo. OK: ${ok}, errores: ${fail}${dry ? ' (DRY RUN — sin cambios reales)' : ''}`);
})();
