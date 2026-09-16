#!/usr/bin/env python3
"""Detecta el fin real del contenido en una tira larga (footer incluido)
y recorta la cola vacia/uniforme. Devuelve el nuevo alto."""
import sys
from PIL import Image

def real_bottom(png):
    im = Image.open(png).convert("RGB")
    w, h = im.size
    # analizar en filas reducidas (cada fila = 4px fisicos)
    step = 4
    small_h = h // step
    im_small = im.resize((80, small_h))
    px = im_small.load()
    # color dominante de las ultimas 20 filas (la "cola")
    tail_rows = []
    for yy in range(max(0, small_h - 20), small_h):
        avg = tuple(sum(px[x, yy][c] for x in range(80)) // 80 for c in range(3))
        tail_rows.append(avg)
    if not tail_rows:
        return h
    tail = tuple(sum(t[c] for t in tail_rows) // len(tail_rows) for c in range(3))
    # buscar desde abajo: ultima fila cuyo promedio difiere de la cola (>6 por canal)
    for yy in range(small_h - 1, -1, -1):
        avg = tuple(sum(px[x, yy][c] for x in range(80)) // 80 for c in range(3))
        if max(abs(avg[c] - tail[c]) for c in range(3)) > 6:
            return min(h, (yy + 2) * step)
    return h

if __name__ == "__main__":
    for png in sys.argv[1:]:
        b = real_bottom(png)
        im = Image.open(png)
        w, h = im.size
        print(f"{png}: {w}x{h} -> corte en {b}px (contenido real)")
        if b < h - 8:
            im.crop((0, 0, w, b)).save(png)
            print(f"  recortado -> {w}x{b}")
