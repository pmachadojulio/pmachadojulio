# Playbook de Contactos B2B — Córdoba → Argentina

> Objetivo: construir una lista de contactos REALES y verificados para ventas directas
> (originales, series, consignación) y colaboraciones. La lección clave de la auditoría:
> **los datos inventados rebotan o, peor, queman la reputación del remitente.**

## 1. Diagnóstico (2026-08-05)

De los 19 prospects en `data/prospects_crm.json`:

| Estado | Cantidad | Ejemplos |
|---|---|---|
| **Verificados correctos** | 2 | Da! Diseño, Arq & Co |
| **Verificados con email corregido** | 1 | Estudio Liberté (el gmail real ≠ el del JSON) |
| **Reales pero con datos incompletos/falsos** | 2 | Estudio Massanet (es de Villa María), Endetalle (dominio de email falso) |
| **No verificados / probablemente fabricados** | 14 | Maria Morelli, MUT, AR Arquitectos, estudios jurídicos, etc. |

**Regla de oro:** si no está en la web oficial del estudio/hotel/galería o en un
directorio verificado (homify, COACo, Mercado de Arte municipal), el email NO se usa.

## 2. Fuentes fiables (en orden)

1. **Web oficial del estudio/hotel/galería** — página de contacto. Única fuente 100%.
2. **homify.com.ar** — directorio de profesionales de diseño/interiorismo con emails.
3. **coacordoba.org (COACo)** — Colegio de Arquitectos de Córdoba, 500+ colegiados.
4. **mercadodearte.cordoba.gob.ar** — Mercado de Arte de la Municipalidad de Córdoba.
   Lista galerías reales con emails. **De aquí salieron 15 contactos verificados ya.**
5. **buscador5900.com.ar / guías locales** — solo para confirmar que la empresa existe.
6. **LinkedIn / Instagram oficiales** — para confirmar existencia, NO como fuente de emails.

## 3. Categorías objetivo (priorizadas)

1. **Galerías de arte** (mayor afinidad: es un artista plástico) — circuito Córdoba
   primero (Vía Margutta, Sasha D., Cerrito, Marchiaro, Rutera, Usina, Satélite, Xul,
   Brújula Invisible, CO ART, Lyv, Orfila, Subterráneo, Abre...), luego CABA.
2. **Hoteles boutique / alojamientos serranos** — Traslasierra, Punilla, Calamuchita
   (Cortaderas, Loma Bola, Mirador del Lago, El Jarillal...). Objetivo: arte en
   espacios comunes y habitaciones (serie chakras para el eje espiritual).
3. **Interioristas y estudios de interiorismo** — Córdoba capital + Barrio Güemes.
4. **Estudios de arquitectura** — vía COACo, filtrando por tipo de obra.
5. **Jurídico** (estudios que equipan sus oficinas) — lo más difícil de verificar,
   requiere llamada/visita. Postergar hasta consolidar 1-4.

## 4. Procedimiento de ampliación (cuando se quiera escalar)

### Opción A — Manual (fase $0, recomendado primero)
- Revisar fuentes 1-4 y completar `contactos_verificados.json`.
- Pedir el email por WhatsApp/Instagram cuando la web no lo publique (hoteles).

### Opción B — Apify automatizado (cuando haya token de Apify)
1. Instalar la skill oficial: `npx skills add apify/agent-skills@apify-actorization`
   (~9.2K instalaciones, org oficial; requiere API token en `APIFY_API_TOKEN`).
2. Definir alcance progresivo: Córdoba capital → interior de Córdoba → Argentina.
3. Usar actores de scraping de directorios (Google Maps / homify / COACo) con
   campos: `name, email, phone, website, category`.
4. Regla de validación post-scrape: **cada email debe existir en la web oficial o en
   un directorio verificado** antes de entrar a la lista de envío. Nada se envía
   directo del scrape.

## 5. Estado actual y próximos pasos

- [x] Auditoría de `prospects_crm.json` → 14 fabricados/por revisar marcados.
- [x] `data/contactos_verificados.json` con 25 contactos reales (2 eran correctos,
      1 corregido, 15 galerías del Mercado de Arte, hoteles serranos verificados).
- [ ] Correr `generate_campaign_drafts.py` SOLO contra `contactos_verificados.json`
      (NUNCA contra prospects_crm.json hasta limpiarlo).
- [ ] Solicitar emails faltantes a hoteles/estudios por WhatsApp/IG.
- [ ] Definir token de Apify para escalar (decisión del usuario).
