#!/usr/bin/env python3
"""V4 - ensamblado final: orden narrativo + <60s + blog incluido."""
import os, subprocess, wave, struct, math
from PIL import Image

FF="/Users/juliocesarmachado/.local/bin/ffmpeg"
FP="/Users/juliocesarmachado/.local/bin/ffprobe"
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

def seg_scroll(strip,out,speed=430,hold=0.5):
    w,h=Image.open(strip).size; hs=int(h*W/w); my=max(0,hs-H)
    dur=max(3.0,min(18.0,my/speed+hold)) if my>0 else 3.0
    ye=f"min(max(t-{hold}\\,0)*{speed}\\,{my})"
    vf=(f"scale={W}:-2,crop={W}:{H}:0:'{ye}',setsar=1,fps={FPS},format=yuv420p,"
        f"fade=t=in:st=0:d=0.35,fade=t=out:st={dur-0.4:.2f}:d=0.4")
    subprocess.run([FF,"-y","-loop","1","-i",strip,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return dur

def seg_zoom(img,out,dur,z,fade_out=True):
    vf=(f"scale={W*2}:-2,zoompan=z='min(1+({z}-1)*on/({dur*FPS})\\,{z})':d={int(dur*FPS)}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1,"
        f"format=yuv420p,fade=t=in:st=0:d=0.35"+
        (f",fade=t=out:st={dur-0.4:.2f}:d=0.4" if fade_out else ""))
    subprocess.run([FF,"-y","-loop","1","-i",img,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def concat(segs,out):
    lst=os.path.join(SHOTS,"c.txt");open(lst,"w").write("".join(f"file '{s}'\n" for s in segs))
    subprocess.run([FF,"-y","-f","concat","-safe","0","-i",lst,"-c","copy",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def with_audio(vin,dur,freqs,fout):
    wav=os.path.join(SHOTS,"a.wav");ambient(wav,dur+0.5,freqs);tmp=fout+".t.mp4"
    subprocess.run([FF,"-y","-i",vin,"-i",wav,"-c:v","copy","-c:a","aac","-b:a","128k",
                    "-af",f"afade=t=in:st=0:d=1,afade=t=out:st={max(0,dur-1.2):.2f}:d=1.2",
                    "-shortest",tmp],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    os.replace(tmp,fout);os.remove(wav)

E=[]
# 1. HERO (3s, zoom sutil sin fade-out para continuidad)
seg_zoom(f"{SHOTS}/home_v3.png",f"{SHOTS}/f01.mp4",3.0,1.07,fade_out=False); E.append((f"{SHOTS}/f01.mp4",3.0))
# 2. PORTFOLIO rapido (recorto hasta encargos, velocidad alta)
im=Image.open(f"{SHOTS}/home_v3.png")
im.crop((0,int(1400*2),im.size[0],int(10163*2)+600)).save(f"{SHOTS}/f_port.png")
d=seg_scroll(f"{SHOTS}/f_port.png",f"{SHOTS}/f02.mp4",speed=680,hold=0.5); E.append((f"{SHOTS}/f02.mp4",d)); print("portfolio:",round(d,1))
# 3. TAP -> ficha de obra (mitad superior, incluye precio + prints)
ob=Image.open(f"{SHOTS}/obra_v2.png"); ob.crop((0,0,ob.size[0],ob.size[1]//2)).save(f"{SHOTS}/f_obra.png")
d=seg_scroll(f"{SHOTS}/f_obra.png",f"{SHOTS}/f03.mp4",speed=560,hold=0.4); E.append((f"{SHOTS}/f03.mp4",d)); print("obra:",round(d,1))
# 4. ENCARGOS zoom
seg_zoom(f"{SHOTS}/v3_encargos.png",f"{SHOTS}/f04.mp4",4.0,1.26); E.append((f"{SHOTS}/f04.mp4",4.0))
# 5. COMO COMPRAR
seg_zoom(f"{SHOTS}/v3_como-comprar.png",f"{SHOTS}/f05.mp4",4.5,1.24); E.append((f"{SHOTS}/f05.mp4",4.5))
# 6. MARCO CONCEPTUAL
seg_zoom(f"{SHOTS}/v3_marco-conceptual.png",f"{SHOTS}/f06.mp4",3.5,1.20); E.append((f"{SHOTS}/f06.mp4",3.5))
# 7. FAQ
seg_zoom(f"{SHOTS}/v3_faq.png",f"{SHOTS}/f07.mp4",3.5,1.20); E.append((f"{SHOTS}/f07.mp4",3.5))
# 8. BLOG rapido (mitad superior del blog ya capturado)
bl=Image.open(f"{SHOTS}/blog_v2.png"); bl.crop((0,0,bl.size[0],bl.size[1]*3//5)).save(f"{SHOTS}/f_blog.png")
d=seg_scroll(f"{SHOTS}/f_blog.png",f"{SHOTS}/f08.mp4",speed=720,hold=0.4); E.append((f"{SHOTS}/f08.mp4",d)); print("blog:",round(d,1))
# 9. NEWSLETTER cierre (sin fade-out al final para que el afade de audio cierre)
seg_zoom(f"{SHOTS}/v3_newsletter.png",f"{SHOTS}/f09.mp4",5.0,1.30,fade_out=False); E.append((f"{SHOTS}/f09.mp4",5.0))

v1=f"{SHOTS}/v4_silent.mp4"; concat([s for s,_ in E],v1)
r=subprocess.run([FP,"-v","error","-show_entries","format=duration",
                  "-of","default=noprint_wrappers=1:nokey=1",v1],capture_output=True,text=True)
t1=float(r.stdout.strip())
with_audio(v1,t1,(110,165,220),os.path.join(OUT,"presentacion_jcmachado_com.mp4"))
print(f"VIDEO 1 v4 FINAL: {t1:.1f}s")
print("LISTO")
