#!/usr/bin/env python3
"""
generate_campaign_drafts.py
Genera borradores de email personalizados por categoría para cada prospecto
del CRM con email verificado. Salida: marketing/campanas/ (markdown para
revisar y json para importar).

Categorías y ángulos:
- Galería de arte   -> propuesta de colaboración / exhibición / consignación
- Hotel boutique    -> arte para espacios comunes y habitaciones (serie Ascenso)
- Interiorismo      -> serie Ascenso (chakras), óleos 30x30 + prints limitados
- Arquitectura      -> serie urbana (Monoblocks, A las margaritas)
"""

import json
import os
import unicodedata

ROOT = os.path.join(os.path.dirname(__file__), "..")
CRM_FILE = os.path.join(ROOT, "data/prospects_crm.json")
OUT_DIR = os.path.join(ROOT, "marketing/campanas")

STOPWORDS = {"direccion", "equipo", "direc", "estudio", "casa", "atelier"}
TITULOS = {"arq", "arg", "prof", "lic", "dir", "dr"}


def _normalizar(t):
    return unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower().strip()

BASE = "https://jcmachado.com"
OBRA = BASE + "/obra"
SERIE_ASCENSO = OBRA + "/ascenso-corazon/"
SERIE_URBANA = OBRA + "/monoblocks/"
WHATSAPP = "+54 9 353 401-8769"

SERIES_NOMBRE = {
    "Ascenso (chakras)": "https://jcmachado.com/obra/ascenso-corazon/",
    "Urbana (Monoblocks)": "https://jcmachado.com/obra/monoblocks/",
}


STOPWORDS = {"direccion", "equipo", "direc", "estudio", "casa", "atelier"}
TITULOS = {"arq", "arg", "prof", "lic", "dir", "dr"}


def firma():
    return f"""P.D.: Si conocés a alguien a quien le pueda interesar la obra, te agradezco que le reenvíes este correo.

Atentamente,

Julio César Machado
Pintor & Sociólogo | {BASE}
WhatsApp: {WHATSAPP}"""


def _normalizar(t):
    return unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower().strip()


def primer_nombre(contacto):
    """Extrae un primer nombre humano de un campo contacto, o None."""
    if not contacto:
        return None
    texto = contacto.split("/")[0]
    texto = texto.split("(")[0]
    tokens = texto.strip().split()
    tokens = [t for t in tokens if t.strip(".") and _normalizar(t.strip(".")) not in TITULOS]
    if not tokens:
        return None
    primera = tokens[0].strip(".")
    if _normalizar(primera) in STOPWORDS:
        return None
    return primera


def saludo(contacto, empresa, overrides=None):
    """Saludo personalizado: nombre humano > nombre de empresa > genérico."""
    if overrides and empresa in overrides:
        return f"Hola {overrides[empresa]},"

    nombre = primer_nombre(contacto)
    if nombre:
        return f"Hola {nombre},"

    if empresa:
        return f"Hola {empresa},"

    return "Estimados integrantes,"


def redactar(empresa, categoria, saludo_texto):
    cat = categoria or ""
    saludo_texto = saludo_texto.rstrip(",") + ","

    if "Galería" in cat:
        asunto = f"Obra original al óleo para sumar a su programación — Julio César Machado"
        cuerpo = f"""{saludo_texto}

Les escribo desde Córdoba con mucho respeto por el trabajo de {empresa} en el circuito.

Soy Julio César Machado, pintor al óleo y licenciado en sociología. Trabajo series conceptuales que exploran la identidad, la memoria y la densidad humana — retratos, serie urbana (Monoblocks, la memoria de los barrios obreros) y la serie Ascenso sobre los centros de energía (óleos sobre panel 30×30 con ediciones limitadas de 20 ejemplares certificadas con QR).

Considero que estas obras pueden dialogar con su programación y sumar a su roster de artistas. Pueden recorrer el portfolio completo en {OBRA}

Me encantaría acercarles un dossier impreso o coordinar una visita al taller para que conozcan las piezas en persona.

{firma()}"""

    elif "Hotel" in cat or "Alojamiento" in cat:
        asunto = f"Arte original para los espacios de {empresa} — serie Ascenso (chakras)"
        cuerpo = f"""{saludo_texto}

Les escribo tras conocer {empresa} y su propuesta de estadía en la sierra cordobesa.

Soy Julio César Machado, pintor al óleo. Mi serie Ascenso explora los centros de energía del cuerpo (óleos sobre panel 30×30 cm, ediciones limitadas de 20 ejemplares con certificado y QR), y también trabajo paisajes serranos y series urbanas — piezas que acompañan la atmósfera de descanso, naturaleza y reconexión que ofrecen.

Estas obras funcionan muy bien en habitaciones, halles y espacios comunes, tanto como originales únicos o como ediciones numeradas para equipar más de un ambiente.

Pueden ver la serie aquí: {SERIE_ASCENSO}

Quedo a disposición para enviarles un dossier digital o coordinar una visita para ver las piezas.

{firma()}"""

    elif "Interiorismo" in cat:
        asunto = f"Propuesta de arte contemporáneo al óleo para {empresa} — Serie Ascenso (Chakras)"
        cuerpo = f"""{saludo_texto}

Les escribo desde Córdoba tras conocer la propuesta estética de {empresa}.

Soy Julio César Machado, pintor al óleo y licenciado en sociología. Mi trabajo explora la densidad humana, la identidad y la memoria a través de series conceptuales.

Acabo de publicar la Serie "Ascenso" (Chakras): cuatro óleos originales sobre panel de 30×30 cm que exploran los centros de energía e introspección corporal, acompañados por réplicas numeradas en edición limitada de 20 ejemplares con certificado de autenticidad y QR.

Considero que la paleta y la carga conceptual de estas piezas encajan de manera orgánica con los proyectos de diseño e interiorismo de {empresa}.

Pueden ver la serie completa y las fichas de cada obra aquí: {SERIE_ASCENSO}

Me encantaría enviarles una presentación digital breve o coordinar una visita a mi taller.

{firma()}"""

    else:  # Arquitectura / general
        asunto = f"Óleos originales y serie urbana para los proyectos de {empresa}"
        cuerpo = f"""{saludo_texto}

Les escribo con mucho gusto tras apreciar el nivel arquitectónico y espacial de {empresa}.

Soy Julio César Machado, pintor al óleo y sociólogo. En mi cuerpo de obra me dedico a retratar la memoria de nuestras ciudades y la densidad del espacio habitado — la serie urbana "Monoblocks" es un ejemplo de ese trabajo.

Trabajo junto a estudios de arquitectura e interiorismo acercando óleos originales y series de prints de edición limitada certificados, pensados para vestir salas de reunión, halles de acceso y residencias de alta jerarquía.

Pueden recorrer las obras y fichas técnicas aquí: {SERIE_URBANA}

Quedo a disposición para enviarles un dossier digital o coordinar una breve llamada.

{firma()}"""

    return asunto, cuerpo


def main():
    with open(CRM_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    listos = [p for p in data.get("prospects", []) if p.get("email")]

    os.makedirs(OUT_DIR, exist_ok=True)
    md_path = os.path.join(OUT_DIR, "campana_emails_2026-08-05.md")
    json_path = os.path.join(OUT_DIR, "campana_emails_2026-08-05.json")

    drafts = []
    overrides = {}
    override_path = os.path.join(ROOT, "marketing/contactos_nombres.json")
    if os.path.exists(override_path):
        with open(override_path, "r", encoding="utf-8") as f:
            overrides = json.load(f)

    with open(md_path, "w", encoding="utf-8") as md:
        md.write("# Campaña de emails — contactos con email verificado\n\n")
        md.write(f"Fecha: 2026-08-05 | Destinatarios: {len(listos)}\n\n---\n\n")
        for i, p in enumerate(listos, 1):
            saludo_texto = saludo(p.get("contacto"), p.get("empresa", ""), overrides)
            asunto, cuerpo = redactar(p.get("empresa", ""), p.get("categoria", ""), saludo_texto)
            drafts.append({
                "id": p.get("id"),
                "empresa": p.get("empresa"),
                "categoria": p.get("categoria"),
                "email": p.get("email"),
                "ciudad": p.get("ciudad"),
                "asunto": asunto,
                "cuerpo": cuerpo,
            })
            md.write(f"## [{i}] {p.get('empresa')} <{p.get('email')}>\n")
            md.write(f"**Categoría:** {p.get('categoria')} | **Ciudad:** {p.get('ciudad')}\n\n")
            md.write(f"**ASUNTO:** {asunto}\n\n```\n{cuerpo}\n```\n\n---\n\n")

    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(drafts, jf, ensure_ascii=False, indent=2)

    from collections import Counter
    print(f"Borradores generados: {len(drafts)}")
    print(f"Guardados en: {md_path} y {json_path}")
    for cat, n in Counter(d["categoria"] for d in drafts).most_common():
        print(f"  {cat}: {n}")


if __name__ == "__main__":
    main()
