# Deriva — Layout de "derivantes" y mapa de derivas

> Diseño de la sección de artistas del colectivo. Mantiene la estética dark
> monoespaciada del sitio (Space Mono + Cormorant), sin framework.

## 1. Mapa de derivas (`/deriva/derivantes/`)
Índice psicogeográfico. Cada derivante es un nodo con coordenadas.
- Grilla de nodos: `● Julio C. Machado — Córdoba (nodo fundador, marcado en dorado)`
- Hover/clic → perfil.
- Filtro por ciudad (Córdoba, Bs As, etc.) y por "ruta" (urbano / íntimo / objeto).

## 2. Perfil derivante (`/deriva/derivante/<slug>/`)
Estructura:
- Header: nombre + ciudad + foto.
- **Su dérive** (statement, 1-3 líneas): *"Transito X ciudad trabajando Y material desde Z obsesión."*
- Grilla de sus obras (mismas tarjetas que la colección).
- Badge "derivante desde <fecha>".

## 3. Colección unificada (`/deriva/#coleccion`)
Todas las obras (Julio + derivantes) taggeadas por `derivante_id`, filtrable.
- Julio SIEMPRE aparece primero (orden por `fundador desc, created_at`).
- Cada tarjeta muestra el nombre del derivante pequeño abajo.

## 4. Back-office (Supabase, no visible al público)
- `/admin-deriva` (o panel embebido en tu `/admin`): login de artista.
- Artista: da de alta/editar sus obras, ver sus consultas.
- Curador (vos): toggle "aprobado" → un build regenera el estático → deploy.

## 5. Integración al build
`build-deriva.js` ya lee `data/obras.json`. Extensión:
- Lee `data/derivantes.json` (sync desde Supabase).
- Lee `data/obras_derivantes.json` (sync desde Supabase, solo `aprobado=true`).
- Genera `/deriva/`, `/deriva/derivantes/`, `/deriva/derivante/<slug>/`.

## 6. Orden de priorización (regla de oro)
1. Julio (fundador) siempre primero en colección y destacado en manifiesto.
2. Derivantes en orden de ingreso aprobado.
3. Ningún mensaje/obra pública sin aprobación del curador.
