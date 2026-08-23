# Canales de venta — ideas y estado (presupuesto cero)

> Creado: 2026-08-23. Actualizar al probar cada canal.

## 🔴 En curso AHORA

### Emails B2B (tanda 2 — 79 borradores)
- Panel: `jcmachado.com/admin/` → Marketing → pestaña **Emails**.
- **Cómo funciona el tracking**: cada clic en "🚀 Enviar en Gmail" marca la fila como enviada automáticamente (queda atenuada con ✔). El botón **↩︎** desmarca (para errores o rebotes).
- ⚠️ El registro vive en el navegador que uses: marcar siempre desde la misma computadora.
- Ritmo: máx ~20/día. Filtro "Enviados" para ver progreso. Follow-up suave a los 20 primeros después de 7 días sin respuesta.

## 📋 Canales por probar (orden por velocidad de primera venta)

### 1. Mercado Libre ✅ EN VIVO (2026-08-23)
- **33 publicaciones activas**: 31 réplicas numeradas ($30.000) + 2 originales ($100k–$150k).
- Categoría: Cuadros de Autor (MLA432710). Ejemplo: https://articulo.mercadolibre.com.ar/MLA-3847861832-
- Publicación 100% automatizada con `scripts/ml_publicar.js` (tokens en ml_tokens.json, NO subir a git).
- Cuota de publicaciones "Gratis" agotada → el resto salió como **Clásica** (sin costo fijo; comisión solo al vender).
- **Pendientes del usuario**:
  - Revisar las publicaciones en mercadolibre.com.ar → Mis publicaciones (fotos, precios, envío).
  - Configurar los paquetes/envío si ML lo pide (modo me2 = ML maneja el envío).
  - Responder preguntas/compras RÁPIDO (la reputación es todo en ML).
  - Cuando agregue obras nuevas: `node scripts/ml_fichas.js && node scripts/ml_publicar.js publish`

### 2. Facebook Marketplace + grupos locales
- Grupos: "Arte y decoración Córdoba", compra/venta de la zona. Publicar réplicas y Ascenso 30×30.
- Cierre por WhatsApp. Costo $0. Repostear cada semana.

### 3. Prensa local gratis
- Pitch: "Artista argentino retrata a Charly/Cazzu/Tini al óleo". Adjuntar 3 fotos + link.
- Mandar a diarios/radios locales + medios culturales nacionales. Una nota = credibilidad instantánea.

### 4. Exposición en café/restaurante/hotel (consignación)
- Dejar 5–6 obras con QR a la ficha. $0 de costo. La gente ve el óleo real (el discurso del aura funciona en persona).
- Objetivo: los hoteles boutique ya contactados por email son candidatos.

### 5. Saatchi Art / Artfinder (internacional)
- Óleos en USD para compradores EEUU/Europa. Sin costo fijo (~35% comisión).
- Requiere fotos profesionales y bio en inglés — hacerlo cuando el pipeline local esté corriendo solo.

### 6. Google Search Console (10 min, técnico)
- Subir `https://jcmachado.com/sitemap.xml` → las 31 fichas entran a búsquedas tipo "retrato al óleo Argentina".

### 7. Canal de WhatsApp
- Difusión gratuita a seguidores. Complemento del newsletter mensual.

## 📅 Rutina semanal fija
Ver `marketing/calendario_30_dias.md`. Resumen: emails diarios ~20, 1 post blog/semana (`scripts/nuevo_post.js`), clips verticales de los 16 videos de proceso, Pinterest progresivo, viernes 15' revisando Contentsquare/GA4.

## Mercado Libre — automatización (API oficial)
1. Crear cuenta developer + app en https://developers.mercadolibre.com.ar
   - Redirect URI sugerida: `https://jcmachado.com/admin/ml-callback.html`
   - Anotar APP_ID (client_id) y SECRET_KEY.
2. `node scripts/ml_publicar.js auth-url` → abrir URL en navegador → autorizar → copiar el `code=...`
3. `node scripts/ml_publicar.js auth <code>` → guarda tokens en `ml_tokens.json` (NO subir a git).
4. `node scripts/ml_publicar.js publish --dry` → previsualizar publicaciones.
5. `node scripts/ml_publicar.js publish --max 5` → publica de a tandas.
- El script refresca el token solo y resuelve categoría automáticamente.
