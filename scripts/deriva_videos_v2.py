#!/usr/bin/env python3
"""
V2 - Video presentacion jcmachado.com con TODAS las secciones + zooms CTA.
Escenas: hero -> scroll portfolio (con fin REAL, sin infinito) -> TAP ficha obra
-> encargos (zoom) -> como-comprar (paneo pasos) -> marco-conceptual -> faq
-> blog (scroll) -> newsletter (zoom) -> contacto/footer.
Tambien regenera el video de Deriva (pagina actualizada).
"""
import os, subprocess, wave, struct, math

FF = "/Users/juliocesarmachado/.local/bin/ffmpeg"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = "/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
SHOTS = "/tmp/deriva_shots"
OUT = os.path.join(ROOT, "deriva", "videos")
os.makedirs(SHOTS, exist_ok=True); os.makedirs(OUT, exist_ok=True)

W_OUT, H_OUT, FPS = 1080, 1920, 30

BASE = "https://jcmachado.com"

def capture(name, url, css_h=1400, w=780):
    png = os.path.join(SHOTS, f"{name}.png")
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
           "--disable-extensions", "--hide-scrollbars",
           "--force-device-scale-factor=2",
           f"--window-size={w},{css_h}",
           "--virtual-time-budget=10000",
           f"--screenshot={png}", url]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert os.path.exists(png)
    return png

def capture_full(name, url, css_h):
    """Captura pagina completa (tira larga) y recorta cola vacia por COLOR."""
    png = capture(name, url, css_h=css_h)
    from PIL import Image
    im = Image.open(png).convert("RGB")
    w, h = im.size
    step = 4
    small_h = max(1, h // step)
    sm = im.resize((80, small_h)); px = sm.load()
    tail_rows = [tuple(sum(px[x, yy][c] for x in range(80)) // 80 for c in range(3))
                 for yy in range(max(0, small_h - 20), small_h)]
    tail = tuple(sum(t[c] for t in tail_rows) // len(tail_rows) for c in range(3))
    cut = h
    for yy in range(small_h - 1, -1, -1):
        avg = tuple(sum(px[x, yy][c] for x in range(80)) // 80 for c in range(3))
        if max(abs(avg[c] - tail[c]) for c in range(3)) > 6:
            cut = min(h, (yy + 2) * step); break
    if cut < h - 8:
        im.crop((0, 0, w, cut)).save(png)
        print(f"  {name}: {w}x{h} -> {w}x{cut} (cola vacia recortada)")
    else:
        print(f"  {name}: {w}x{h} (sin cola vacia)")
    return png

def make_ambient(path, dur, freqs=(110,165,220)):
    sr = 44100; n = int(sr*dur); buf = bytearray()
    for i in range(n):
        t = i/sr
        env = 0.16*(0.5+0.5*math.sin(2*math.pi*0.05*t))
        s = sum((1/(k+1))*math.sin(2*math.pi*f*(1+0.004*math.sin(2*math.pi*0.3*t+k))*t)
                for k,f in enumerate(freqs))
        buf += struct.pack('<h', int(max(-1,min(1,s/len(freqs)*env))*32767))
    with wave.open(path,'w') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(bytes(buf))

def seg_scroll(strip, out, speed=330, hold=0.6, fade_in=True, fade_out=True):
    from PIL import Image
    w,h = Image.open(strip).size
    hs = int(h*W_OUT/w); maxy = max(0, hs-H_OUT)
    dur = max(4.0, min(22.0, maxy/speed + hold)) if maxy>0 else 4.0
    yexpr = f"min(max(t-{hold}\\,0)*{speed}\\,{maxy})"
    vf = (f"scale={W_OUT}:-2,crop={W_OUT}:{H_OUT}:0:'{yexpr}',setsar=1,fps={FPS},format=yuv420p")
    if fade_in:  vf += ",fade=t=in:st=0:d=0.45"
    if fade_out: vf += f",fade=t=out:st={dur-0.5:.2f}:d=0.5"
    subprocess.run([FF,"-y","-loop","1","-i",strip,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dur

def seg_zoom(img, out, dur=4.5, z_to=1.32, fade_in=True, fade_out=True):
    """Zoom centrado lento sobre una captura de seccion -> efecto 'aca se toca'."""
    vf = (f"scale={W_OUT*2}:-2,"
          f"zoompan=z='min(1+({z_to}-1)*on/({dur*FPS})\\,{z_to})':"
          f"d={int(dur*FPS)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          f"s={W_OUT}x{H_OUT}:fps={FPS},setsar=1,format=yuv420p")
    if fade_in:  vf += ",fade=t=in:st=0:d=0.4"
    if fade_out: vf += f",fade=t=out:st={dur-0.45:.2f}:d=0.45"
    subprocess.run([FF,"-y","-loop","1","-i",img,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dur

def concat(segs, out):
    lst = os.path.join(SHOTS,"concat.txt")
    open(lst,"w").write("".join(f"file '{s}'\n" for s in segs))
    subprocess.run([FF,"-y","-f","concat","-safe","0","-i",lst,"-c","copy",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def add_audio(vin, dur, freqs, fout):
    wav = os.path.join(SHOTS,"_amb.wav"); make_ambient(wav, dur+0.5, freqs)
    tmp = fout+".tmp.mp4"
    subprocess.run([FF,"-y","-i",vin,"-i",wav,"-c:v","copy","-c:a","aac","-b:a","128k",
                    "-af",f"afade=t=in:st=0:d=1,afade=t=out:st={dur-1.2:.2f}:d=1.2",
                    "-shortest",tmp], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.replace(tmp,fout); os.remove(wav)

print("== V2: capturas ==")
strips = {}
strips["home"]   = capture_full("home_v2", BASE+"/", 13000)
strips["obra"]   = capture_full("obra_v2", BASE+"/obra/ascenso-raiz/", 8000)
strips["blog"]   = capture_full("blog_v2", BASE+"/blog/", 6000)
secs = {}
for s in ["inicio","encargos","como-comprar","marco-conceptual","faq","newsletter","contacto"]:
    secs[s] = capture(f"sec_{s}", f"{BASE}/#{s}")
print("  secciones capturadas:", list(secs))

print("== escenas video 1 (jcmachado.com) ==")
E = []
d = seg_scroll(strips["home"], f"{SHOTS}/e01.mp4", speed=430, hold=1.0); E.append((f"{SHOTS}/e01.mp4", d)); print("  scroll home:", round(d,1),"s")
d = seg_zoom(secs["encargos"], f"{SHOTS}/e02.mp4", dur=4.5, z_to=1.30); E.append((f"{SHOTS}/e02.mp4", d)); print("  encargos zoom:", round(d,1),"s")
d = seg_scroll(strips["obra"], f"{SHOTS}/e03.mp4", speed=420, hold=0.6, fade_in=False); E.append((f"{SHOTS}/e03.mp4", d)); print("  ficha obra:", round(d,1),"s (tap)")
d = seg_zoom(secs["como-comprar"], f"{SHOTS}/e04.mp4", dur=5.0, z_to=1.25); E.append((f"{SHOTS}/e04.mp4", d)); print("  como comprar:", round(d,1),"s")
d = seg_zoom(secs["marco-conceptual"], f"{SHOTS}/e05.mp4", dur=4.0, z_to=1.22); E.append((f"{SHOTS}/e05.mp4", d)); print("  marco conceptual:", round(d,1),"s")
d = seg_zoom(secs["faq"], f"{SHOTS}/e06.mp4", dur=4.0, z_to=1.22); E.append((f"{SHOTS}/e06.mp4", d)); print("  faq:", round(d,1),"s")
d = seg_scroll(strips["blog"], f"{SHOTS}/e07.mp4", speed=380, hold=0.5); E.append((f"{SHOTS}/e07.mp4", d)); print("  blog:", round(d,1),"s")
d = seg_zoom(secs["newsletter"], f"{SHOTS}/e08.mp4", dur=5.0, z_to=1.28); E.append((f"{SHOTS}/e08.mp4", d)); print("  newsletter:", round(d,1),"s")
d = seg_zoom(secs["contacto"], f"{SHOTS}/e09.mp4", dur=4.0, z_to=1.18); E.append((f"{SHOTS}/e09.mp4", d)); print("  contacto:", round(d,1),"s")

v1_silent = f"{SHOTS}/v1v2_silent.mp4"
concat([s for s,_ in E], v1_silent)
total1 = sum(d for _,d in E)
add_audio(v1_silent, total1, (110,165,220), f"{OUT}/presentacion_jcmachado_com.mp4")
print(f"VIDEO 1 v2 listo ({total1:.1f}s)")

print("== video 2 (deriva actualizada) ==")
strips["deriva"] = capture_full("deriva_v2", BASE+"/deriva/", 13000)
d2 = seg_scroll(strips["deriva"], f"{SHOTS}/v2seg.mp4", speed=330, hold=0.8)
add_audio(f"{SHOTS}/v2seg.mp4", d2, (98,147,196), f"{OUT}/presentacion_deriva.mp4")
print(f"VIDEO 2 listo ({d2:.1f}s)")
print("LISTO ->", OUT)
