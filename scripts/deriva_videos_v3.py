#!/usr/bin/env python3
"""
V3 - Metodo deterministico con CDP:
- Chrome headless con --remote-debugging-port
- Mido offsets REALES de cada seccion (getBoundingClientRect) + altura del documento
- Capturo la tira completa a la altura exacta (sin scroll infinito)
- Recorto ventanas por coordenadas verdaderas -> zooms precisos
"""
import json, os, subprocess, time, wave, struct, math
import websocket

FF="/Users/juliocesarmachado/.local/bin/ffmpeg"
FP="/Users/juliocesarmachado/.local/bin/ffprobe"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="/Users/juliocesarmachado/Documents/Proyectos I.A./Proyecto jcmachado/pmachadojulio-main"
SHOTS="/tmp/deriva_shots"; OUT=os.path.join(ROOT,"deriva","videos")
W,H,FPS=1080,1920,30
DBG=9223; PROFILE="/tmp/deriva_chrome_v3"

class CDP:
    def __init__(self):
        self.proc=subprocess.Popen([CHROME,"--headless=new","--disable-gpu","--no-first-run",
            "--disable-extensions","--hide-scrollbars",
            f"--remote-debugging-port={DBG}","--remote-allow-origins=*",
            f"--user-data-dir={PROFILE}",
            "--window-size=780,1400","about:blank"],
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        time.sleep(2.5)
        import urllib.request
        for _ in range(20):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{DBG}/json"))
                page=[t for t in tabs if t.get("type")=="page"][0]
                break
            except Exception: time.sleep(0.5)
        self.ws=websocket.create_connection(page["webSocketDebuggerUrl"],timeout=30)
        self.i=0
    def cmd(self,method,**params):
        self.i+=1
        self.ws.send(json.dumps({"id":self.i,"method":method,"params":params}))
        while True:
            m=json.loads(self.ws.recv())
            if m.get("id")==self.i: return m.get("result",{})
    def js(self,expr):
        r=self.cmd("Runtime.evaluate",expression=expr,returnByValue=True)
        return r.get("result",{}).get("value")
    def shot(self,path):
        r=self.cmd("Page.captureScreenshot",format="png")
        open(path,"wb").write(__import__("base64").b64decode(r["data"]))
    def close(self):
        try: self.cmd("Browser.close")
        except Exception: pass
        self.proc.wait(timeout=8)

def ambient(path,dur,freqs):
    sr=44100;n=int(sr*dur);b=bytearray()
    for i in range(n):
        t=i/sr;env=0.16*(0.5+0.5*math.sin(2*math.pi*0.05*t))
        s=sum((1/(k+1))*math.sin(2*math.pi*f*(1+0.004*math.sin(2*math.pi*0.3*t+k))*t) for k,f in enumerate(freqs))
        b+=struct.pack('<h',int(max(-1,min(1,s/len(freqs)*env))*32767))
    with wave.open(path,'w') as wf:
        wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(sr);wf.writeframes(bytes(b))

def seg_scroll(strip,out,speed=340,hold=0.7,fade_out=True):
    from PIL import Image
    w,h=Image.open(strip).size; hs=int(h*W/w); my=max(0,hs-H)
    dur=max(4.0,min(24.0,my/speed+hold)) if my>0 else 4.0
    ye=f"min(max(t-{hold}\\,0)*{speed}\\,{my})"
    vf=(f"scale={W}:-2,crop={W}:{H}:0:'{ye}',setsar=1,fps={FPS},format=yuv420p,"
        f"fade=t=in:st=0:d=0.45"+(f",fade=t=out:st={dur-0.5:.2f}:d=0.5" if fade_out else ""))
    subprocess.run([FF,"-y","-loop","1","-i",strip,"-vf",vf,"-t",f"{dur:.2f}","-an",out],
                   check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return dur

def seg_zoom(img,out,dur=4.5,z=1.26,fade_out=True):
    vf=(f"scale={W*2}:-2,zoompan=z='min(1+({z}-1)*on/({dur*FPS})\\,{z})':d={int(dur*FPS)}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1,"
        f"format=yuv420p,fade=t=in:st=0:d=0.4"+
        (f",fade=t=out:st={dur-0.45:.2f}:d=0.45" if fade_out else ""))
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

print("== CDP chrome headless ==")
cdp=CDP()
try:
    cdp.cmd("Emulation.setDeviceMetricsOverride",width=780,height=1400,deviceScaleFactor=2,mobile=False)
    cdp.cmd("Page.navigate",url="https://jcmachado.com/")
    time.sleep(5)
    doc_h=cdp.js("document.documentElement.scrollHeight")
    print("  altura REAL del documento:",doc_h)
    secs=["inicio","portfolio","encargos","sobre-mi","marco-conceptual","como-comprar","faq","newsletter","contacto"]
    offs={}
    for s in secs:
        o=cdp.js(f"""(()=>{{const e=document.getElementById('{s}');
            return e? Math.round(e.getBoundingClientRect().top+window.scrollY) : null;}})()""")
        offs[s]=o
    print("  offsets:",offs)
    # recapturar home COMPLETA a altura real
    cdp.cmd("Emulation.setDeviceMetricsOverride",width=780,height=min(doc_h,16000),deviceScaleFactor=2,mobile=False)
    cdp.shot(f"{SHOTS}/home_v3.png")
    from PIL import Image
    im=Image.open(f"{SHOTS}/home_v3.png"); print("  tira home:",im.size)
    # recortar ventanas de secciones (en px fisicos = offset_css * 2), ventana 2600css
    VENT=2600
    crops={"encargos":offs["encargos"],"marco-conceptual":offs["marco-conceptual"],
           "como-comprar":offs["como-comprar"],"faq":offs["faq"],
           "newsletter":offs["newsletter"],"contacto":offs["contacto"]}
    for name,y in crops.items():
        if y is None: print("  !! sin offset para",name); continue
        y0=int(y*2); y1=min(int((y+VENT)*2),im.size[1])
        if y1-y0<800: continue
        im.crop((0,y0,im.size[0],y1)).save(f"{SHOTS}/v3_{name}.png")
        print(f"  v3_{name}.png  y={y} ({y0}-{y1}px fisicos)")
finally:
    cdp.close()

print("== escenas ==")
E=[]
# 1. hero estatico breve (arranca mostrando el titulo)
seg_zoom(f"{SHOTS}/home_v3.png",f"{SHOTS}/x_hero.mp4",dur=4.0,z=1.06)
E.append((f"{SHOTS}/x_hero.mp4",4.0));print("  hero zoom sutil 4s")
# 2. scroll portfolio (mitad superior de la tira, hasta encargos)
from PIL import Image
im=Image.open(f"{SHOTS}/home_v3.png")
y_enc=int(offs["encargos"]*2) if offs["encargos"] else 12000
im.crop((0,int(1400*2),im.size[0],min(y_enc+600,im.size[1]))).save(f"{SHOTS}/strip_portfolio.png")
d=seg_scroll(f"{SHOTS}/strip_portfolio.png",f"{SHOTS}/x_port.mp4",speed=430,hold=0.6,fade_out=False)
E.append((f"{SHOTS}/x_port.mp4",d));print("  scroll portfolio:",round(d,1),"s")
# 3. zooms de secciones
for nm,dur,z in [("encargos",4.5,1.28),("como-comprar",5.0,1.24),
                 ("marco-conceptual",4.0,1.22),("faq",4.0,1.22),
                 ("newsletter",5.0,1.28)]:
    p=f"{SHOTS}/v3_{nm}.png"
    if not os.path.exists(p): continue
    d=dur; seg_zoom(p,f"{SHOTS}/x_{nm}.mp4",dur=dur,z=z)
    E.append((f"{SHOTS}/x_{nm}.mp4",d));print(f"  {nm}: {dur}s")
# 4. ficha obra (tap)
obra=f"{SHOTS}/obra_v2.png"
if os.path.exists(obra):
    d=seg_scroll(obra,f"{SHOTS}/x_obra.mp4",speed=420,hold=0.5)
    E.append((f"{SHOTS}/x_obra.mp4",d));print("  ficha obra:",round(d,1),"s")
# 5. contacto final (cierro en contacto)
p=f"{SHOTS}/v3_contacto.png"
if os.path.exists(p):
    seg_zoom(p,f"{SHOTS}/x_contacto.mp4",dur=4.0,z=1.12)
    E.append((f"{SHOTS}/x_contacto.mp4",4.0));print("  contacto: 4s")

v1=f"{SHOTS}/v3_silent.mp4"; concat([s for s,_ in E],v1)
r=subprocess.run([FP,"-v","error","-show_entries","format=duration",
                  "-of","default=noprint_wrappers=1:nokey=1",v1],capture_output=True,text=True)
t1=float(r.stdout.strip())
with_audio(v1,t1,(110,165,220),os.path.join(OUT,"presentacion_jcmachado_com.mp4"))
print(f"VIDEO 1 v3 FINAL: {t1:.1f}s")
print("LISTO")
