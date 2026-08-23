#!/usr/bin/env node
/**
 * nuevo_post.js — pipeline automatizado de blog
 *
 * Fase 1:  node scripts/nuevo_post.js init <slug> "<Título>" [YYYY-MM-DD]
 *          → crea blog/posts/<fecha>-<slug>.md desde _plantilla.md
 *
 * (Escribir el contenido en el .md)
 *
 * Fase 2:  node scripts/nuevo_post.js build <fecha>-<slug>.md
 *          → genera blog/<slug>/index.html (clona el shell del último post),
 *            renderiza el markdown, arma las tarjetas de obras desde data/obras.json,
 *            inserta la tarjeta en blog/index.html y la entrada en el JSON-LD.
 *          → recordar correr: node build-obras.js (actualiza sitemap)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const SHELL = path.join(BLOG, 'aura-benjamin', 'index.html');
const SITE = 'https://jcmachado.com';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- markdown mínimo ---------- */
function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function mdToHtml(md) {
  const out = [];
  let para = [], lista = false;
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const closeLista = () => { if (lista) { out.push('</ul>'); lista = false; } };
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); closeLista(); continue; }
    let m;
    if ((m = line.match(/^##\s+(.+)/))) { flushPara(); closeLista(); out.push('<h2>' + inline(m[1]) + '</h2>'); }
    else if ((m = line.match(/^>\s?(.*)/))) { flushPara(); closeLista(); out.push('<blockquote>\n' + inline(m[1]) + '\n</blockquote>'); }
    else if ((m = line.match(/^-\s+(.+)/))) { flushPara(); if (!lista) { out.push('<ul>'); lista = true; } out.push('<li>' + inline(m[1]) + '</li>'); }
    else if ((m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) { flushPara(); closeLista(); out.push(`<figure class="post-figure"><img src="${m[2]}" alt="${escapeHtml(m[1])}" loading="lazy"><figcaption>${escapeHtml(m[1])}</figcaption></figure>`); }
    else { closeLista(); para.push(line); }
  }
  flushPara(); closeLista();
  return out.join('\n');
}

/* ---------- frontmatter ---------- */
function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('Sin frontmatter');
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: m[2] };
}

/* ---------- fase init ---------- */
function init(slug, titulo, fecha) {
  fecha = fecha || new Date().toISOString().slice(0, 10);
  const plantilla = fs.readFileSync(path.join(BLOG, '_plantilla.md'), 'utf8');
  const md = plantilla
    .replace(/^title: "Título del post"/m, `title: "${titulo}"`)
    .replace(/^date: .*/m, `date: ${fecha}`);
  const file = path.join(BLOG, 'posts', `${fecha}-${slug}.md`);
  fs.writeFileSync(file, md);
  console.log(`✓ Creado ${file}\n\nSiguiente paso:\n  1. Escribir el contenido en ese archivo\n  2. node scripts/nuevo_post.js build ${fecha}-${slug}.md`);
}

/* ---------- fase build ---------- */
function build(postFile) {
  const src = fs.readFileSync(path.join(BLOG, 'posts', postFile), 'utf8');
  const { meta, body } = parseFrontmatter(src);
  const slug = postFile.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const url = `${SITE}/blog/${slug}/`;
  const imagen = meta.image || '/imagenes/Raiz.webp';

  // Obras relacionadas desde data/obras.json
  const obrasJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'obras.json'), 'utf8'));
  const obras = Array.isArray(obrasJson) ? obrasJson : obrasJson.obras;
  const slugify = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slugsObra = String(meta.obra || '').split(',').map(s => s.trim()).filter(Boolean);
  const cardsObras = slugsObra.map(so => {
    const o = obras.find(x => x.id === so || x.slug === so || slugify(x.titulo || x.id) === so);
    if (!o) { console.warn(`⚠ obra no encontrada en obras.json: ${so}`); return ''; }
    return `          <a class="obra-card" href="/obra/${so}/">\n            <img src="${escapeHtml(o.imagen || '')}" alt="${escapeHtml(o.titulo)}" loading="lazy">\n            <span>${escapeHtml(o.titulo)}</span>\n          </a>`;
  }).filter(Boolean).join('\n');

  let html = fs.readFileSync(SHELL, 'utf8');
  const contenido = mdToHtml(body);

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)} — Blog · Julio Machado</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(meta.excerpt || '')}$2`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(meta.title)}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(meta.excerpt || '')}$2`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${SITE}${imagen}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);

  // JSON-LD BlogPosting propio
  const ld = `\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "BlogPosting",\n  "headline": ${JSON.stringify(meta.title)},\n  "image": ${JSON.stringify(SITE + imagen)},\n  "url": ${JSON.stringify(url)},\n  "datePublished": ${JSON.stringify(meta.date)},\n  "author": { "@type": "Person", "name": "Julio Machado", "url": ${JSON.stringify(SITE)} },\n  "description": ${JSON.stringify(meta.excerpt || '')},\n  "publisher": { "@type": "Person", "name": "Julio Machado" }\n}\n</script>`;
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ld);

  // Cuerpo
  html = html.replace(/(<p class="post-eyebrow">)[^<]*(<\/p>)/, `$1${meta.categoria || 'Ensayo'} · Julio Machado$2`);
  html = html.replace(/(<h1 class="post-title">)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(meta.title)}$2`);
  html = html.replace(/(<p class="post-meta">)[^<]*(<\/p>)/, `$1${fechaLarga(meta.date)}$2`);
  html = html.replace(/(<div class="post-content">)[\s\S]*?(\n    <\/div>\s*\n\s*\n?\s*<div class="post-obras")/, `$1\n${contenido}$2`);

  // Obras relacionadas
  html = html.replace(/(<div class="post-obras">)[\s\S]*?(<\/div>\s*\n\s*<\/div>|\n      <\/div>\n    <div class="post-tags")/,
    `$1\n        <h3>Obras de las que habla esta nota</h3>\n        <div class="obras-grid">\n${cardsObras}\n        </div>\n      $2`.replace('$2', '$2'));

  // Tags
  const tags = String(meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  html = html.replace(/<div class="post-tags">[\s\S]*?<\/div>/,
    `<div class="post-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`);

  const dir = path.join(BLOG, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  // Tarjeta en blog/index.html
  const idxPath = path.join(BLOG, 'index.html');
  let idx = fs.readFileSync(idxPath, 'utf8');
  if (!idx.includes(`/blog/${slug}/`)) {
    const card = `      <li class="post-item">\n        <a href="/blog/${slug}/"><img class="post-thumb" src="${imagen}" alt="${escapeHtml(meta.title)}" loading="lazy"></a>\n        <div>\n          <div class="post-cat">${meta.categoria || 'Ensayo'}</div>\n          <h2><a href="/blog/${slug}/">${escapeHtml(meta.title)}</a></h2>\n          <p class="excerpt">${escapeHtml(meta.excerpt || '')}</p>\n          <span class="date">${fechaLarga(meta.date)}</span>\n        </div>\n      </li>\n`;
    idx = idx.replace('<!-- posts-inicio -->\n', `<!-- posts-inicio -->\n${card}`);
    idx = idx.replace(/("blogPost": \[\n)([\s\S]*?)(\n  \]\n\})/, (mm, a, entries, c) => {
      const nuevo = `    {\n      "@type": "BlogPosting",\n      "headline": ${JSON.stringify(meta.title)},\n      "url": ${JSON.stringify(url)},\n      "datePublished": ${JSON.stringify(meta.date)}\n    }`;
      return a + nuevo + ',\n' + entries.trimEnd() + c;
    });
    fs.writeFileSync(idxPath, idx);
  }

  console.log(`✓ Post generado: blog/${slug}/index.html`);
  console.log(`✓ Tarjeta agregada a blog/index.html (+ JSON-LD)`);
  console.log(`\nPendiente manual:\n  - node build-obras.js  (sitemap)\n  - revisar el post en el navegador antes de pushear`);
}

const [, , cmd, ...args] = process.argv;
if (cmd === 'init') init(args[0], args[1] || 'Título del post', args[2]);
else if (cmd === 'build') build(args[0]);
else console.log('Uso:\n  node scripts/nuevo_post.js init <slug> "<Título>" [fecha]\n  node scripts/nuevo_post.js build <fecha>-<slug>.md');
