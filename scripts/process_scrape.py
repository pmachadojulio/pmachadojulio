#!/usr/bin/env python3
"""Normaliza los resultados crudos de compass/crawler-google-places a un formato prospecto.

Uso:
    python3 scripts/process_scrape.py scrape_a.json scrape_b.json ... [--out data/scrapes/scrape_completo.json]

Campos de entrada esperados: title, address, city, state, countryCode, phone,
website, totalScore, reviewsCount, searchString, categories, categoryName.
"""

import json
import re
import sys

CATEGORY_LABEL = {
    "interiorista": "Interiorismo",
    "arquitect": "Arquitectura",
    "hotel": "Hotel boutique",
    "galeria": "Galería de arte",
}


def norm_phone(raw):
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 13 and digits.startswith("549"):
        return f"+54 9 {digits[3:8]} {digits[8:]}"
    if len(digits) == 12 and digits.startswith("54"):
        return f"+54 {digits[2:6]} {digits[6:]}"
    return raw


def infer_category(item, search):
    s = (search or "").lower()
    for key, label in CATEGORY_LABEL.items():
        if key in s:
            return label
    cats = " ".join(item.get("categories") or [item.get("categoryName") or ""]).lower()
    for key, label in CATEGORY_LABEL.items():
        if key in cats:
            return label
    return "Otro"


def process(files):
    seen = {}
    for path in files:
        with open(path) as fh:
            items = json.load(fh)
        for it in items:
            title = (it.get("title") or "").strip()
            if not title or it.get("permanentlyClosed"):
                continue
            key = (title + "|" + (it.get("address") or "")).lower()
            seen.setdefault(key, {
                "nombre": title,
                "categoria": infer_category(it, it.get("searchString")),
                "busqueda": it.get("searchString"),
                "direccion": it.get("address"),
                "barrio": it.get("neighborhood"),
                "ciudad": it.get("city"),
                "provincia": it.get("state"),
                "pais": it.get("countryCode"),
                "telefono": norm_phone(it.get("phone")),
                "web": it.get("website"),
                "rating": it.get("totalScore"),
                "reviews": it.get("reviewsCount"),
                "permanently_closed": it.get("permanentlyClosed"),
                "estado": "REVISAR - falta email",
                "fuente": "compass/crawler-google-places (scrape 2026-08-05)",
            })
    return list(seen.values())


def main():
    argv = sys.argv[1:]
    out = None
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
    args = [a for a in argv if not a.startswith("--") and a != out]
    data = process(args)
    total = len(data)
    by_cat = {}
    for row in data:
        by_cat[row["categoria"]] = by_cat.get(row["categoria"], 0) + 1
    cordoba = sum(1 for r in data if r["provincia"] == "Córdoba")
    con_web = sum(1 for r in data if r["web"])
    con_tel = sum(1 for r in data if r["telefono"])
    print(f"Total: {total} | Córdoba (provincia): {cordoba} | con web: {con_web} | con tel: {con_tel}")
    for cat, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {n}")
    if out:
        with open(out, "w") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        print(f"Guardado en {out}")


if __name__ == "__main__":
    main()
