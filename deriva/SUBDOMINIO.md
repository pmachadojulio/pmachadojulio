# Deriva — Subdominio `deriva.jcmachado.com`

> Estado: la web principal (`jcmachado.com`) se deploya a **GitHub Pages** (el
> `deploy.yml` lo confirma, NO Cloudflare Pages pese a lo que decía AGENTS.md).
> Cloudflare solo es el proxy DNS del dominio.

## Opción A — RECMENDADA: repo GitHub Pages separado para Deriva
No rompe `jcmachado.com` (que sigue en su repo actual) y da URL limpia.

1. Crear repo `deriva-galeria` (público) en GitHub.
2. En ese repo: solo la carpeta `deriva/` + `build-deriva.js` + `data/`.
3. Settings → Pages → Source: `main` / root. Custom domain: `deriva.jcmachado.com`.
   GitHub crea el `CNAME` solo.
4. Cloudflare DNS: agregar registro **CNAME** `deriva` → `<tu-usuario>.github.io`
   (proxy apagado "DNS only" o prendido, da igual).
5. Esperar propagación (~15 min - 24h). Listo: `https://deriva.jcmachado.com`.

Ventaja: Deriva vive sola, con su propio deploy, sin tocar tu web.

## Opción B — Subdominio apuntando al mismo repo (más frágil)
GitHub Pages acepta UN solo custom domain por repo. Si querés `deriva.jcmachado.com`
apuntando a la carpeta `/deriva/` del repo actual, el CNAME del repo quedaría en
`deriva.jcmachado.com` y `jcmachado.com` dejaría de servir la web principal.
→ Por eso la Opción A es la correcta.

## Lo que YA está hecho (no requiere cuenta)
- `build-deriva.js` integrado al `deploy.yml` (se regenera solo).
- `deriva/index.html` ya deployado en `jcmachado.com/deriva/`.
- `deriva/supabase_schema.sql` + `LAYOUT_DERIVANTES.md` listos para artistas.

## Pendiente que requiere TU cuenta (Cloudflare + GitHub)
- [ ] Crear repo `deriva-galeria` (o darme acceso).
- [ ] Settings → Pages → custom domain `deriva.jcmachado.com`.
- [ ] Cloudflare: CNAME `deriva` → `<user>.github.io`.
- [ ] (Opcional) configurar redirect de `jcmachado.com/deriva` → `deriva.jcmachado.com`.

## Si querés que lo haga YO
Dame:
- Un **GitHub Personal Access Token** con permiso `repo` (para crear el repo y pushear).
- Un **Cloudflare API Token** con permiso de editar DNS de `jcmachado.com`.
Nunca los pidas por el chat en claro; escribilos en `~/secrets_deriva.env` (chmod 600)
y los leo de disco. Después los rotás.
