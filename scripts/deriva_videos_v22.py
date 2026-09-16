#!/usr/bin/env python3
"""V2.2 - genera e08/e09, concat final video1 + audio, y video2 deriva."""
import os, subprocess, wave, struct, math
from PIL import Image

FF="/Users/juliocesarmachado/.local/bin/ffmpeg"
FP="/Users/juliocesarmachado/.local/bin/ffprobe"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
SHOTS="/tmp/deriva_shots"; OUT=os.path.join(ROOT,"deriva","videos")
W,H,FPS=1080,1920,30

def ambient(path,dur,freqs):
    sr=44100;n=int(sr*dur);b=bytearray()
    for i in range(n):
        t=i/sr;env=0.16*(0.5+0.5*math.sin(2*math.pi*0.05*t))
        s=sum((1/(k+1))*math.sin(2*math.pi*f*(1+0.004*math.sin(2*math.pi*0.3*t+k))*t) for k,f in enumerate(freqs))
        b+=struct.pack('<h',int(max(-1,min(1,s/len(freqs)*env))*32767))
    with wave.open(path,'w') as wf:
        wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(sr);wf.writeframes(bytes(b))

def seg_zoom(img,out,dur=5.0,z=1.28):
    vf=(f"scale={W*2}:-2,zoompan=z='min(1+({z}-1)*on/({dur*FPS})\\,{z})':d={int(dur*FPS)}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1,"
        f"format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.45:.2f}:d=0.45")
    subprocess.run([FF,"-y","-loop","1","-i",img,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def seg_scroll(strip,out,speed=330,hold=0.8):
    w,h=Image.open(strip).size; hs=int(h*W/w); my=max(0,hs-H)
    dur=max(4.0,min(26.0,my/speed+hold)) if my>0 else 4.0
    ye=f"min(max(t-{hold}\\,0)*{speed}\\,{my})"
    vf=(f"scale={W}:-2,crop={W}:{H}:0:'{ye}',setsar=1,fps={FPS},format=yuv420p,"
        f"fade=t=in:st=0:d=0.45,fade=t=out:st={dur-0.5:.2f}:d=0.5")
    subprocess.run([FF,"-y","-loop","1","-i",strip,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return dur

def concat(segs,out):
    lst=os.path.join(SHOTS,"concat.txt");open(lst,"w").write("".join(f"file '{s}'\n" for s in segs))
    subprocess.run([FF,"-y","-f","concat","-safe","0","-i",lst,"-c","copy",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def with_audio(vin,dur,freqs,fout):
    wav=os.path.join(SHOTS,"_a.wav");ambient(wav,dur+0.5,freqs);tmp=fout+".t.mp4"
    subprocess.run([FF,"-y","-i",vin,"-i",wav,"-c:v","copy","-c:a","aac","-b:a","128k",
                    "-af",f"afade=t=in:st=0:d=1,afade=t=out:st={dur-1.2:.2f}:d=1.2",
                    "-shortest",tmp],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    os.replace(tmp,fout);os.remove(wav)

print("e08 newsletter + e09 contacto")
seg_zoom(f"{SHOTS}/sec_newsletter.png",f"{SHOTS}/e08.mp4",dur=5.0,z=1.28)
seg_zoom(f"{SHOTS}/sec_contacto.png",f"{SHOTS}/e09.mp4",dur=4.0,z=1.18)
escenas=[f"{SHOTS}/e0{i}.mp4" for i in range(1,10)]
for e in escenas: assert os.path.exists(e), f"falta {e}"
v1=f"{SHOTS}/v1_final_silent.mp4"; concat(escenas,v1)
r=subprocess.run([FP,"-v","error","-show_entries","format=duration",
                  "-of","default=noprint_wrappers=1:nokey=1",v1],capture_output=True,text=True)
t1=float(r.stdout.strip())
with_audio(v1,t1,(110,165,220),os.path.join(OUT,"presentacion_jcmachado_com.mp4"))
print(f"VIDEO 1 FINAL: {t1:.1f}s")

print("video 2 deriva")
png2=f"{SHOTS}/deriva_v2.png"
if not os.path.exists(png2):
    subprocess.run([CHROME,"--headless=new","--disable-gpu","--no-first-run","--disable-extensions",
        "--hide-scrollbars","--force-device-scale-factor=2","--window-size=780,13000",
        "--virtual-time-budget=15000","--screenshot="+png2,
        "https://jcmachado.com/deriva/"],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
im=Image.open(png2);w,h=im.size;step=4;smh=h//step
smx=im.convert("RGB").resize((80,smh));px=smx.load()
tail=[tuple(sum(px[x,yy][c] for x in range(80))//80 for c in range(3)) for yy in range(max(0,smh-20),smh)]
tt=tuple(sum(t[c] for t in tail)//len(tail) for c in range(3));cut=h
for yy in range(smh-1,-1,-1):
    avg=tuple(sum(px[x,yy][c] for x in range(80))//80 for c in range(3))
    if max(abs(avg[c]-tt[c]) for c in range(3))>6: cut=min(h,(yy+2)*step);break
if cut<h-8: im.crop((0,0,w,cut)).save(png2);print(f"  deriva recortada {h}->{cut}")
d2=seg_scroll(png2,f"{SHOTS}/v2seg.mp4",speed=330,hold=0.8)
with_audio(f"{SHOTS}/v2seg.mp4",d2,(98,147,196),os.path.join(OUT,"presentacion_deriva.mp4"))
print(f"VIDEO 2 FINAL: {d2:.1f}s")
print("LISTO")
