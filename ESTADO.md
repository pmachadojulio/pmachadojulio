# Estado del proyecto — jcmachado.com

> Documento vivo. Actualizado: **2026-08-06**
> Cada vez que avanzamos un frente, actualizamos esta hoja.

---

## 1. De dónde venimos

### Sitio y admin (julio 2026)
- Sitio **jcmachado.com** publicado en Cloudflare Pages (repo público
  `pmachadojulio/pmachadojulio`, rama `main`). Se deploya solo con cada push.
- Panel de administración en `/admin`: login con contraseña + token de 12 h.
  - Obras (alta/edición con subida de imagen), Suscriptores, Analytics (GA4),
    CRM/Prospectos, Ventas, Precios, Certificados, Borradores Gmail y Marketing.

### Marketing (agosto 2026)
- **2026-08-04 — CRM verificado:** 25 contactos reales cargados a mano
  (galerías del Mercado de Arte de Córdoba, hoteles serranos, interioristas).
  Se corrigieron 14 contactos fabricados que había inventado una IA.
- **2026-08-05 — Scraping Apify (Google Places):** 454 negocios únicos
  (150 interiorismo, 145 arquitectura, 100 hoteles, 59 galerías) → 247 de
  Córdoba. Consolidado el **CRM con 222 contactos reales**. Enriquecimiento de
  emails: **16 contactos con email verificado** (Google Maps no publica emails;
  el resto se contacta por WhatsApp/teléfono).
- **2026-08-05 — Campaña de emails:** 40 borradores por categoría
  (galería → exhibición, hotel → serie Ascenso, interiorismo → Ascenso,
  arquitectura → serie urbana Monoblocks), con links reales a las obras.
- **2026-08-05 — Newsletter:** sistema de prompts (combinaciones autor ×
  temática) + Newsletter #1 (Benjamin × el aura, obra Mr. Pink).
- **2026-08-06 — Operativo:** newsletter con **botón CTA**, borradores con
  **saludo personalizado por nombre**, stack **WhatsApp (WAHA + n8n)** armado,
  **radar de visibilidad $0** y vista **Marketing** en el admin.
- **2026-08-06 — Blog/SEO:** estructura de blog estática (`build-blog.js`,
  posts en markdown, sitemap + RSS + JSON-LD), primer post publicado (Benjamin
  × el aura), botón **Blog** en la navegación junto a "Hacer un encargo".

---

## 2. Cómo estamos hoy

| Frente | Estado | Dato |
|---|---|---|
| Sitio web | ✅ Publicado | ~427 vistas en `/` (GA4) |
| Admin | ✅ Operativo | Login 12 h, todo desde el panel |
| CRM | ✅ 222 contactos reales | 40 email · 200 teléfono · 147 web |
| Newsletter | 🟡 #1 listo con botón | Falta enviar desde Gmail |
| Emails | 🟡 40 borradores | Saludo por nombre, listos para enviar |
| WhatsApp | 🟡 Stack armado | Falta: Docker local + QR + 1er envío |
| Blog/SEO | ✅ Estructura + post #1 | Benjamin × el aura · RSS + sitemap + JSON-LD |
| Radar $0 | 🔵 Checklist creado | **Pendiente de ejecución** |
| Presupuesto | 💰 $0 de publicidad | Apify usado ~$3.83 de $5 (crédito gratis) |

### Números que importan
- **222** contactos · **40** con email · **200** con teléfono · **40** borradores de email.
- WhatsApp es el canal masivo real (200 teléfonos); el email, el canal de calidad (16-40).

---

## 3. Hacia dónde vamos

### Semana (prioridad máxima)
1. **Probar WhatsApp local**: Docker + QR + primer envío a tu propio número
   (guía en Admin → Marketing → WhatsApp).
2. **Enviar Newsletter #1** desde Gmail (copiar HTML con botón desde el admin).
3. **Enviar primeros 10-20 emails** de la campaña (revisar en la pestaña Emails).

### Mes 1 — Ejecutar el Radar $0
- Perfiles: Instagram, TikTok, Pinterest, Behance, Google Business Profile, marketplaces.
- **14 días de contenido** (1 publicación/día) según el calendario del admin.
- Outreach: emails + WhatsApp (10/día) + **visitas a galerías** (1/semana).
- Prensa local (La Voz, Perfil Córdoba, El Doce, Radio Universidad).
- Si el WhatsApp va 24/7 → mover WAHA a **Oracle Cloud Free Tier** (gratis).

### Mes 2-3 — Convertir
- Segundas y terceras newsletters (sistema de prompts ya funciona).
- Vender originales y prints: links de pago (MercadoPago/PayPal) por obra.
- Medir con GA4 qué canal trae visitas y ajustar.

### Ideas para más adelante (cuando pidamos)
- Encargos de retratos: página + formulario + testimonios.
- Prints a la venta online (Etsy/MercadoLibre) con certificado y QR.
- Blog corto en el sitio (mismo contenido del newsletter → SEO).
- A/B testing de mensajes de WhatsApp y asuntos de email.

---

## Reglas de trabajo (para no pisarnos)
- Todo sale por `git push` a `main` → Cloudflare Pages deployea solo.
- Antes de cada push: `git pull --rebase origin main`.
- No subir secretos al repo público (`.env` está en `.gitignore`).
- Los 14 contactos fabricados quedaron marcados en el CRM: no contactar.
