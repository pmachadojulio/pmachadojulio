#!/usr/bin/env python3
"""
Videos de presentacion de las paginas web (scrolleo real sobre capturas).
- Captura jcmachado.com (home), ficha de obra y /deriva/ con Chrome HEADLESS
  como tiras verticales completas (mobile-ish 780px @2x = nitido en 9:16).
- ffmpeg anima el scrolleo (paneo vertical lento) sobre cada tira -> 1080x1920.
- Corte duro entre paginas = simula un 'tap'. Audio ambiental sintetizado.
- Sin voz ni texto quemado: listo para voice-over.
"""
import os, subprocess, wave, struct, math

FF = "/Users/juliocesarmachado/.local/bin/ffmpeg"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = "/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
SHOTS = "/tmp/deriva_shots"
OUT = os.path.join(ROOT, "deriva", "videos")
os.makedirs(SHOTS, exist_ok=True); os.makedirs(OUT, exist_ok=True)

W_OUT, H_OUT, FPS = 1080, 1920, 30
CSS_W = 780          # ancho logico de captura (layout tablet/mobile grande)
SCALE = 2            # device scale factor -> PNG 1560px de ancho
CAP_H = {"home": 11000, "obra": 8000, "deriva": 12000}   # alto CSS tentativo

PAGES = [
    ("home",   "https://jcmachado.com/",              CAP_H["home"]),
    ("obra",   "https://jcmachado.com/obra/ascenso-raiz/", CAP_H["obra"]),
    ("deriva", "https://jcmachado.com/deriva/",       CAP_H["deriva"]),
]

def capture(name, url, css_h):
    png = os.path.join(SHOTS, f"{name}.png")
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
           "--disable-extensions", "--hide-scrollbars",
           f"--force-device-scale-factor={SCALE}",
           f"--window-size={CSS_W},{css_h}",
           "--virtual-time-budget=10000",
           f"--screenshot={png}", url]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert os.path.exists(png), f"no screenshot {name}"
    return png

def trim_bottom(png):
    """Recorta blanco/espacio vacio al pie de la tira."""
    from PIL import Image
    im = Image.open(png).convert("RGB")
    w, h = im.size
    # escanear desde abajo buscando la primera fila "no vacia"
    small = im.resize((60, h // 4 or 1))
    px = small.load()
    last = h - 1
    for yy in range(small.height - 1, -1, -1):
        row_avg = sum(sum(px[x, yy]) / 3 for x in range(60)) / 60
        if row_avg < 250:  # no es casi-blanco
            last = min(h - 1, (yy + 1) * 4)
            break
    if last < h - 40:
        im = im.crop((0, 0, w, last))
        im.save(png)
    return im.size  # (w, h) fisicos

def make_ambient(path, dur, freqs=(110, 165, 220)):
    sr = 44100; n = int(sr * dur)
    buf = bytearray()
    for i in range(n):
        t = i / sr
        env = 0.16 * (0.5 + 0.5 * math.sin(2 * math.pi * 0.05 * t))
        s = sum((1/(k+1)) * math.sin(2*math.pi*f*(1+0.004*math.sin(2*math.pi*0.3*t+k))*t)
                for k, f in enumerate(freqs))
        buf += struct.pack('<h', int(max(-1, min(1, s/len(freqs)*env)) * 32767))
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes(bytes(buf))

def scroll_segment(strip_png, out_mp4, speed=330, hold=0.8):
    """Paneo vertical sobre la tira -> mp4 1080x1920."""
    from PIL import Image
    w, h = Image.open(strip_png).size
    scale_to = W_OUT
    h_scaled = int(h * scale_to / w)
    max_y = max(0, h_scaled - H_OUT)
    dur = max(8.0, min(26.0, max_y / speed + hold)) if max_y > 0 else 6.0
    yexpr = f"min(max(t-{hold}\\,0)*{speed}\\,{max_y})"
    vf = (f"scale={W_OUT}:-2,crop={W_OUT}:{H_OUT}:0:'{yexpr}',"
          f"setsar=1,fps={FPS},format=yuv420p,"
          f"fade=t=in:st=0:d=0.5,fade=t=out:st={dur-0.6:.2f}:d=0.6")
    cmd = [FF, "-y", "-loop", "1", "-i", strip_png,
           "-vf", vf, "-t", f"{dur:.2f}", "-an", out_mp4]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dur

def concat(segs, out_no_audio):
    lst = os.path.join(SHOTS, "concat.txt")
    with open(lst, "w") as f:
        for s in segs: f.write(f"file '{s}'\n")
    cmd = [FF, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out_no_audio]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def add_audio(video_in, dur, freqs, out_final):
    wav = os.path.join(SHOTS, "_amb.wav")
    make_ambient(wav, dur + 0.5, freqs)
    tmp = out_final + ".tmp.mp4"
    cmd = [FF, "-y", "-i", video_in, "-i", wav,
           "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
           "-af", f"afade=t=in:st=0:d=1,afade=t=out:st={dur-1.2:.2f}:d=1.2",
           "-shortest", tmp]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.replace(tmp, out_final)
    os.remove(wav)

print("== capturando paginas ==")
strips = {}
for name, url, ch in PAGES:
    p = capture(name, url, ch)
    size = trim_bottom(p)
    strips[name] = p
    print(f"  {name}: {size[0]}x{size[1]}px")

print("== generando segmentos de scrolleo ==")
seg_files = []
durs = []
# VIDEO 1: home (web propia) -> tap -> ficha de obra (muestra obra + proceso YouTube)
for name, spd in [("home", 330), ("obra", 400)]:
    sf = os.path.join(SHOTS, f"seg_{name}.mp4")
    d = scroll_segment(strips[name], sf, speed=spd)
    seg_files.append(sf); durs.append(d)
v1_silent = os.path.join(SHOTS, "v1_silent.mp4")
concat(seg_files[:2], v1_silent)
add_audio(v1_silent, sum(durs[:2]), (110, 165, 220),
          os.path.join(OUT, "presentacion_jcmachado_com.mp4"))
print("  VIDEO 1 listo:", sum(durs[:2]), "s aprox")

# VIDEO 2: deriva completa
sf = os.path.join(SHOTS, "seg_deriva_full.mp4")
d = scroll_segment(strips["deriva"], sf, speed=310)
v2_silent = sf
add_audio(v2_silent, d, (98, 147, 196),
          os.path.join(OUT, "presentacion_deriva.mp4"))
print("  VIDEO 2 listo:", d, "s aprox")

print("LISTO ->", OUT)
