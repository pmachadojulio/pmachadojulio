#!/usr/bin/env python3
"""
harvest_emails.py
Toma los negocios del scrape completo con sitio web propio (no redes sociales),
visita la home y páginas de contacto típicas y extrae emails visibles
(mailto: o texto). Regla de oro del playbook: solo emails de sitios oficiales.

Salida: data/scrapes/emails_harvest_<fecha>.json
"""

import json
import os
import re
import ssl
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib import request as urlreq
from urllib.parse import urlparse

ROOT = os.path.join(os.path.dirname(__file__), "..")
SCRAPE_FILE = os.path.join(ROOT, "data/scrapes/scrape_completo_2026-08-05.json")
CRM_FILE = os.path.join(ROOT, "data/prospects_crm.json")
CAMP_FILE = os.path.join(ROOT, "marketing/campanas/campana_emails_2026-08-05.json")
FECHA = "2026-08-22"

EXCLUDE_DOMAINS = (
    "instagram.com", "facebook.com", "linktr.ee", "wa.me", "api.whatsapp.com",
    "bluepillow", "airbnb", "booking.com", "mercadolibre", "tiktok.com",
    "youtube.com", "google.com", "maps.app", "wixsite.com/blank", "linkedin.com",
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
BAD_EMAIL_PARTS = ("example.", "sentry", "@2x", ".png", ".jpg", ".webp", "godaddy")
CONTACT_PATHS = ["", "/contacto", "/contacto/", "/contact", "/contacto.html",
                 "/nosotros", "/about", "/info"]

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def norm(t):
    return unicodedata.normalize("NFD", str(t)).encode("ascii", "ignore").decode().lower()


def dominio_valido(url):
    if not url or not str(url).startswith("http"):
        return False
    host = urlparse(str(url)).netloc.lower()
    return bool(host) and not any(x in host for x in EXCLUDE_DOMAINS)


def fetch(url, timeout=8):
    req = urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh)"})
    with urlreq.urlopen(req, timeout=timeout, context=CTX) as r:
        return r.read(400_000).decode("utf-8", errors="ignore")


def emails_en(html):
    texto = html.replace("%20", "")
    encontrados = set()
    for m in EMAIL_RE.findall(texto):
        ml = m.lower().strip(".")
        if any(b in ml for b in BAD_EMAIL_PARTS):
            continue
        # descartar hashes de build / assets largos
        if len(ml.split("@")[0]) > 32:
            continue
        encontrados.add(ml)
    return encontrados


def buscar_email(web):
    base = str(web).rstrip("/")
    hallazgos = {}
    for path in CONTACT_PATHS:
        url = base + path
        try:
            html = fetch(url)
        except Exception:
            continue
        for e in emails_en(html):
            hallazgos.setdefault(e, url)
        if hallazgos:
            break
    return hallazgos


def main():
    scrape = json.load(open(SCRAPE_FILE))
    crm = json.load(open(CRM_FILE))["prospects"]
    camp = json.load(open(CAMP_FILE))

    nombres_ya = {norm(p.get("empresa", "")) for p in crm} | {
        norm(c["empresa"]) for c in camp}

    candidatos = []
    for i in scrape:
        cat = norm(i.get("categoria", ""))
        if not any(k in cat for k in ["hotel", "alojamiento", "galeria", "interiorismo", "arquitectura"]):
            continue
        if norm(i["nombre"]) in nombres_ya:
            continue
        web = i.get("web")
        if dominio_valido(web):
            candidatos.append({
                "nombre": i["nombre"], "categoria": i.get("categoria"),
                "ciudad": i.get("ciudad"), "telefono": i.get("telefono"),
                "web": web,
            })

    print(f"Candidatos con web propia: {len(candidatos)}")

    resultados = []
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(buscar_email, c["web"]): c for c in candidatos}
        for fut in as_completed(futs):
            c = futs[fut]
            try:
                mails = fut.result()
            except Exception:
                mails = {}
            if mails:
                c2 = dict(c)
                c2["emails"] = sorted(mails)
                resultados.append(c2)

    out = os.path.join(ROOT, f"data/scrapes/emails_harvest_{FECHA}.json")
    json.dump(resultados, open(out, "w"), ensure_ascii=False, indent=1)

    print(f"Negocios con email encontrado: {len(resultados)}")
    print(f"Guardado en: {out}")
    for r in resultados:
        print(f"- {r['nombre']} | {r['categoria']} | {r['ciudad']} | {', '.join(r['emails'])}")


if __name__ == "__main__":
    main()
