# WhatsApp — WAHA + n8n (envío masivo a contactos del CRM)

Stack 100% local, sin costo: [WAHA Core](https://waha.devlike.pro) (WhatsApp HTTP API, imagen
`devlikeapro/waha:arm` para Apple Silicon) + [n8n](https://n8n.io) para automatizar el envío.

## 1. Requisitos

- Docker Desktop instalado y corriendo.
- Un número de WhatsApp dedicado (ideal: chip secundario o número de la obra). **No uses tu número
  personal de WhatsApp con los contactos** para no quemar tu cuenta.

## 2. Levantar el stack

```bash
cd whatsapp
cp waha/.env.example waha/.env          # crea credenciales locales
docker compose up -d
```

- **WAHA** → http://localhost:3000/dashboard  (usuario `admin` / clave `admin`)
- **n8n** → http://localhost:5678 (en la primera visita creás tu usuario/clave de n8n)

> ¿Mac con Intel o Linux? Cambiá en `docker-compose.yml` la línea `image: devlikeapro/waha:arm`
> por `image: devlikeapro/waha`.

## 3. Conectar WhatsApp (QR)

1. En el dashboard de WAHA entrá a **Sessions**.
2. **Start new session**, nombre de sesión: `default` (debe coincidir con `session` del workflow).
3. Abrí el QR y escanealo desde **WhatsApp → Dispositivos vinculados** del chip dedicado.
4. Cuando la sesión quede en **WORKING**, WAHA puede enviar y recibir mensajes.

Prueba rápida de la API:

```bash
curl -s http://localhost:3000/api/sendText \
  -H "X-Api-Key: waha-dev-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"session":"default","chatId":"54TU-NUMERO@c.us","text":"Prueba desde WAHA"}'
```

Reemplazá `54TU-NUMERO` por tu número de prueba en formato internacional sin `+` (ej. `5493534018769`).

## 4. Importar el workflow en n8n

1. En n8n: **Workflows → Add workflow → ⋯ → Import from File** y elegí
   `whatsapp/n8n-workflow-whatsapp.json`.
2. Abrí el nodo **"Enviar lote por WhatsApp"** y ajustá el bloque `config` al inicio del código:
   - `apiKey`: tu `WAHA_API_KEY` (si dejaste el `.env.example`, es `waha-dev-key-2026`).
   - `maxEnviar`: empezá con **10**.
   - `dataUrl`: el JSON del CRM ya publicado (`https://pmachadojulio.pages.dev/data/prospects_crm.json`).
3. Guardá y corré el workflow con **Test workflow** (o ejecutalo y confirmá que quede activo).

El nodo de código: baja el CRM, normaliza los teléfonos a formato WhatsApp (`54` + código de área
sin `0`, sin `9`), saluda con el nombre del contacto cuando existe (ej. "Hola Alexandro,") o con el
nombre de la empresa, y envía cada mensaje con una pausa de 30 s.

## 5. Anti-ban: reglas mínimas para no quemar la cuenta

- **Máximo 20–30 mensajes nuevos por día** a contactos que NO te escribieron primero.
- Pausa de **25–30 s mínimo** entre mensajes (el workflow ya usa 30 s).
- No envíes a números de fijo ni números inválidos: el workflow los descarta.
- No reenvíes la campaña al mismo número: WhatsApp no tiene lista de "no molestar"; sé conservador.
- Primera tanda: **10 mensajes/día durante una semana**, después subís a 20.

## 6. Seguridad

- Los contenedores escuchan solo en `127.0.0.1` (no están expuestos a internet). No abras los
  puertos 3000/5678 al exterior sin HTTPS.
- `.env` tiene la API key local; no lo subas al repo público (`.env` está en `.gitignore`).
