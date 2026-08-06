#!/usr/bin/env python3
"""Consolida el CRM: contactos verificados + prospectos scrapeados de Córdoba.

Salida: data/prospects_crm.json (un único fuente de verdad para el panel admin).

Precedencia de fuentes (la primera que tiene datos gana):
1. data/contactos_verificados.json          -> con email, manualmente verificados
2. data/scrapes/prospects_cordoba_*.json    -> scrape Google Maps (tel/web, email si existe)

Dedupe por: dominio de la web, y luego por nombre normalizado.
"""

import glob
import json
import re
import unicodedata

ROOT = "data"


def norm(s):
    s = (s or "").lower()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def domain(u):
    if not u:
        return None
    m = re.match(r"(?:https?://)?(?:www\.)?([^/]+)", u or "")
    return (m.group(1).lower() if m else u.lower()).replace("www.", "")


def load(path, label):
    with open(path) as fh:
        data = json.load(fh)
    return data.get(label) if isinstance(data, dict) else data


def main():
    verified = load(f"{ROOT}/contactos_verificados.json", "contactos")
    scrapes = []
    for p in sorted(glob.glob(f"{ROOT}/scrapes/prospects_cordoba_*.json")):
        scrapes += load(p, None)

    by_key = {}

    def put(row):
        dom = domain(row.get("web") or row.get("web_ig"))
        key = None
        if dom:
            key = f"web|{dom}"
        else:
            key = f"nom|{norm(row.get('empresa'))}"
        if key not in by_key:
            by_key[key] = row
        else:
            prev = by_key[key]
            for f in ("email", "telefono", "web", "contacto", "notas"):
                if not prev.get(f) and row.get(f):
                    prev[f] = row[f]
            if not prev.get("fuente"):
                prev["fuente"] = row.get("fuente")
        return key

    # 1) Verificados
    for i, v in enumerate(verified):
        put({
            "id": f"V-{i+1:04d}",
            "empresa": v.get("empresa") or v.get("nombre"),
            "categoria": v.get("categoria"),
            "contacto": v.get("contacto"),
            "email": v.get("email"),
            "telefono": v.get("telefono"),
            "web": v.get("web_ig"),
            "ciudad": v.get("ciudad"),
            "estado": v.get("estado") or "Verificado",
            "notas": v.get("notas"),
            "fuente": v.get("fuente") or "verificado manual",
        })

    # 2) Scrapeados (no pisan los verificados)
    for i, r in enumerate(scrapes):
        estado = r.get("estado")
        if r.get("email"):
            estado = "Listo para enviar"
        elif estado == "REVISAR - falta email":
            estado = "Por contactar (WhatsApp)"
        put({
            "id": f"S-{i+1:04d}",
            "empresa": r.get("nombre"),
            "categoria": r.get("categoria"),
            "contacto": "",
            "email": r.get("email"),
            "telefono": r.get("telefono"),
            "web": r.get("web"),
            "ciudad": r.get("ciudad") or r.get("barrio"),
            "estado": estado,
            "notas": r.get("notas", ""),
            "fuente": r.get("fuente"),
        })

    prospects = sorted(by_key.values(), key=lambda p: (
        0 if p.get("email") else 1,
        norm(p.get("categoria") or ""),
        norm(p.get("empresa") or ""),
    ))

    out = {"fecha_actualizacion": "2026-08-05", "prospects": prospects}
    with open(f"{ROOT}/prospects_crm.json", "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    from collections import Counter
    print(f"Total: {len(prospects)} | con email: {sum(1 for p in prospects if p.get('email'))} "
          f"| con tel: {sum(1 for p in prospects if p.get('telefono'))} | con web: {sum(1 for p in prospects if p.get('web'))}")
    for cat, n in Counter(p["categoria"] or "Sin categoría" for p in prospects).most_common():
        e = sum(1 for p in prospects if p["categoria"] == cat and p.get("email"))
        print(f"  {cat}: {n} ({e} con email)")


if __name__ == "__main__":
    main()
