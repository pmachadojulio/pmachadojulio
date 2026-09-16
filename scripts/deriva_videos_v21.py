#!/usr/bin/env python3
"""V2.1 - completa lo que falto del video 1 (blog fix + concat + audio) y Deriva."""
import os, subprocess, wave, struct, math
from PIL import Image

FF = "/Users/juliocesarmachado/.local/bin/ffmpeg"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = "/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
SHOTS = "/tmp/deriva_shots"
OUT = os.path.join(ROOT, "deriva", "videos")
W_OUT, H_OUT, FPS = 1080, 1920, 30

def make_ambient(path, dur, freqs):
    sr=44100; n=int(sr*dur); buf=bytearray()
    for i in range(n):
        t=i/sr; env=0.16*(0.5+0.5*math.sin(2*math.pi*0.05*t))
        s=sum((1/(k+1))*math.sin(2*math.pi*f*(1+0.004*math.sin(2*math.pi*0.3*t+k))*t)
              for k,f in enumerate(freqs))
        buf+=struct.pack('<h', int(max(-1,min(1,s/len(freqs)*env))*32767))
    with wave.open(path,'w') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(bytes(buf))

def pad_to_frame(png):
    """Si la imagen escalada es mas baja que H_OUT, padece con el color de fondo."""
    im = Image.open(png).convert("RGB")
    w,h = im.size
    hs = int(h*W_OUT/w)
    if hs >= H_OUT + 60: return False
    # pad vertical con el color promedio del borde inferior hasta H_OUT+400
    bg = im.crop((0, h-10, w, h)).resize((1,1)).getpixel((0,0))
    canvas = Image.new("RGB", (w, h + int((H_OUT+400-hs)*w/W_OUT)), bg)
    canvas.paste(im, (0,0)); canvas.save(png)
    return True

def seg_scroll(strip, out, speed=380, hold=0.5, fade_in=True, fade_out=True):
    w,h = Image.open(strip).size
    hs = int(h*W_OUT/w); maxy = max(0, hs-H_OUT)
    dur = max(4.0, min(22.0, maxy/speed + hold)) if maxy>0 else 4.0
    yexpr = f"min(max(t-{hold}\\,0)*{speed}\\,{maxy})"
    vf = (f"scale={W_OUT}:-2,crop={W_OUT}:{H_OUT}:0:'{yexpr}',setsar=1,fps={FPS},format=yuv420p")
    if fade_in: vf += ",fade=t=in:st=0:d=0.45"
    if fade_out: vf += f",fade=t=out:st={dur-0.5:.2f}:d=0.5"
    subprocess.run([FF,"-y","-loop","1","-i",strip,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dur

def seg_zoom(img, out, dur=4.5, z_to=1.28):
    vf = (f"scale={W_OUT*2}:-2,"
          f"zoompan=z='min(1+({z_to}-1)*on/({dur*FPS})\\,{z_to})':d={int(dur*FPS)}:"
          f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W_OUT}x{H_OUT}:fps={FPS},"
          f"setsar=1,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.45:.2f}:d=0.45")
    subprocess.run([FF,"-y","-loop","1","-i",img,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dur

def concat(segs, out):
    lst=os.path.join(SHOTS,"concat.txt"); open(lst,"w").write("".join(f"file '{s}'\n" for s in segs))
    subprocess.run([FF,"-y","-f","concat","-safe","0","-i",lst,"-c","copy",out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def add_audio(vin,dur,freqs,fout):
    wav=os.path.join(SHOTS,"_amb.wav"); make_ambient(wav,dur+0.5,freqs)
    tmp=fout+".tmp.mp4"
    subprocess.run([FF,"-y","-i",vin,"-i",wav,"-c:v","copy","-c:a","aac","-b:a","128k",
                    "-af",f"afade=t=in:st=0:d=1,afade=t=out:st={dur-1.2:.2f}:d=1.2",
                    "-shortest",tmp],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    os.replace(tmp,fout); os.remove(wav)

print("== blog retry ==")
png = os.path.join(SHOTS,"blog_v2.png")
cmd=[CHROME,"--headless=new","--disable-gpu","--no-first-run","--disable-extensions",
     "--hide-scrollbars","--force-device-scale-factor=2","--window-size=780,9000",
     "--virtual-time-budget=18000","--screenshot="+png,
     "https://jcmachado.com/blog/"]
subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
print("  blog:", Image.open(png).size)
pad_to_frame(png)
print("== escena blog ==")
d_blog = seg_scroll(png, f"{SHOTS}/e07.mp4", speed=360, hold=0.5)
print("  blog:", round(d_blog,1),"s")

print("== concat final video 1 ==")
escenas = [f"{SHOTS}/e0{i}.mp4" for i in range(1,10)]
for e in escenas: assert os.path.exists(e), f"falta {e}"
v1 = f"{SHOTS}/v1v2_silent.mp4"
concat(escenas, v1)
# duracion real via ffprobe
r=subprocess.run(["/Users/juliocesarmachado/.local/bin/ffprobe","-v","error","-show_entries",
                  "format=duration","-of","default=noprint_wrappers=1:nokey=1",v1],
                 capture_output=True,text=True)
total1=float(r.stdout.strip())
add_audio(v1,total1,(110,165,220),f"{OUT}/presentacion_jcmachado_com.mp4")
print(f"VIDEO 1 v2 FINAL: {total1:.1f}s")

print("== video 2 deriva (actualizada) ==")
png2=os.path.join(SHOTS,"deriva_v2.png")
subprocess.run([CHROME,"--headless=new","--disable-gpu","--no-first-run","--disable-extensions",
                "--hide-scrollbars","--force-device-scale-factor=2","--window-size=780,13000",
                "--virtual-time-budget=15000","--screenshot="+png2,
                "https://jcmachado.com/deriva/"],check=True,
               stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
im=Image.open(png2); print("  deriva:", im.size)
# recorte cola vacia por color
w,h=im.size; step=4; smh=h//step
smx=im.convert("RGB").resize((80,smh)); px=smx.load()
tail=[tuple(sum(px[x,yy][c] for x in range(80))//80 for c in range(3))
      for yy in range(max(0,smh-20),smh)]
tt=tuple(sum(t[c] for t in tail)//len(tail) for c in range(3))
cut=h
for yy in range(smh-1,-1,-1):
    avg=tuple(sum(px[x,yy][c] for x in range(80))//80 for c in range(3))
    if max(abs(avg[c]-tt[c]) for c in range(3))>6: cut=min(h,(yy+2)*step); break
if cut<h-8:
    im.crop((0,0,w,cut)).save(png2); print(f"  deriva recortada -> {(w,cut)}")
d2=seg_scroll(png2,f"{SHOTS}/v2seg.mp4",speed=330,hold=0.8)
add_audio(f"{SHOTS}/v2seg.mp4",d2,(98,147,196),f"{OUT}/presentacion_deriva.mp4")
print(f"VIDEO 2 FINAL: {d2:.1f}s")
print("LISTO")
