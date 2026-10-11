# Pinterest API — handoff para Hermes (agente)

Fuente de verdad operativa. NO contiene secretos: las credenciales viven solo en
`marketing/pinterest/pinterest_tokens.json` (privado, excluido de git y rsync).
Si corrés en este mismo Mac con acceso al repo, leé ese archivo. Si no, pedíselo a Julio.

## Estado (verificado 2026-10-06)
- App Pinterest: `JCMachado`, client_id `1604060` (el App ID sale en la URL OAuth, no es secreto).
- Token de usuario vigente (cuenta business `pmachadojulio`), scopes:
  `boards:read boards:write pins:read pins:write user_accounts:read`.
- 33 pins publicados (24 Retratos y Obra + 7 Ascenso + 2 Paisajes). Verificados en API.

## Cómo publicar (sin duplicar)
Script: `scripts/pinterest_publicar.js` (usa `SSL_CERT_FILE=$(python3 -c "import certifi; print(certifi.where())")`).
- `node scripts/pinterest_publicar.js publish --dry` — qué falta.
- `node scripts/pinterest_publicar.js publish [--max N]` — publica pendientes.
- `node scripts/pinterest_publicar.js record PIN_ID "Titulo exacto del CSV"` — registra un pin creado a mano.

## PROTOCOLO DE SINCRONÍA (obligatorio si publicás vos)
1. Fuente: `marketing/pinterest/pines_bulk.csv` (columnas: Title, Media URL, Pinterest board, Description, Link, Keywords).
2. Anti-duplicados: `marketing/pinterest/pinterest_log.json` — el script salta todo `csv_title` con `ok:true`. Si creás un pin fuera del script, registralo con `record` o se duplicará.
3. Boards (nombres EXACTOS, con em-dash): `Retratos y Obra — Julio Machado`, `Ascenso — Serie`, `Paisajes — Julio Machado`. Si el board no existe, el script aborta ese pin (hay que crearlo a mano en Pinterest primero).
4. Imágenes: `https://jcmachado.com/imagenes/ml/*.jpg` — deben estar deployadas (commit+push) ANTES de publicar el pin, si no Pinterest no las levanta.
5. Links llevan UTM `?utm_source=pinterest&utm_medium=pin&utm_campaign=obras`.

## TikTok API
No existe ninguna configurada en este proyecto (solo estrategia de contenido en `marketing/plan.md`). No hay nada para compartir todavía. Si necesitás publicar en TikTok, hoy es manual (Julio) o hay que crear app en TikTok Developers (requiere aprobación).

## Trello API (2026-10-06, verificada)
- Credenciales en `marketing/trello/trello_tokens.json` (privado, fuera de git): `key` + `token` (expiration=never) de la app `Hermes-JCMachado`, autorizados por Julio.
- Tablero objetivo: La Fábrica Insaciable — `board_id: 6a8453d1a3e4f702e03e230d`.
- Verificado: el token lista los 10 tableros. No crear/mover nada sin orden expresa de Julio.
