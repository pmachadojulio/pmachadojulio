# Plan de marketing en Reddit — Julio Machado

Objetivo: tráfico cualificado a jcmachado.com, ventas de óleos/prints y construcción de audiencia para la serie Ascenso. Pre-lanzamiento: prioridad es audiencia + primeras ventas B2C.

## 1. Subreddits objetivo

### Venta directa (permite autopromoción con reglas)
| Subreddit | Qué postear |
|---|---|
| r/ArtSales | Óleos originales y prints con precio. Leer reglas de formato semanal |
| r/artstore | Prints A3 ($100k ARS) y series |
| r/hungryartists | Retratos por encargo (los retratos tipo Taylor/Cazzu son perfectos) |
| r/ArtistLounge | Solo comunidad/proceso, nada de venta |

### Comunidad artística (karma + credibilidad)
- r/oilpainting — WIPs y obra terminada de los Monoblocks
- r/painting — obra final con historia del proceso
- r/sketchbooks — páginas de sketchbook
- r/ArtCrit — pedir crítica genuina (genera conversación)

### Local (audiencia argentina)
- r/argentina — hilos culturales, "muestren su arte" ocasionales
- r/buenosaires, r/Cordoba — arte local, eventos

## 2. Estrategia en fases

**Fase 0 (semanas 1–2): karma sin vender.**
Solo comentar y responder en r/oilpainting y r/painting. Meta: 300+ karma por cuenta. Cuenta: u/Jcmachadoart con perfil que linkee a jcmachado.com.

**Fase 1 (semana 3+): proceso creativo.**
Postear en r/oilpainting los videos de proceso (YouTube) como "OC". Formato ganador: foto final + "here's my process" + video. El canal de YT ya tiene el material.

**Fase 2: venta blanda.**
r/ArtSales y r/artstore con prints primero (precio accesible, envío internacional posible). Originals solo si preguntan.

**Fase 3: retratos por encargo.**
r/hungryartists con 2–3 ejemplos (retratos de famosos ya hechos).

## 3. Reglas para no ser baneado

- Regla 10:1: por cada post propio, ~10 comentarios/comunidad.
- Cada sub tiene reglas propias: leerlas antes del primer post.
- Siempre marcar [OC] / declarar que sos el artista.
- Nunca repetir el mismo texto en varios subs.
- No mandar DMs masivos → shadowban seguro.

## 4. Automatización con n8n (sin automatizar posts)

Automatizar la escucha y el registro; los posts siempre manuales:

1. **Monitor de menciones**: nodo Reddit/HTTP cada 6h buscando "jcmachado", links a jcmachado.com → alerta a Telegram o email.
2. **Radar de oportunidades**: búsqueda de keywords (`[oc] oil painting`, `looking for artist portrait`, `buy original painting`) en subs objetivo → digest diario con links listos para responder.
3. **CRM**: cuando un comentario genera interés, webhook → append en `data/prospects_crm.json` con categoría `reddit_b2c`.
4. **Métricas semanales**: upvotes/clicks (UTM `?utm_source=reddit`) → hoja de seguimiento.

## 5. Tracking

Todos los links compartidos llevan UTM: `https://jcmachado.com/obra/ascenso-corazon/?utm_source=reddit&utm_medium=post&utm_campaign=ascenso`.

## Estado

- [ ] Crear cuenta u/Jcmachadoart y completar perfil
- [ ] Fase 0: 2 semanas de solo comentarios
- [ ] Definir workflow n8n (monitor menciones + radar keywords)
