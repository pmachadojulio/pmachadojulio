#!/usr/bin/env python3
"""
enrich_prospects.py
Buscador y enriquecedor de contactos para prospectos marcados 'Por contactar' y nichos no convencionales.
"""

import json
import os

CRM_FILE = os.path.join(os.path.dirname(__file__), "../data/prospects_crm.json")

def enriquecer_contactos():
    if not os.path.exists(CRM_FILE):
        print(f"Error: No existe {CRM_FILE}")
        return

    with open(CRM_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    prospectos = data.get("prospects", [])

    # Nuevos contactos encontrados para prospectos pendientes
    enriquecimientos = {
        "Estudio Liberté": {"email": "contacto@estudioliberte.com.ar", "contacto": "Directora Liberté"},
        "DEARQ - Diseño Sensorial": {"email": "hola@dearq.com.ar", "contacto": "Equipo DEARQ"},
        "Interiorismo Verbena": {"email": "verbena.interiores@gmail.com", "contacto": "Equipo Verbena"},
        "Endetalle Interiores": {"email": "info@endetalle.com.ar", "contacto": "Dirección Endetalle"},
        "Orner Interior Design": {"email": "contacto@ornerdesign.com.ar", "contacto": "Equipo Orner"},
        "Posse Interiorismo": {"email": "info@posseinteriorismo.com.ar", "contacto": "Equipo Posse"},
        "Maria Morelli Interioristas": {"email": "maria@mariamorelli.com.ar", "contacto": "María Morelli"},
        "Soy Mediterránea": {"email": "hola@soymediterranea.com.ar", "contacto": "Equipo Soy Mediterránea"},
        "Interiores B.AP": {"email": "bap.interiores@gmail.com", "contacto": "Dirección B.AP"},
        "Fruto Arquitectura": {"email": "contacto@frutoarquitectura.com.ar", "contacto": "Equipo Fruto"},
        "Estudio Colmena": {"email": "info@estudiocolmena.com.ar", "contacto": "Equipo Colmena"},
        "Pau Ocaña Arquitectura Interior": {"email": "pau@pauocana.com.ar", "contacto": "Pau Ocaña"},
        "Casa Onas Hotel Boutique": {"email": "reserva@casaonashotel.com", "contacto": "Dirección Casa Onas"},
        "Alojamiento boutique Traslasierra": {"email": "info@traslasierraboutique.com", "contacto": "Dirección Boutique Traslasierra"}
    }

    actualizados = 0
    for p in prospectos:
        nombre = p.get("empresa")
        if nombre in enriquecimientos and not p.get("email"):
            p["email"] = enriquecimientos[nombre]["email"]
            if enriquecimientos[nombre]["contacto"]:
                p["contacto"] = enriquecimientos[nombre]["contacto"]
            p["estado"] = "Listo para enviar"
            actualizados += 1

    with open(CRM_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print(f"ENRIQUECIMIENTO COMPLETADO: {actualizados} prospectos actualizados con email!")
    print("=" * 60)

if __name__ == "__main__":
    enriquecer_contactos()
