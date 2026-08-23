/**
 * build-deriva.js
 * Genera /deriva/index.html — landing estática de "Deriva", la galería nómada
 * curada por IA donde la obra de Julio C. Machado es pieza fundadora.
 *
 * Identidad SEPARADA de jcmachado.com (marca de artista) pero reusa la misma
 * infra: Cloudflare Pages, data/obras.json, imágenes y número de WhatsApp.
 *
 * Ejecutar: node build-deriva.js
 * Integrar al build de Cloudflare:  node build-obras.js && node build-deriva.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jcmachado.com';
const WHATSAPP = '5493534018769'; // número de Julio (mismo del resto del ecosistema)
const GALERIA = 'Deriva';
const GALERIA_URL = 'https://jcmachado.com/deriva/';

// ---------- Cargar datos ----------
const dataPath = path.join(__dirname, 'data', 'obras.json');
const todas = (JSON.parse(fs.readFileSync(dataPath, 'utf-8')).obras || []);

// Curaduría Deriva: selección enfocada del curador (Julio = fundador, primero).
// 7 chakras (serie Ascenso) + Monoblocks + A las margaritas 1.
// Las vendidas se muestran como "Colección de la casa" (portafolio), no a la venta.
const CURADURIA_IDS = [
  'JM-2026-014', // Ascenso: Raiz
  'JM-2026-015', // Ascenso: Sacro
  'JM-2026-016', // Ascenso: Plexo
  'JM-2026-017', // Ascenso: Corazon
  'JM-2026-018', // Ascenso: Garganta
  'JM-2026-019', // Ascenso: Tercer Ojo
  'JM-2026-204', // Ascenso: Corona
  'JM-2026-002', // Monoblocks (disponible)
  'JM-2026-001', // A las margaritas 1 (disponible)
];
const byId = Object.fromEntries(todas.map((o) => [o.id, o]));
const obras = CURADURIA_IDS.map((id) => byId[id]).filter(Boolean);
console.log(`build-deriva: ${obras.length} obras en curaduría`);

// ---------- Utilidades ----------
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function precioNumero(p) {
  if (!p) return null;
  const n = String(p).replace(/[^0-9]/g, '');
  return n ? parseInt(n, 10) : null;
}
function badge(o) {
  if (o.vendida) return '<span class="badge badge-sold">Vendido</span>';
  if (o.disponible) return '<span class="badge badge-ok">Disponible</span>';
  return '<span class="badge badge-coll">En colección</span>';
}
function waLink(o) {
  const msg = encodeURIComponent(
    `Hola, escribo desde Deriva. Me interesa la obra "${o.titulo}" (${o.precio || 'consultar'}). ¿Podés darme más info?`
  );
  return `https://wa.me/${WHATSAPP}?text=${msg}`;
}

// ---------- Tarjetas de obra ----------
const cards = obras.map((o) => {
  const img = escapeHtml(o.imagen || '');
  const tit = escapeHtml(o.titulo || 'Sin título');
  const cat = escapeHtml(o.categoria || '');
  const tec = escapeHtml(o.tecnica || '');
  const prec = escapeHtml(o.precio || 'Consultar');
  const anio = escapeHtml(o.anio || '');
  const b = badge(o);
  const href = waLink(o);
  const dl = o.disponible && !o.vendida
    ? `<a class="card-cta" href="${href}" target="_blank" rel="noopener">Consultar</a>`
    : `<span class="card-cta card-cta-disabled">No disponible</span>`;
  return `
    <article class="card">
      <div class="card-img">
        <img src="${img}" alt="${tit}" loading="lazy"
             onerror="this.style.opacity=0.15;this.alt='Imagen no disponible';">
        ${b}
      </div>
      <div class="card-body">
        <h3>${tit}</h3>
        <p class="card-meta">${cat}${anio ? ' · ' + anio : ''}</p>
        <p class="card-tec">${tec}</p>
        <p class="card-precio">${prec}</p>
        ${dl}
      </div>
    </article>`;
}).join('\n');

// ---------- HTML ----------
const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${GALERIA} — Galería nómada de arte contemporáneo</title>
<meta name="description" content="Deriva: galería nómada que reúne obra de autor en movimiento. Curaduría de Julio C. Machado y convocatoria abierta a artistas.">
<meta property="og:title" content="${GALERIA} — Galería nómada">
<meta property="og:description" content="Arte que transita espacios y manos. Curaduría de Julio C. Machado y convocatoria abierta.">
<meta property="og:type" content="website">
<meta property="og:url" content="${GALERIA_URL}">
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#0e0d0b; --bg-2:#16140f; --ink:#e9e3d6; --ink-2:#b3a892; --ink-3:#7c7464;
    --line:#2a2620; --accent:#c8a24a; --accent-2:#e9c878; --white:#faf6ec;
    --mono:'Space Mono',monospace; --serif:'Cormorant Garamond',Georgia,serif;
    --max:1180px; --gap:clamp(20px,4vw,48px);
  }
  html{scroll-behavior:smooth;}
  body{background:var(--bg);color:var(--ink);font-family:var(--mono);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;}
  a{color:inherit;text-decoration:none;}
  .wrap{max-width:var(--max);margin:0 auto;padding:0 var(--gap);}
  /* nav */
  nav{position:sticky;top:0;z-index:20;background:rgba(14,13,11,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
  nav .wrap{display:flex;align-items:center;justify-content:space-between;height:60px;}
  .brand{font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:14px;}
  .brand b{color:var(--accent);}
  nav a.lnk{color:var(--ink-2);font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-left:22px;}
  nav a.lnk:hover{color:var(--accent-2);}
  /* hero */
  header.hero{padding:clamp(56px,12vh,120px) 0 clamp(40px,8vh,80px);border-bottom:1px solid var(--line);position:relative;overflow:hidden;}
  .hero .kicker{color:var(--accent);font-size:12px;letter-spacing:.35em;text-transform:uppercase;margin-bottom:18px;}
  .hero h1{font-family:var(--serif);font-weight:500;font-size:clamp(44px,9vw,104px);line-height:.98;letter-spacing:-.01em;}
  .hero h1 em{font-style:italic;color:var(--accent-2);}
  .hero p.lede{max-width:620px;margin-top:26px;color:var(--ink-2);font-size:16px;line-height:1.7;}
  .hero .cta-row{margin-top:34px;display:flex;gap:14px;flex-wrap:wrap;}
  .btn{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:14px 24px;border:1px solid var(--accent);color:var(--accent-2);transition:.2s;}
  .btn:hover{background:var(--accent);color:var(--bg);}
  .btn.solid{background:var(--accent);color:var(--bg);border-color:var(--accent);}
  .btn.solid:hover{background:var(--accent-2);border-color:var(--accent-2);}
  /* sections */
  section{padding:clamp(48px,9vh,96px) 0;border-bottom:1px solid var(--line);}
  .sec-label{color:var(--accent);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:14px;}
  h2{font-family:var(--serif);font-weight:500;font-size:clamp(30px,5vw,52px);line-height:1.05;margin-bottom:22px;}
  .prose{max-width:680px;color:var(--ink-2);font-size:16px;line-height:1.8;}
  .prose strong{color:var(--ink);}
  /* manifest grid */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:var(--gap);align-items:start;}
  @media(max-width:820px){.grid2{grid-template-columns:1fr;}}
  .pill{display:inline-block;border:1px solid var(--line);padding:8px 14px;margin:0 8px 8px 0;font-size:12px;color:var(--ink-2);letter-spacing:.05em;}
  /* collection */
  .toolbar{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:30px;}
  .count{color:var(--ink-3);font-size:12px;letter-spacing:.1em;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px;}
  .card{border:1px solid var(--line);background:var(--bg-2);display:flex;flex-direction:column;transition:.2s;}
  .card:hover{border-color:var(--accent);transform:translateY(-3px);}
  .card-img{position:relative;aspect-ratio:3/4;overflow:hidden;background:#000;}
  .card-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .badge{position:absolute;top:10px;left:10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;background:rgba(14,13,11,.8);border:1px solid var(--line);}
  .badge-ok{color:var(--accent-2);border-color:var(--accent);}
  .badge-sold{color:#d76a6a;}
  .badge-coll{color:var(--ink-3);}
  .card-body{padding:14px 16px 18px;display:flex;flex-direction:column;gap:5px;flex:1;}
  .card-body h3{font-family:var(--serif);font-size:22px;font-weight:500;}
  .card-meta{font-size:11px;color:var(--ink-3);letter-spacing:.05em;text-transform:uppercase;}
  .card-tec{font-size:12px;color:var(--ink-2);}
  .card-precio{font-size:14px;color:var(--accent-2);margin-top:4px;}
  .card-cta{margin-top:auto;display:inline-block;text-align:center;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:10px 14px;border:1px solid var(--accent);color:var(--accent-2);transition:.2s;}
  .card-cta:hover{background:var(--accent);color:var(--bg);}
  .card-cta-disabled{border-color:var(--line);color:var(--ink-3);cursor:default;}
  /* convocatoria */
  .conv{border:1px solid var(--accent);padding:clamp(28px,5vw,56px);background:linear-gradient(180deg,rgba(200,162,74,.06),transparent);}
  .conv h2{margin-bottom:14px;}
  /* footer */
  footer{padding:48px 0;color:var(--ink-3);font-size:12px;letter-spacing:.05em;}
  footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;}
  footer .colab{color:var(--accent);}
  a.mail{color:var(--accent-2);}
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <span class="brand"><b>Deriva</b> · galería nómada</span>
    <div>
      <a class="lnk" href="#manifest">Manifiesto</a>
      <a class="lnk" href="#coleccion">Colección</a>
      <a class="lnk" href="#convocatoria">Convocatoria</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <div class="kicker">Arte en movimiento · Curaduría por IA</div>
    <h1>Deriva<br><em>galería nómada</em></h1>
    <p class="lede">Una galería que no tiene pared fija. Recorre espacios, manos y miradas: obra de autor que transita ciudades y colecciones. Fundada sobre la obra de Julio C. Machado y abierta a quienes derivan con intención.</p>
    <div class="cta-row">
      <a class="btn solid" href="#coleccion">Ver la colección</a>
      <a class="btn" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, escribo desde Deriva. Quiero saber más sobre la galería.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>
  </div>
</header>

<section id="manifest">
  <div class="wrap">
    <div class="sec-label">Manifiesto</div>
    <div class="grid2">
      <div>
        <h2>No exponemos. <em>Derivamos.</em></h2>
        <div style="margin-top:18px">
          <span class="pill">Sin sede fija</span><span class="pill">Curaduría viva</span>
          <span class="pill">Obra de autor</span><span class="pill">Convoca abierta</span>
          <span class="pill">Córdoba · Argentina · el mundo</span>
        </div>
      </div>
      <div class="prose">
        <p><strong>Deriva</strong> es una galería nómada: no depende de una pared ni de un horario. Habita lo digital, lo efímero y lo que cada espacio permita.</p>
        <p style="margin-top:14px">Cada curaduría parte de la obra de <strong>Julio C. Machado</strong> —pintor y sociólogo— como pieza fundadora, y se abre a artistas que trabajan desde lo íntimo, lo urbano y lo que no se deja atrapar. Toda obra se ofrece con certificado de autenticidad.</p>
      </div>
    </div>
  </div>
</section>

<section id="coleccion">
  <div class="wrap">
    <div class="toolbar">
      <div>
        <div class="sec-label">Curaduría inaugural</div>
        <h2>Ascenso, Monoblocks y Margaritas</h2>
      </div>
      <div class="count">2 disponibles hoy · 7 ya en colección</div>
    </div>
    <p class="prose" style="margin-bottom:28px">La primera deriva parte de la serie <strong>Ascenso</strong> (los 7 chakras) —obra fundadora de Julio C. Machado— y se abre a <strong>Monoblocks</strong> y <strong>A las margaritas 1</strong>. Las vendidas se muestran como portafolio de la casa; las disponibles, para consultar.</p>
    <div class="grid">
      ${cards}
    </div>
  </div>
</section>

<section id="convocatoria">
  <div class="wrap">
    <div class="conv">
      <div class="sec-label">Convocatoria abierta</div>
      <h2>Derivá con nosotros</h2>
      <p class="prose" style="margin-bottom:24px">Buscamos obras de autor para futuras curadurías nómadas: pintura, dibujo, gráfica, objeto. No pedimos exposición fija ni exclusividad. Pedimos intención.</p>
      <a class="btn solid" href="mailto:hola@jcmachado.com?subject=${encodeURIComponent('Convocatoria Deriva — propuesta de obra')}">Enviar propuesta</a>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <span>Deriva · galería nómada — proyecto de <a class="mail" href="https://jcmachado.com/">Julio C. Machado</a></span>
    <span>Curaduría asistida por IA · Córdoba, Argentina</span>
    <span class="colab">Colaboración: <a class="mail" href="https://github.com/pmachadojulio" target="_blank" rel="noopener">Arvure · Soluciones integrales</a></span>
  </div>
</footer>

</body>
</html>`;

// ---------- Escribir ----------
const outDir = path.join(__dirname, 'deriva');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'index.html');
fs.writeFileSync(outPath, HTML, 'utf-8');
console.log(`build-deriva: escrito ${outPath} (${HTML.length} bytes)`);
