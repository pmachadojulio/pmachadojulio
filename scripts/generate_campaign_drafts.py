#!/usr/bin/env python3
"""
generate_campaign_drafts.py
Genera una lista completa de correos electrónicos personalizados para cada prospecto
del CRM de Julio César Machado, optimizados para enviar en frío o desde borrador de Gmail.
"""

import json
import os

CRM_FILE = os.path.join(os.path.dirname(__file__), "../data/prospects_crm.json")

def redactar_mail(prospecto):
    empresa = prospecto.get("empresa", "")
    contacto = prospecto.get("contacto", "")
    categoria = prospecto.get("categoria", "")
    email = prospecto.get("email", "")
    notas = prospecto.get("notas", "")
    obra_link = prospecto.get("obra_recomendada", "jcmachado.com")

    # Saludo personalizado
    if contacto:
        saludo = f"Estimado/a {contacto},"
    else:
        saludo = f"Estimados integrantes de {empresa},"

    # Enfoque por segmento
    if "Interiorismo" in categoria or "Chakras" in notas or "chakras" in obra_link:
        asunto = f"Propuesta de arte contemporáneo al óleo para {empresa} — Serie Ascenso (Chakras)"
        cuerpo = f"""{saludo}

Les escribo desde Córdoba tras conocer la propuesta estética de {empresa}.

Soy Julio César Machado, pintor al óleo y licenciado en sociología. Mi trabajo explora la densidad humana, la identidad y la memoria a través de series conceptuales.

Acabo de publicar en mi tienda la Serie "Ascenso" (Chakras) — cuatro óleos originales sobre panel de 30×30 cm que exploran los centros de energía e introspección corporal, acompañados por réplicas numeradas en edición limitada de 20 ejemplares con certificado de autenticidad y QR.

Considero que la paleta y la carga conceptual de estas piezas encajan de manera orgánica con los proyectos de diseño e interiorismo de {empresa}.

Pueden ver la serie completa y las fichas de cada obra aquí: https://{obra_link}

Me encantaría enviarles una presentación digital breve o coordinar una visita a mi taller.

Atentamente,

Julio César Machado
Pintor & Sociólogo | jcmachado.com
WhatsApp: +54 9 353 401-8769
"""

    elif "Jurídico" in categoria or "Escribanía" in categoria:
        asunto = f"Retratos de autor y obras al óleo para las oficinas de {empresa}"
        cuerpo = f"""{saludo}

Me dirijo a ustedes tras revisar la trayectoria institucional de {empresa}.

Soy Julio César Machado, pintor al óleo y licenciado en sociología. En mi trabajo al óleo retrato la densidad humana, la memoria y la jerarquía institucional que trasciende una simple fotografía.

Me especializo en retratos al óleo por encargo (máximo 2 por mes) para homenajes a socios fundadores, como así también en obras de gran formato para salas de directorio y reuniones. Cada pieza cuenta con certificado de autenticidad firmado y validación mediante código QR.

Les invito a conocer mi portfolio en: https://jcmachado.com

Si les resulta de interés, me complacería acercarles un catálogo de obras disponibles o conversar sobre un encargo institucional.

Saludos cordiales,

Julio César Machado
Pintor & Sociólogo | jcmachado.com
WhatsApp: +54 9 353 401-8769
"""

    else: # Arquitectura premium / general
        asunto = f"Óleos originales y serie urbana para los proyectos de {empresa}"
        cuerpo = f"""{saludo}

Les escribo con mucho gusto tras apreciar el nivel arquitectónico y espacial de {empresa}.

Soy Julio César Machado, pintor al óleo y sociólogo. En mi cuerpo de obra me dedico a retratar la memoria de nuestras ciudades y la densidad del espacio habitado.

Trabajo junto a estudios de arquitectura e interiorismo acercando óleos originales y series de prints de edición limitada certificados, pensados para vestir salas de reunión, halles de acceso y residencias de alta jerarquía.

Pueden recorrer las obras y fichas técnicas aquí: https://{obra_link}

Quedo a disposición para enviarles un dossier digital o coordinar una breve llamada.

Un cordial saludo,

Julio César Machado
Pintor & Sociólogo | jcmachado.com
WhatsApp: +54 9 353 401-8769
"""

    return {
        "id": prospecto.get("id"),
        "empresa": empresa,
        "email": email,
        "asunto": asunto,
        "cuerpo": cuerpo
    }

def main():
    if not os.path.exists(CRM_FILE):
        print(f"Error: no se encontró {CRM_FILE}")
        return

    with open(CRM_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    prospectos = data.get("prospects", [])
    listos = [p for p in prospectos if p.get("email")]

    print("=" * 70)
    print(f"JULIO CÉSAR MACHADO — CAMPAÑA DE EMAILS LISTOS PARA ENVIAR ({len(listos)} LEADS)")
    print("=" * 70)

    for i, p in enumerate(listos, 1):
        draft = redactar_mail(p)
        print(f"\n[{i}] PARA: {draft['empresa']} <{draft['email']}>")
        print(f"    ASUNTO: {draft['asunto']}")
        print("-" * 50)
        print(draft['cuerpo'])
        print("=" * 70)

if __name__ == "__main__":
    main()
