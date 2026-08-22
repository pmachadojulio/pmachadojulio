#!/usr/bin/env python3
"""
generate_campaign_drafts_tanda2.py
Tanda 2: usa los emails cosechados de sitios oficiales
(data/scrapes/emails_harvest_2026-08-22.json) + Museo Palacio Ferreyra,
filtra ruido y genera borradores personalizados reutilizando la redacción
de generate_campaign_drafts.py.

Salida: marketing/campanas/campana_emails_tanda2_2026-08-22.{md,json}
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_campaign_drafts import saludo, redactar  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
HARVEST = os.path.join(ROOT, "data/scrapes/emails_harvest_2026-08-22.json")
CAMP1 = os.path.join(ROOT, "marketing/campanas/campana_emails_2026-08-05.json")
CRM_FILE = os.path.join(ROOT, "data/prospects_crm.json")
OUT_MD = os.path.join(ROOT, "marketing/campanas/campana_emails_tanda2_2026-08-22.md")
OUT_JSON = os.path.join(ROOT, "marketing/campanas/campana_emails_tanda2_2026-08-22.json")

# Ruido a excluir: universidades, shoppings, placeholders, cadenas
EXCLUIR_NOMBRE = [
    "universidad", "usal", "uba", "utn", "uai", "kennedy", "belgrano",
    "facultad", "escuela argentina", "capbauno", "galerias pacifico",
    "secretaria de extension", "hipertehuelche", "cordobaestevez",
]
EMAILS_PLACEHOLDER = {"tuemail@email.com", "usuario@email.com.ar"}
MAX_EMAILS_POR_EMPRESA = 4


def norm(t):
    import unicodedata
    return unicodedata.normalize("NFD", str(t)).encode("ascii", "ignore").decode().lower()


def elegir_email(emails):
    """Prefiere email del dominio propio sobre gmail/hotmail/yahoo."""
    propios = [e for e in emails if not any(
        d in e for d in ("gmail.", "hotmail.", "yahoo.", "outlook.", "live."))]
    pool = propios if propios else emails
    return sorted(pool)[:MAX_EMAILS_POR_EMPRESA]


def main():
    harvest = json.load(open(HARVEST))
    ya_enviados = {c["email"].lower() for c in json.load(open(CAMP1))}
    crm_mails = {(p.get("email") or "").lower() for p in json.load(open(CRM_FILE))["prospects"]}

    drafts = []
    vistos_nombre = set()
    for h in harvest:
        nombre_n = norm(h["nombre"])
        if any(x in nombre_n for x in EXCLUIR_NOMBRE):
            continue
        if nombre_n in vistos_nombre:
            continue
        mails = [m.lower() for m in h["emails"] if m not in EMAILS_PLACEHOLDER]
        mails = [m for m in mails if m not in ya_enviados and m not in crm_mails]
        if not mails:
            continue
        vistos_nombre.add(nombre_n)
        for email in elegir_email(mails):
            drafts.append({
                "empresa": h["nombre"],
                "categoria": h.get("categoria") or "",
                "email": email,
                "ciudad": h.get("ciudad") or "",
                "web": h.get("web"),
            })

    # Nuevo contacto fuera del harvest: museo provincial
    drafts.append({
        "empresa": "Museo Superior de Bellas Artes Evita - Palacio Ferreyra",
        "categoria": "Galería de arte",
        "email": "educacionmuseopalacioferreyra@gmail.com",
        "ciudad": "Córdoba",
        "web": None,
    })

    # Ordenar por categoría (galerías primero)
    orden = {"Galería de arte": 0, "Galería / espacio creativo": 0,
             "Hotel boutique": 1, "Alojamiento boutique (adults only)": 1,
             "Interiorismo": 2, "Arquitectura / Interiorismo": 3, "Arquitectura": 4}
    drafts.sort(key=lambda d: orden.get(d["categoria"], 9))

    overrides = {}
    opath = os.path.join(ROOT, "marketing/contactos_nombres.json")
    if os.path.exists(opath):
        overrides = json.load(open(opath))

    filas = []
    for d in drafts:
        s, c = redactar(d["empresa"], d["categoria"], saludo(None, d["empresa"], overrides))
        filas.append({**d, "asunto": s, "cuerpo": c})

    with open(OUT_JSON, "w", encoding="utf-8") as jf:
        json.dump(filas, jf, ensure_ascii=False, indent=2)

    with open(OUT_MD, "w", encoding="utf-8") as md:
        md.write("# Tanda 2 de emails — nuevos contactos verificados (sitios oficiales)\n\n")
        md.write("Fecha: 2026-08-22 | Destinatarios: %d\n\n" % len(drafts))
        md.write("> Ritmo sugerido: máximo ~20 envíos/día. Prioridad: Galerías -> Hoteles -> Arquitectura.\n\n---\n\n")
        for i, d in enumerate(drafts, 1):
            s, c = redactar(d["empresa"], d["categoria"], saludo(None, d["empresa"], overrides))
            md.write(f"## [{i}] {d['empresa']} <{d['email']}>\n")
            md.write(f"**Categoría:** {d['categoria']} | **Ciudad:** {d['ciudad']}\n\n")
            md.write(f"**ASUNTO:** {s}\n\n```\n{c}\n```\n\n---\n\n")

    from collections import Counter
    print(f"Tanda 2 generada: {len(drafts)} borradores")
    print(f"Guardados en: {OUT_MD} y {OUT_JSON}")
    for cat, n in Counter(d["categoria"] for d in drafts).most_common():
        print(f"  {cat}: {n}")


if __name__ == "__main__":
    main()
