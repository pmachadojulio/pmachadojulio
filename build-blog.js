/**
 * build-blog.js
 * Genera el blog estático de jcmachado.com:
 *   blog/posts/{YYYY-MM-DD}-{slug}.md   ->  blog/{slug}/index.html (página del post)
 *                                          blog/index.html        (listado)
 *                                          blog/rss.xml           (feed)
 *
 * Formato de cada post (front matter entre ---):
 *   ---
 *   title: "Título"
 *   date: 2026-08-06
 *   excerpt: "Resumen corto para el listado y meta description"
 *   image: /imagenes/Raiz.webp
 *   categoria: Ensayo
 *   tags: "Benjamín, Aura, Materialidad"
 *   obra: "mr-pink, ascenso-corazon"   (slugs de obras relacionadas, opcional)
 *   ---
 *   Cuerpo en markdown (##, ###, **negrita**, *cursiva*, [texto](url), - listas, > cita).
 *
 * Uso local:  node build-blog.js
 * (No necesita build command en Cloudflare: los HTML generados se commitean.
 *  build-obras.js ya incluye las URLs del blog en sitemap.xml.)
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jcmachado.com';
const BLOG_DIR = path.join(__dirname, 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const WHATSAPP = '5493534018769';
const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PP48JV4JK7"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PP48JV4JK7');
</script>`;

// ---------- Utilidades ----------

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fechaEs(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

// ---------- Markdown (subconjunto controlado) ----------

function inline(texto) {
  return escapeHtml(texto)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, href) => {
      const segura = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return `<a href="${segura}">${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function bloques(md) {
  const parrafos = md.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const html = [];
  let enLista = false;
  let enCita = false;

  const cerrar = () => {
    if (enLista) { html.push('</ul>'); enLista = false; }
    if (enCita) { html.push('</blockquote>'); enCita = false; }
  };

  for (const p of parrafos) {
    const lineas = p.split('\n');
    const esLista = lineas.every(l => l.trim().startsWith('- '));
    const esCita = lineas.every(l => l.trim().startsWith('> '));

    if (esLista) {
      if (!enLista) { cerrar(); html.push('<ul>'); enLista = true; }
      for (const l of lineas) html.push(`<li>${inline(l.trim().replace(/^- /, ''))}</li>`);
      continue;
    }
    if (esCita) {
      if (!enCita) { cerrar(); html.push('<blockquote>'); enCita = true; }
      html.push(inline(lineas.map(l => l.trim().replace(/^> ?/, '')).join(' ')));
      continue;
    }

    const primera = lineas[0].trim();
    if (primera.startsWith('## ')) {
      cerrar();
      html.push(`<h2>${inline(primera.slice(3))}</h2>`);
      if (lineas[1]) html.push(`<p>${inline(lineas.slice(1).join(' '))}</p>`);
      continue;
    }
    if (primera.startsWith('### ')) {
      cerrar();
      html.push(`<h3>${inline(primera.slice(4))}</h3>`);
      if (lineas[1]) html.push(`<p>${inline(lineas.slice(1).join(' '))}</p>`);
      continue;
    }
    const img = p.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      cerrar();
      html.push(`<figure class="post-figure"><img src="${escapeHtml(img[2])}" alt="${escapeHtml(img[1])}" loading="lazy"><figcaption>${escapeHtml(img[1])}</figcaption></figure>`);
      continue;
    }
    cerrar();
    html.push(`<p>${inline(lineas.join(' '))}</p>`);
  }
  cerrar();
  return html.join('\n');
}

// ---------- Leer posts ----------

function leerPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const posts = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) { console.warn('  ⚠ Front matter inválido en', f); continue; }
    const meta = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([a-z]+):\s?(.*)$/);
      if (kv) meta[kv[1]] = kv[2].replace(/^"|"$/g, '');
    }
    const dateFile = (f.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || meta.date;
    const slug = (f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''));
    posts.push({ slug, file: f, date: meta.date || dateFile, title: meta.title, excerpt: meta.excerpt || '', image: meta.image || '/imagenes/Raiz.webp', categoria: meta.categoria || 'Ensayo', tags: (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean), obra: (meta.obra || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean), body: m[2] });
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- Estilos compartidos ----------

const SHARED_STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #1a1814; --ink-2: #4a4740; --ink-3: #8a8780;
    --paper: #f5f2ed; --paper-2: #ede9e2; --paper-3: #e4dfd6;
    --accent: #8b5e3c; --accent-light: #c4956a; --white: #fdfcfa;
    --serif: 'Cormorant Garamond', Georgia, serif;
    --sans: 'DM Sans', system-ui, sans-serif;
    --max: 760px; --gap: clamp(24px, 5vw, 60px);
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); background: var(--paper); color: var(--ink); font-size: 16px; line-height: 1.7; }
  img { display: block; max-width: 100%; }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(139,94,60,0.3); transition: color 0.2s, border-color 0.2s; }
  a:hover { color: var(--accent-light); border-color: var(--accent-light); }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px var(--gap); background: rgba(245,242,237,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(26,24,20,0.08); }
  .nav-brand { font-family: var(--serif); font-size: 22px; font-weight: 400; letter-spacing: 0.5px; color: var(--ink); border: none; }
  .nav-brand em { font-style: italic; color: var(--ink-3); font-size: 13px; display: block; font-family: var(--sans); letter-spacing: 2px; text-transform: uppercase; line-height: 1; margin-top: 1px; }
  .nav-back { font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-2); border-bottom: 1px solid var(--ink-3); padding-bottom: 2px; }
  .nav-back:hover { color: var(--accent); border-color: var(--accent); }
  main { max-width: var(--max); margin: 0 auto; padding: calc(110px + var(--gap)) var(--gap) var(--gap); }
  footer { background: var(--ink); color: var(--paper); padding: 32px var(--gap); margin-top: 80px; }
  .footer-inner { max-width: var(--max); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .footer-brand { font-family: var(--serif); font-size: 18px; font-weight: 300; }
  .footer-brand span { display: block; font-family: var(--sans); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(245,242,237,0.4); margin-top: 2px; }
  .footer-copy { font-size: 11px; color: rgba(245,242,237,0.3); }
  @media (max-width: 720px) { body { font-size: 15px; } }
`;

const POST_STYLE = `
  .post-eyebrow { font-family: var(--sans); font-size: 10px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
  .post-title { font-family: var(--serif); font-size: clamp(34px, 5.5vw, 52px); font-weight: 300; line-height: 1.05; letter-spacing: -0.5px; margin-bottom: 14px; }
  .post-title em { font-style: italic; color: var(--accent); }
  .post-meta { font-size: 12px; color: var(--ink-3); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid rgba(26,24,20,0.1); }
  .post-figure { margin: 36px 0; }
  .post-figure img { width: 100%; border-radius: 4px; }
  .post-figure figcaption { font-size: 12px; color: var(--ink-3); margin-top: 10px; font-style: italic; text-align: center; }
  .post-content p { font-weight: 300; color: var(--ink-2); line-height: 1.9; margin-bottom: 22px; }
  .post-content h2 { font-family: var(--serif); font-size: 28px; font-weight: 400; margin: 44px 0 14px; line-height: 1.2; }
  .post-content h2 em { font-style: italic; color: var(--accent); }
  .post-content h3 { font-family: var(--serif); font-size: 22px; font-weight: 400; margin: 34px 0 10px; }
  .post-content blockquote { border-left: 3px solid var(--accent); padding: 4px 0 4px 24px; margin: 28px 0; font-family: var(--serif); font-size: 21px; font-style: italic; color: var(--ink); line-height: 1.6; }
  .post-content ul { margin: 0 0 22px 6px; padding-left: 20px; }
  .post-content li { font-weight: 300; color: var(--ink-2); margin-bottom: 8px; line-height: 1.8; }
  .post-content img { border-radius: 4px; }
  .post-cta { margin-top: 48px; background: var(--ink); color: var(--paper); border-radius: 6px; padding: 32px; }
  .post-cta h3 { font-family: var(--serif); font-size: 26px; font-weight: 400; margin-bottom: 10px; }
  .post-cta h3 em { font-style: italic; color: var(--accent-light); }
  .post-cta p { font-size: 14px; font-weight: 300; color: rgba(245,242,237,0.7); line-height: 1.8; margin-bottom: 20px; }
  .post-cta .btn { display: inline-block; background: var(--paper); color: var(--ink); padding: 13px 26px; font-family: var(--sans); font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; border-radius: 2px; border: none; margin-right: 10px; }
  .post-cta .btn:hover { background: var(--accent-light); color: var(--white); }
  .post-cta .btn.wsp { background: transparent; color: var(--paper); border: 1px solid rgba(245,242,237,0.3); }
  .post-cta .btn.wsp:hover { border-color: var(--accent-light); color: var(--accent-light); }
  .post-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(26,24,20,0.1); }
  .post-tags .tag { font-family: var(--sans); font-size: 10px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-2); border: 1px solid rgba(26,24,20,0.15); border-radius: 40px; padding: 6px 14px; text-decoration: none; transition: all 0.2s; }
  .post-tags .tag:hover { border-color: var(--accent); color: var(--accent); }
  .post-obras { margin-top: 28px; }
  .post-obras h3 { font-family: var(--serif); font-size: 20px; font-weight: 400; margin-bottom: 14px; }
  .post-obras .obras-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .post-obras .obra-card { display: block; background: var(--paper-2); border-radius: 4px; overflow: hidden; border: none; transition: transform 0.2s, box-shadow 0.2s; }
  .post-obras .obra-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,24,20,0.1); }
  .post-obras .obra-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
  .post-obras .obra-card span { display: block; padding: 10px 12px; font-family: var(--serif); font-size: 16px; color: var(--ink); }
  @media (max-width: 720px) { .post-cta { padding: 24px; } }
`;

const INDEX_STYLE = `
  .blog-hero { margin-bottom: 56px; }
  .blog-eyebrow { font-family: var(--sans); font-size: 10px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
  .blog-title { font-family: var(--serif); font-size: clamp(38px, 6vw, 64px); font-weight: 300; line-height: 1.0; letter-spacing: -1px; max-width: 600px; }
  .blog-title em { font-style: italic; color: var(--accent); }
  .blog-sub { font-size: 15px; font-weight: 300; color: var(--ink-2); max-width: 460px; margin-top: 20px; line-height: 1.7; }
  .post-list { list-style: none; padding: 0; }
  .post-item { display: grid; grid-template-columns: 150px 1fr; gap: 28px; padding: 28px 0; border-top: 1px solid rgba(26,24,20,0.1); }
  .post-item:last-child { border-bottom: 1px solid rgba(26,24,20,0.1); }
  .post-thumb { aspect-ratio: 1 / 1; object-fit: cover; border-radius: 4px; background: var(--paper-2); width: 100%; }
  .post-cat { font-family: var(--sans); font-size: 9px; font-weight: 500; letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .post-item h2 { font-family: var(--serif); font-size: 26px; font-weight: 400; line-height: 1.15; margin-bottom: 8px; }
  .post-item h2 a { color: var(--ink); border: none; }
  .post-item h2 a:hover { color: var(--accent); }
  .post-item .excerpt { font-size: 13px; font-weight: 300; color: var(--ink-2); line-height: 1.7; margin-bottom: 10px; }
  .post-item .date { font-size: 11px; color: var(--ink-3); letter-spacing: 1.5px; text-transform: uppercase; }
  @media (max-width: 720px) {
    .post-item { grid-template-columns: 1fr; gap: 16px; }
    .post-thumb { max-width: 100%; aspect-ratio: 16 / 9; }
  }
`;

// ---------- Página de post ----------

function buildPostPage(post) {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const fecha = fechaEs(post.date);
  const img = post.image.startsWith('http') ? post.image : `${SITE_URL}${post.image}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "image": img,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": { "@type": "Person", "name": "Julio Machado", "url": SITE_URL, "jobTitle": "Pintor y Sociólogo" },
    "publisher": { "@type": "Organization", "name": "Julio Machado", "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.svg` } },
    "description": post.excerpt,
    "mainEntityOfPage": url,
    "keywords": [post.categoria, ...post.tags].join(', ')
  };
  const ctaWhatsApp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola Julio! Leí tu nota en el blog y me interesa tu trabajo.')}`;

  const tagsHtml = post.tags.length
    ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const obrasRel = OBRAS_BY_SLUG ? post.obra.map(slug => OBRAS_BY_SLUG[slug]).filter(Boolean) : [];
  const obrasHtml = obrasRel.length
    ? `<div class="post-obras">
        <h3>Obras de las que habla esta nota</h3>
        <div class="obras-grid">${obrasRel.map(o => `
          <a class="obra-card" href="/obra/${o.slug}/">
            <img src="${o.imagen}" alt="${escapeHtml(o.titulo)}" loading="lazy">
            <span>${escapeHtml(o.titulo)}</span>
          </a>`).join('')}
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
${GA_SNIPPET}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(post.title)} — Julio Machado, Pintor</title>
<meta name="description" content="${escapeHtml(post.excerpt.slice(0, 160))}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${escapeHtml(post.title)}">
<meta property="og:description" content="${escapeHtml(post.excerpt.slice(0, 160))}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Julio Machado — Pintor y Sociólogo">
<meta property="og:locale" content="es_AR">
<link rel="alternate" type="application/rss+xml" title="Julio Machado — Blog" href="${SITE_URL}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
<style>${SHARED_STYLE}${POST_STYLE}</style>
</head>
<body>

<nav>
  <a href="/" class="nav-brand">Julio Machado<em>Pintor · Argentina</em></a>
  <a href="/blog/" class="nav-back">← Blog</a>
</nav>

<main>
  <article>
    <p class="post-eyebrow">${escapeHtml(post.categoria)} · Julio Machado</p>
    <h1 class="post-title">${inline(post.title)}</h1>
    <p class="post-meta">${fecha}</p>
    <div class="post-content">
      ${bloques(post.body)}
    </div>

    ${obrasHtml}
    ${tagsHtml}

    <div class="post-cta">
      <h3>¿Te quedó resonando algo?</h3>
      <p>Cada óleo que pinto arranca en una idea como esta — el aura, la memoria, el espacio habitado. Si querés ver la obra de cerca o encargar un retrato, hablemos.</p>
      <a class="btn" href="/#portfolio">Ver el portfolio</a>
      <a class="btn wsp" href="${ctaWhatsApp}" target="_blank" rel="noopener">Escribirme por WhatsApp</a>
    </div>
  </article>
</main>

<footer>
  <div class="footer-inner">
    <div class="footer-brand">Julio Machado <span>Pintor · Argentina</span></div>
    <span class="footer-copy">© 2025 · Todos los derechos reservados</span>
  </div>
</footer>

</body>
</html>
`;
}

// ---------- Página de listado ----------

function buildIndexPage(posts) {
  const items = posts.map(p => {
    const url = `/blog/${p.slug}/`;
    return `
      <li class="post-item">
        <a href="${url}"><img class="post-thumb" src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy"></a>
        <div>
          <div class="post-cat">${escapeHtml(p.categoria)}</div>
          <h2><a href="${url}">${inline(p.title)}</a></h2>
          <p class="excerpt">${escapeHtml(p.excerpt)}</p>
          <span class="date">${fechaEs(p.date)}</span>
        </div>
      </li>`;
  }).join('');

  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Blog de Julio Machado",
    "url": `${SITE_URL}/blog/`,
    "author": { "@type": "Person", "name": "Julio Machado", "url": SITE_URL },
    "description": "Notas sobre arte, pintura y ciencias sociales — de Julio Machado, pintor y sociólogo argentino.",
    "blogPost": posts.map(p => ({ "@type": "BlogPosting", "headline": p.title, "url": `${SITE_URL}/blog/${p.slug}/`, "datePublished": p.date }))
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
${GA_SNIPPET}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — Julio Machado, Pintor y Sociólogo</title>
<meta name="description" content="Notas breves sobre arte, pintura al óleo y ciencias sociales: el aura de lo hecho a mano, la memoria de la ciudad, la identidad y el retrato.">
<link rel="canonical" href="${SITE_URL}/blog/">
<meta property="og:title" content="Blog — Julio Machado">
<meta property="og:description" content="Notas breves sobre arte y ciencias sociales, del pintor y sociólogo argentino.">
<meta property="og:image" content="${SITE_URL}/imagenes/Raiz.webp">
<meta property="og:url" content="${SITE_URL}/blog/">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<link rel="alternate" type="application/rss+xml" title="Julio Machado — Blog" href="${SITE_URL}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
<style>${SHARED_STYLE}${INDEX_STYLE}</style>
</head>
<body>

<nav>
  <a href="/" class="nav-brand">Julio Machado<em>Pintor · Argentina</em></a>
  <a href="/" class="nav-back">← Volver al inicio</a>
</nav>

<main>
  <div class="blog-hero">
    <p class="blog-eyebrow">Escritos</p>
    <h1 class="blog-title">Arte, pintura y<br><em>lo que no se deja ver.</em></h1>
    <p class="blog-sub">Notas breves que salen del taller: ideas de las ciencias sociales para mirar mejor la pintura — y la vida. Se pueden leer en 4 minutos.</p>
  </div>
  <ul class="post-list">
    ${items}
  </ul>
</main>

<footer>
  <div class="footer-inner">
    <div class="footer-brand">Julio Machado <span>Pintor · Argentina</span></div>
    <span class="footer-copy">© 2025 · Todos los derechos reservados</span>
  </div>
</footer>

</body>
</html>
`;
}

// ---------- RSS ----------

function buildRss(posts) {
  const items = posts.map(p => {
    const url = `${SITE_URL}/blog/${p.slug}/`;
    return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${escapeHtml(p.excerpt)}</description>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Julio Machado — Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Notas sobre arte, pintura y ciencias sociales.</description>
    <language>es-ar</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// ---------- Escribir archivos ----------

function cargarObras() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data/obras.json'), 'utf-8');
    const d = JSON.parse(raw);
    const obras = (d.obras || []).map(o => ({ ...o, slug: (o.slug || o.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') }));
    return Object.fromEntries(obras.map(o => [o.slug, o]));
  } catch (e) {
    console.warn('  ⚠ No pude cargar data/obras.json para las obras relacionadas:', String(e.message || e));
    return null;
  }
}

const OBRAS_BY_SLUG = cargarObras();
const posts = leerPosts();
console.log(`build-blog: ${posts.length} posts`);

for (const p of posts) {
  const dir = path.join(BLOG_DIR, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildPostPage(p), 'utf-8');
  console.log(`  ✓ /blog/${p.slug}/index.html`);
}

fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), buildIndexPage(posts), 'utf-8');
fs.writeFileSync(path.join(BLOG_DIR, 'rss.xml'), buildRss(posts), 'utf-8');
console.log('  ✓ /blog/index.html');
console.log('  ✓ /blog/rss.xml');

// ---------- Notificar a IndexNow (Bing, Yandex, Naver, Seznam) ----------
// No afecta a Google (no soporta IndexNow): para Google hay que usar Search Console.
async function notificarIndexNow(posts) {
  const urls = [`${SITE_URL}/blog/`, ...posts.map(p => `${SITE_URL}/blog/${p.slug}/`)];
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'jcmachado.com',
        key: '4ca0292d3c23b515a23b8c2b0dee355f',
        keyLocation: 'https://jcmachado.com/4ca0292d3c23b515a23b8c2b0dee355f.txt',
        urlList: urls
      })
    });
    console.log(`IndexNow -> ${res.status} (${urls.length} urls del blog)`);
  } catch (e) {
    console.log('IndexNow: sin conexión, se omite. ' + String(e.message || e));
  }
}
notificarIndexNow(posts);
