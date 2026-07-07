/**
 * build-obras.js
 * Genera /obra/{slug}/index.html — una página ESTÁTICA por cada obra,
 * con el contenido ya escrito en el HTML (nada de fetch() en runtime)
 * + JSON-LD schema.org VisualArtwork para SEO / indexación por IA.
 *
 * Se ejecuta en cada build de Cloudflare Pages:
 *   Build command: node build-obras.js
 *
 * No requiere dependencias externas (solo fs y path de Node).
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jcmachado.com';
const WHATSAPP = '5493534018769';

// ---------- Utilidades ----------

function slugify(titulo) {
  return titulo.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function precioNumero(precioStr) {
  if (!precioStr) return null;
  const n = String(precioStr).replace(/[^\d]/g, '');
  return n ? parseInt(n, 10) : null;
}

// ---------- Cargar datos ----------

const dataPath = path.join(__dirname, 'data', 'obras.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const obras = (JSON.parse(raw).obras || []);

console.log(`build-obras: ${obras.length} obras encontradas`);

// ---------- CSS compartido (idéntico al de obra.html) ----------

const SHARED_STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #1a1814; --ink-2: #4a4740; --ink-3: #8a8780;
    --paper: #f5f2ed; --paper-2: #ede9e2; --paper-3: #e4dfd6;
    --accent: #8b5e3c; --accent-light: #c4956a; --white: #fdfcfa;
    --serif: 'Cormorant Garamond', Georgia, serif;
    --sans: 'DM Sans', system-ui, sans-serif;
    --max: 1100px; --gap: clamp(24px, 5vw, 60px);
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); background: var(--paper); color: var(--ink); font-size: 15px; line-height: 1.6; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
  a { color: inherit; text-decoration: none; }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px var(--gap); background: rgba(245,242,237,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(26,24,20,0.08); }
  .nav-brand { font-family: var(--serif); font-size: 22px; font-weight: 400; letter-spacing: 0.5px; }
  .nav-brand em { font-style: italic; color: var(--ink-3); font-size: 13px; display: block; font-family: var(--sans); letter-spacing: 2px; text-transform: uppercase; line-height: 1; margin-top: 1px; }
  .nav-back { font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-2); border-bottom: 1px solid var(--ink-3); padding-bottom: 2px; transition: color 0.2s, border-color 0.2s; }
  .nav-back:hover { color: var(--accent); border-color: var(--accent); }
  main { max-width: var(--max); margin: 0 auto; padding: calc(80px + var(--gap)) var(--gap) var(--gap); }
  .obra-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 80px); align-items: start; }
  .obra-img-wrap { position: sticky; top: 100px; background: var(--paper-2); border-radius: 4px; overflow: hidden; }
  .obra-img-wrap img { width: 100%; height: auto; object-fit: contain; max-height: 75vh; }
  .obra-detail { padding: 8px 0; }
  .obra-eyebrow { font-family: var(--sans); font-size: 10px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: var(--ink-3); margin-bottom: 12px; }
  .obra-titulo { font-family: var(--serif); font-size: clamp(38px, 5vw, 60px); font-weight: 300; line-height: 1.0; letter-spacing: -0.5px; margin-bottom: 6px; }
  .obra-titulo em { font-style: italic; color: var(--accent); }
  .obra-tecnica { font-size: 12px; color: var(--ink-3); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; }
  .obra-desc { font-size: 15px; color: var(--ink-2); line-height: 1.85; font-weight: 300; margin-bottom: 32px; white-space: pre-line; }
  .ficha { border-top: 1px solid rgba(26,24,20,0.1); border-bottom: 1px solid rgba(26,24,20,0.1); padding: 20px 0; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
  .ficha-label { font-size: 9px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-3); margin-bottom: 3px; }
  .ficha-val { font-size: 14px; color: var(--ink); font-weight: 400; }
  .obra-precio-wrap { margin-bottom: 20px; }
  .obra-precio-label { font-size: 10px; color: var(--ink-3); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
  .obra-precio { font-family: var(--serif); font-size: 40px; font-weight: 300; color: var(--accent); line-height: 1; }
  .vendida-tag { display: inline-block; border: 1.5px solid #d94f4f; color: #d94f4f; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; padding: 5px 14px; border-radius: 2px; margin-bottom: 20px; }
  .acciones { display: flex; flex-direction: column; gap: 10px; }
  .btn-mp { display: flex; align-items: center; justify-content: center; gap: 8px; background: #009ee3; color: #fff; padding: 14px 20px; border-radius: 2px; font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; transition: background 0.2s; }
  .btn-mp:hover { background: #007ab8; }
  .btn-pp { display: flex; align-items: center; justify-content: center; gap: 8px; background: #1a2f6e; color: #fff; padding: 14px 20px; border-radius: 2px; font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; transition: background 0.2s; }
  .btn-pp:hover { background: #0f1f4d; }
  .btn-print { display: flex; align-items: center; justify-content: space-between; background: transparent; color: var(--ink-2); border: 1px solid rgba(26,24,20,0.15); padding: 12px 20px; border-radius: 2px; font-family: var(--sans); font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all 0.2s; }
  .btn-print:hover { background: var(--paper); }
  .btn-print span { font-family: var(--serif); font-size: 18px; font-weight: 300; color: var(--accent); letter-spacing: 0; text-transform: none; }
  .btn-wsp { display: block; text-align: center; color: var(--ink-3); font-size: 11px; letter-spacing: 0.5px; padding: 8px; transition: color 0.2s; text-decoration: none; }
  .btn-wsp:hover { color: var(--ink); }
  .certificado-section { margin-top: 40px; padding-top: 28px; border-top: 1px solid rgba(26,24,20,0.1); }
  .cert-title { font-family: var(--serif); font-size: 20px; font-weight: 400; margin-bottom: 8px; }
  .cert-desc { font-size: 13px; color: var(--ink-3); line-height: 1.7; margin-bottom: 16px; }
  .cert-id { font-family: var(--sans); font-size: 12px; font-weight: 500; letter-spacing: 2px; color: var(--ink-2); background: var(--paper-2); padding: 10px 16px; border-radius: 2px; display: inline-block; }
  .obra-qr-wrap { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .obra-qr-wrap canvas, .obra-qr-wrap img { width: 64px !important; height: 64px !important; }
  .obra-qr-label { font-size: 11px; color: var(--ink-3); line-height: 1.5; }
  footer { background: var(--ink); color: var(--paper); padding: 32px var(--gap); margin-top: 80px; }
  .footer-inner { max-width: var(--max); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .footer-brand { font-family: var(--serif); font-size: 18px; font-weight: 300; }
  .footer-brand span { display: block; font-family: var(--sans); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(245,242,237,0.4); margin-top: 2px; }
  .footer-copy { font-size: 11px; color: rgba(245,242,237,0.3); }
  @media (max-width: 780px) {
    .obra-grid { grid-template-columns: 1fr; }
    .obra-img-wrap { position: static; max-height: 60vw; }
    .obra-img-wrap img { max-height: 60vw; }
    .ficha { grid-template-columns: 1fr 1fr; }
  }
`;

const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PP48JV4JK7"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PP48JV4JK7');
</script>`;

// ---------- Generar página por obra ----------

function buildObraHTML(o) {
  const slug = slugify(o.titulo || o.id);
  const esSoloPrint = o.tipo === 'solo_print';
  const url = `${SITE_URL}/obra/${slug}/`;
  const imagenUrl = o.imagen ? (o.imagen.startsWith('http') ? o.imagen : `${SITE_URL}/${o.imagen.replace(/^\//, '')}`) : '';
  const categoria = o.categoria ? o.categoria.charAt(0).toUpperCase() + o.categoria.slice(1) : 'Obra';
  const metaDesc = (o.descripcion || `${o.titulo} — obra de Julio Machado, pintor argentino.`).slice(0, 160);

  // Ficha técnica
  const fichaItems = [
    { label: 'Técnica', val: o.tecnica },
    { label: 'Año', val: o.anio },
    { label: 'Medidas', val: (o.ancho_cm && o.alto_cm) ? `${o.ancho_cm} × ${o.alto_cm} cm` : null },
    { label: 'Categoría', val: categoria },
    { label: 'ID de obra', val: o.id },
    { label: 'Estado', val: o.vendida ? 'Original no disponible' : (o.disponible ? 'Disponible' : 'No disponible') },
  ].filter(i => i.val);

  const fichaHTML = fichaItems.map(i =>
    `<div class="ficha-item"><div class="ficha-label">${escapeHtml(i.label)}</div><div class="ficha-val">${escapeHtml(i.val)}</div></div>`
  ).join('');

  // Acciones de compra
  let accionesHTML = '';
  if (o.vendida) {
    accionesHTML = `<a href="/#contacto" class="btn-wsp">→ Consultame por una obra similar</a>`;
  } else if (esSoloPrint) {
    if (o.print_precio && o.mercadopago_print) accionesHTML += `<a href="${escapeHtml(o.mercadopago_print)}" class="btn-print" target="_blank" rel="noopener">Comprar Print A3 <span>${escapeHtml(o.print_precio)}</span></a>`;
    accionesHTML += `<a href="https://wa.me/${WHATSAPP}?text=Hola%20Julio!%20Me%20interesa%20el%20print%20de%20${encodeURIComponent(o.titulo)}" class="btn-wsp" target="_blank" rel="noopener">→ Consultar por WhatsApp</a>`;
  } else {
    if (o.mercadopago_original) accionesHTML += `<a href="${escapeHtml(o.mercadopago_original)}" class="btn-mp" target="_blank" rel="noopener">Comprar con Mercado Pago</a>`;
    if (o.paypal_original) accionesHTML += `<a href="${escapeHtml(o.paypal_original)}" class="btn-pp" target="_blank" rel="noopener">Pagar con PayPal</a>`;
    if (o.print_precio && o.mercadopago_print) accionesHTML += `<a href="${escapeHtml(o.mercadopago_print)}" class="btn-print" target="_blank" rel="noopener">Comprar Print A3 <span>${escapeHtml(o.print_precio)}</span></a>`;
    accionesHTML += `<a href="https://wa.me/${WHATSAPP}?text=Hola%20Julio!%20Me%20interesa%20la%20obra%20${encodeURIComponent(o.titulo)}" class="btn-wsp" target="_blank" rel="noopener">→ Consultar por WhatsApp</a>`;
  }

  // Certificado / edición limitada
  const certHTML = !esSoloPrint ? `
      <div class="certificado-section">
        <h3 class="cert-title">Certificado de autenticidad</h3>
        <p class="cert-desc">Esta obra es un original único de Julio Machado. El ID y código QR permiten verificar su procedencia en el catálogo oficial del artista.</p>
        <div class="obra-qr-wrap">
          <div id="obraQr"></div>
          <div>
            <span class="cert-id">${escapeHtml(o.id)}</span>
            <div class="obra-qr-label" style="margin-top:6px;">Escanear para verificar autenticidad</div>
          </div>
        </div>
      </div>
    ` : o.edicion_total ? `
      <div class="certificado-section">
        <h3 class="cert-title">Edición limitada</h3>
        <p class="cert-desc">Este print pertenece a una edición limitada de <strong>${o.edicion_total} ejemplares</strong>. Cada copia está numerada y certificada por el artista.</p>
        <span class="cert-id">${escapeHtml(o.id)} · Edición de ${o.edicion_total}</span>
        ${(() => {
          const vendidos = o.prints_vendidos || 0;
          const quedan = o.edicion_total - vendidos;
          if (quedan <= 0) return '<div style="margin-top:10px;font-size:12px;color:#d94f4f;font-weight:500;">Tirada agotada</div>';
          return `<div style="margin-top:10px;font-size:12px;color:var(--accent);font-weight:500;">Quedan ${quedan} de ${o.edicion_total}</div>`;
        })()}
      </div>
    ` : '';

  const vendidaTag = o.vendida
    ? '<div class="vendida-tag">Original no disponible</div>'
    : esSoloPrint
      ? '<div class="vendida-tag" style="border-color:#2a2a3a;color:#2a2a3a;">Solo disponible en Print</div>'
      : '';
  const precioLabel = o.vendida ? 'Esta obra ya fue vendida' : esSoloPrint ? 'Precio del print' : 'Precio de obra original';

  const queIncluyeHTML = (!esSoloPrint && !o.vendida) ? `
            <div style="margin-bottom:8px;font-weight:500;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3);">Qué incluye</div>
            <div>✓ Obra original</div>
            <div>✓ Certificado de autenticidad con QR</div>
            <div>✓ Embalaje protegido para envío</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(26,24,20,0.1);">
              <span style="font-weight:500;">Envío:</span> OCA o Andreani · $5.000–$8.000 según destino · 3 a 7 días hábiles
            </div>
  ` : esSoloPrint ? `
            <div style="margin-bottom:8px;font-weight:500;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3);">Qué incluye</div>
            <div>✓ Print A3 de alta resolución</div>
            <div>✓ Embalaje en tubo rígido de cartón</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(26,24,20,0.1);">
              <span style="font-weight:500;">Envío:</span> OCA o Andreani · $5.000–$8.000 según destino · 3 a 7 días hábiles
            </div>
  ` : '';

  // ---------- JSON-LD schema.org VisualArtwork ----------
  const precioNum = precioNumero(o.vendida ? null : o.precio);
  const schema = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "name": o.titulo,
    "image": imagenUrl,
    "url": url,
    "artform": "Painting",
    "artMedium": o.tecnica || undefined,
    "artworkSurface": o.tecnica || undefined,
    "dateCreated": o.anio ? String(o.anio) : undefined,
    "width": o.ancho_cm ? { "@type": "QuantitativeValue", "value": o.ancho_cm, "unitCode": "CMT" } : undefined,
    "height": o.alto_cm ? { "@type": "QuantitativeValue", "value": o.alto_cm, "unitCode": "CMT" } : undefined,
    "description": o.descripcion || undefined,
    "creator": {
      "@type": "Person",
      "name": "Julio Machado",
      "url": SITE_URL
    },
    "offers": (!o.vendida && precioNum) ? {
      "@type": "Offer",
      "price": precioNum,
      "priceCurrency": "ARS",
      "availability": o.disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": url
    } : undefined
  };
  // Limpiar keys undefined
  JSON.stringify(schema, (k, v) => v === undefined ? undefined : v);
  const schemaClean = JSON.parse(JSON.stringify(schema));

  return `<!DOCTYPE html>
<html lang="es">
<head>
${GA_SNIPPET}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(o.titulo)} — Julio Machado</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${escapeHtml(o.titulo)} — Julio Machado">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:image" content="${imagenUrl}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">
${JSON.stringify(schemaClean, null, 2)}
</script>
<style>${SHARED_STYLE}</style>
</head>
<body>

<nav>
  <a href="/" class="nav-brand">Julio Machado<em>Pintor · Argentina</em></a>
  <a href="/#portfolio" class="nav-back">← Volver al portfolio</a>
</nav>

<main id="main">
  <div class="obra-grid">
    <div class="obra-img-wrap">
      <img src="${escapeHtml(o.imagen || '')}" alt="${escapeHtml(o.titulo)} — Julio Machado" loading="eager">
    </div>
    <div class="obra-detail">
      <p class="obra-eyebrow">${escapeHtml(categoria)} · Julio Machado</p>
      <h1 class="obra-titulo">${escapeHtml(o.titulo)}</h1>
      <p class="obra-tecnica">${escapeHtml(o.tecnica || '')}</p>
      <p class="obra-desc">${escapeHtml(o.descripcion || '')}</p>
      <div class="ficha">${fichaHTML}</div>
      ${vendidaTag}
      <div class="obra-precio-wrap">
        <div class="obra-precio-label">${precioLabel}</div>
        ${!o.vendida ? '<div class="obra-precio">' + escapeHtml(o.precio) + '</div>' : ''}
      </div>
      <div class="acciones">${accionesHTML}</div>

      <div style="margin-top:20px;padding:16px;background:var(--paper-2);border-radius:4px;font-size:12px;color:var(--ink-2);line-height:1.8;">
        ${queIncluyeHTML}
      </div>

      ${certHTML}
    </div>
  </div>
</main>

<footer>
  <div class="footer-inner">
    <div class="footer-brand">Julio Machado <span>Pintor · Argentina</span></div>
    <span class="footer-copy">© 2025 · Todos los derechos reservados</span>
  </div>
</footer>

${!esSoloPrint ? `<script>
  new QRCode(document.getElementById('obraQr'), {
    text: '${url}',
    width: 64,
    height: 64,
    colorDark: '#1a1814',
    colorLight: '#fdfcfa',
    correctLevel: QRCode.CorrectLevel.M
  });
</script>` : ''}
</body>
</html>
`;
}

// ---------- Escribir archivos ----------

const outDir = path.join(__dirname, 'obra');
const urls = [`${SITE_URL}/`];

obras.forEach(o => {
  if (!o.titulo) return;
  const slug = slugify(o.titulo || o.id);
  const dir = path.join(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = buildObraHTML(o);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
  urls.push(`${SITE_URL}/obra/${slug}/`);
  console.log(`  ✓ /obra/${slug}/index.html`);
});

// ---------- sitemap.xml ----------

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf-8');

console.log(`build-obras: listo. ${urls.length - 1} páginas de obra + sitemap.xml generado.`);
