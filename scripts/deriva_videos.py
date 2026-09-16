#!/usr/bin/env python3
"""
Genera 2 videos cortos (9:16, ~50s) para el feed de Deriva / jcmachado.
- Usa las obras REALES de Julio como base visual.
- Motion: ken-burns lento (zoom + pan) + crossfade entre obras.
- Audio: ambiente generado con sintetizador del sistema (sin red).
- SIN voz ni texto quemado -> listo para voice-over del usuario.

Requiere ffmpeg en PATH.
"""
import os, subprocess, math, wave, struct, random

ROOT = "/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
IMG = os.path.join(ROOT, "imagenes")
OUT = os.path.join(ROOT, "deriva", "videos")
os.makedirs(OUT, exist_ok=True)
FF = "/Users/juliocesarmachado/.local/bin/ffmpeg"
W, H = 1080, 1920  # 9:16

# Obras por video (rutas reales)
V1 = [  # Video 1: web propia + redes (obras icónicas)
    ("Raiz.webp", "Ascenso: Raíz"),
    ("Monoblocks.webp", "Monoblocks"),
    ("Margaritas.webp", "A las margaritas 1"),
]
V2 = [  # Video 2: Deriva convocatoria (los 7 chakras + apertura)
    ("Raiz.webp", "Ascenso: Raíz"),
    ("Sacro.webp", "Ascenso: Sacro"),
    ("corona.jpg", "Ascenso: Corona"),
    ("Monoblocks.webp", "Monoblocks"),
]

DUR_PER = 7.0      # segundos por obra (con crossfade)
FADE = 1.2         # crossfade
FPS = 30

def find_img(name):
    # probar con/sin extensiones
    base = os.path.join(IMG, name)
    if os.path.exists(base): return base
    for ext in [".webp", ".jpg", ".jpeg", ".png", ".JPG"]:
        if os.path.exists(base + ext): return base + ext
    # busqueda parcial
    for f in os.listdir(IMG):
        if name.lower().split(".")[0] in f.lower():
            return os.path.join(IMG, f)
    raise FileNotFoundError(name)

def make_tone_wav(path, dur=50.0, freqs=(110, 165, 220)):
    """Ambiente: suma de senoides suaves + leve vibrato, envolvente lenta."""
    sr = 44100
    n = int(sr * dur)
    data = bytearray()
    # envolvente global
    for i in range(n):
        t = i / sr
        env = 0.18 * (0.5 + 0.5*math.sin(2*math.pi*0.05*t))  # respiración lenta
        s = 0.0
        for k, f in enumerate(freqs):
            vib = 1 + 0.004*math.sin(2*math.pi*0.3*t + k)
            s += (1.0/(k+1)) * math.sin(2*math.pi*f*vib*t)
        val = int(max(-1, min(1, s/len(freqs)*env)) * 32767)
        data += struct.pack('<h', val)
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(bytes(data))

def kenburns(inp, out, dur, zoom_from=1.0, zoom_to=1.12, pan="left"):
    """Zoom lento + pan sutil, escalado a 9:16 con blur de relleno."""
    # escala para cubrir 1080x1920 (cover)
    # usa zool y crop animado via zoompan
    # pan segun indice
    x_expr = "iw/2-(iw/zoom/2)" if pan=="center" else (
        "0" if pan=="left" else "iw-iw/zoom")
    # zoompan requiere dur en frames
    fcount = int(dur*FPS)
    vf = (
        f"scale={W*2}:-1,"
        f"zoompan=z='min(zoom+({zoom_to-zoom_from})/{fcount}, {zoom_to})':"
        f"d={fcount}:x='{x_expr}':y='ih/2-ih/zoom/2':"
        f"s={W}x{H}:fps={FPS}"
    )
    # recortar a 9:16 exacto desde el centro despues
    vf2 = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
           f"crop={W}:{H},setsar=1,format=yuv420p")
    cmd = [FF, "-y", "-loop", "1", "-i", inp,
           "-vf", vf + "," + vf2,
           "-t", str(dur), "-r", str(FPS), "-pix_fmt", "yuv420p", out]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def build_video(obras, audio_freqs, out_name, title_card_text=None):
    segs = []
    for i, (img, label) in enumerate(obras):
        p = find_img(img)
        seg = os.path.join(OUT, f"_seg_{i}.mp4")
        pan = ["left", "right", "center", "left"][i % 4]
        zf = 1.0 + (i % 2) * 0.04
        kenburns(p, seg, DUR_PER, zoom_from=zf, zoom_to=zf+0.12, pan=pan)
        segs.append(seg)
    # crossfade concat
    # filtro: [0][1]xfade ... encadenado
    fin = os.path.join(OUT, out_name)
    inputs = []
    for s in segs: inputs += ["-i", s]
    # construir filter_complex
    fc = ""
    prev = "0"
    for i in range(1, len(segs)):
        outn = f"v{i}"
        offset = f"{DUR_PER*i - FADE*i:.2f}"
        fc += f"[{prev}][{i}]xfade=transition=fade:duration={FADE}:offset={offset}[{outn}];"
        prev = outn
    fc = fc.rstrip(";")
    cmd = [FF, "-y"] + inputs + ["-filter_complex", fc, "-map", f"[{prev}]",
           "-r", str(FPS), "-pix_fmt", "yuv420p", fin]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # audio ambiente
    wav = os.path.join(OUT, "_amb.wav")
    make_tone_wav(wav, dur=len(segs)*DUR_PER, freqs=audio_freqs)
    # mezclar audio
    final = os.path.join(OUT, out_name)
    tmp = os.path.join(OUT, "_tmp.mp4")
    cmd2 = [FF, "-y", "-i", fin, "-i", wav, "-c:v", "copy",
            "-c:a", "aac", "-shortest", tmp]
    subprocess.run(cmd2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.replace(tmp, final)
    # limpiar segs
    for s in segs:
        try: os.remove(s)
        except: pass
    try: os.remove(wav)
    except: pass
    print("GENERADO:", final, os.path.getsize(final), "bytes")

if __name__ == "__main__":
    # Video 1: web + redes (calido, esperanzador)
    build_video(V1, (110, 165, 220), "deriva_web_redes.mp4",
                title_card_text="Tu web propia")
    # Video 2: Deriva convocatoria (mas profundo, misterioso)
    build_video(V2, (98, 147, 196), "deriva_convocatoria.mp4",
                title_card_text="Deriva")
    print("LISTO")
