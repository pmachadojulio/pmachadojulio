# Newsletter — Workflow de generación y envío

Sistema para producir el newsletter de Julio Machado (arte + filosofía/sociología/psicoanálisis)
y enviarlo a los suscriptores, con una instancia de revisión humana antes de salir.

## Flujo completo

```
1. META-PROMPT (meta-prompt.md)     → combinaciones autor × temática
2. Elegir 1 combinación             (vos elegís; o pedile un calendario de 8)
3. PROMPT (prompt.md)               → borrador del newsletter (250-400 palabras)
4. Revisión humana                  → admin → Borradores Gmail, ajustá y aprobá
5. Envío a suscriptores             → lista en D1 (ver abajo)
6. Publicar en web/blog + IG/TikTok → reciclar el mismo contenido
```

Frecuencia sugerida: **1 por semana** (o quincenal si cuesta mantener el ritmo). La constancia
importa más que la perfección.

## Envío a los suscriptores

Los suscriptores están en Cloudflare D1 (`/api/suscriptores`). Formas de enviar según el tamaño:

| Etapa | Cantidad | Cómo enviar |
|---|---|---|
| Hoy | < 50 | Manual: Gmail → Borradores (ya tenés `admin/borradores_gmail.html`) o mail individual con CCO |
| Crecimiento | 50-1000 | ESP gratuito: **Brevo** (antes Sendinblue, 300/día gratis), **Buttondown** (hasta 100 suscriptores gratis), **MailerLite** (hasta 1000 gratis) |
| Escala | +1000 | Migrar a ESP pago y enviar desde un endpoint `/api/newsletter/send` |

**Recomendación hoy:** cuando la lista supere ~10 suscriptores, abrí una cuenta en **Buttondown**
o **Brevo**, exportá los emails de D1 y cargalos. Es lo que te deja automatizar el envío con
plantilla y enlace "baja". Antes de eso, manual con CCO está bien.

**Exportar suscriptores de D1** (desde el dashboard de Cloudflare → D1 → `jcm-subscribers` → Console):

```sql
SELECT email, fecha, origen FROM suscriptores;
```

## Cómo conseguir suscriptores

- Formulario ya está en la home (`index.html` → `/api/suscriptores`). Sumalo también en el pie de
  cada obra y en el bio de Instagram/TikTok.
- Al final de cada newsletter: "¿Te gustó? Reenviáselo a alguien".
- Ofrecé un imán de suscripción gratis: e-book o guía corta "Cómo mirar un cuadro" (lo podés
  armar con los mismos autores del sistema de prompts).
- Cada newsletter publicado → publicación IG/TikTok → link en bio.

## Calendario y gestión

- Guardá cada newsletter publicado en `newsletter/enviados/` (asunto + fecha + combinación usada)
  para no repetir autor/temática seguido.
- Elegí día fijo de la semana (ej. jueves a la mañana) y horario de envío estable.

## Automatización futura (opcional)

Para generar el texto sin copiar/pegar, se puede agregar una pestaña "Newsletter" al `/admin` que
llame a una API de IA (necesita una clave; ej. Anthropic/OpenAI) con estos prompts embebidos, y un
botón "Enviar" que use el ESP elegido. No requiere nada de esto para arrancar hoy.
