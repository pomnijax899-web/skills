import numpy as np, wave
SR=44100; DUR=36.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)

def lp(x,k):  # media móvil (paso bajo)
    c=np.cumsum(np.insert(x,0,0)); y=(c[k:]-c[:-k])/k
    return np.concatenate([np.full(k-1,y[0]),y])
def env_at(t0,dur,atk=0.005,dec=3.0):
    e=np.zeros(N); i0=int(t0*SR); n=int(dur*SR); n=min(n,N-i0)
    tt=np.arange(n)/SR
    e[i0:i0+n]=np.minimum(tt/atk,1)*np.exp(-tt/dec)
    return e
def add(sig,pan=0.0,gain=1.0):
    global L,R
    L+=sig*gain*(1-max(pan,0)); R+=sig*gain*(1+min(pan,0))

# lluvia (exterior 0-16s, más amortiguada dentro)
n=rng.standard_normal(N)
rain=n-lp(n,6)               # paso alto suave
rain_in=lp(n,40)*2.2
gm=np.clip((t-15.5)/1.5,0,1)
rain_mix=rain*(1-gm)*0.06+rain_in*gm*0.05
add(rain_mix,0.0,1.0)
add(np.roll(rain_mix,900),0.3,0.0)
R+=np.roll(rain_mix,900)*0.0

# pad oscuro (La menor), entra suave
chord=[110.0,130.81,164.81,220.0]
pad=np.zeros(N)
for i,fq in enumerate(chord):
    lfo=1+0.004*np.sin(2*np.pi*(0.13+i*0.03)*t)
    pad+=np.sin(2*np.pi*fq*lfo*t)+0.3*np.sin(2*np.pi*fq*2*t)
pad*=np.clip(t/3,0,1)*0.045
pad*=1+0.15*np.sin(2*np.pi*0.1*t)
# crece la tensión hacia el final
pad*=1+np.clip((t-24)/6,0,1)*0.8
add(pad)

# piano pluck
def pluck(t0,fq,g=0.18,dec=1.6):
    e=env_at(t0,5,0.004,dec)
    s=(np.sin(2*np.pi*fq*t)+0.45*np.sin(2*np.pi*2*fq*t)*np.exp(-(t-t0)*1.5).clip(0,1)
       +0.2*np.sin(2*np.pi*3*fq*t))
    return s*e*g
mel=[(1.0,440),(2.2,523.25),(3.5,659.25),(5.0,587.33),(6.2,523.25),(7.5,440),(9.0,392),(10.5,440),(12.0,523.25),(13.5,493.88),
     (15.0,440),(16.8,329.63),(18.2,392),(19.6,440),(21.0,329.63),(22.4,293.66)]
for t0,fq in mel:
    p=pluck(t0,fq); add(p,-0.2,1.0)
# bajos
for t0,fq in [(0.5,110),(5.5,87.31),(10.5,98),(15.5,110),(20.5,87.31),(25,110)]:
    add(pluck(t0,fq,0.25,3.0),0,1.0)

# trueno (3.0 s)
th=rng.standard_normal(N); th=lp(lp(th,60),60)*60
th*=env_at(2.85,3.0,0.02,0.9)*0.25
add(th,0,1.0)

# pasos suaves (primera escena)
for t0 in np.arange(0.4,5.8,0.62):
    s=lp(rng.standard_normal(N),90)*env_at(t0,0.2,0.002,0.05)*3.0
    add(s,0,0.12)

# golpecito en puerta/porche ~ 6.5
add(lp(rng.standard_normal(N),120)*env_at(6.5,0.4,0.002,0.08)*4,0,0.18)

# llave: tintineo metálico
def clink(t0,g=0.14):
    s=np.zeros(N)
    for fq in (2150,3270,4410,5830):
        s+=np.sin(2*np.pi*fq*t)*np.exp(-(t-t0)*14).clip(0,1)*(t>=t0)
    return s*g
add(clink(14.4),0,1.0); add(clink(14.75,0.1),0.2,1.0)

# clic cerradura 23.2s
add(lp(rng.standard_normal(N),12)*env_at(23.2,0.15,0.001,0.03)*5,0,0.35)
add(clink(23.25,0.18),0,1.0)

# crujido de puerta 23.5-25.5 (sierra con pitch descendente + ruido)
i0=int(23.5*SR); n=int(2.0*SR)
tt=np.arange(n)/SR
f0=140-30*tt/2
ph=np.cumsum(2*np.pi*f0/SR)
creak=(np.sign(np.sin(ph))*0.5+np.sin(ph*3.1)*0.3)*(0.5+0.5*np.sin(2*np.pi*9*tt))
creak*=np.minimum(tt/0.2,1)*np.exp(-tt/1.6)*0.07
sig=np.zeros(N); sig[i0:i0+n]=creak; add(sig,0.1,1.0)
# luz cálida: shimmer agudo al abrirse
shim=np.zeros(N)
for fq in (880,1320,1760,2640):
    shim+=np.sin(2*np.pi*fq*t)*np.clip((t-24.0)/1.2,0,1)*np.exp(-(t-24.0)/2.5).clip(0,1)*(t>24.0)
add(shim*0.025,0,1.0)

# latido tenso (28-31.3s)
for k,t0 in enumerate(np.arange(28.0,31.2,0.8)):
    for d in (0.0,0.22):
        bt=lp(lp(rng.standard_normal(N),30),30)*env_at(t0+d,0.3,0.004,0.09)*25
        add(np.sin(2*np.pi*55*t)*env_at(t0+d,0.4,0.004,0.12)*(0.25+k*0.04),0,1.0)

# whoosh papel (carta entra 28.6s)
w=lp(rng.standard_normal(N),20); w=w-lp(w,200)
w*=np.exp(-((t-28.7)**2)/0.05)*0.12
add(w,0,1.0)

# GOLPE dramático 31.33s
hit_t=31.33
boom=np.sin(2*np.pi*(48*np.exp(-(t-hit_t)*1.5).clip(0.3,1)*t))*env_at(hit_t,3.0,0.003,0.9)*0.7*(t>=hit_t)
noise=lp(rng.standard_normal(N),4)*env_at(hit_t,1.0,0.001,0.18)*0.5
add(boom,0,1.0); add(noise,0,1.0)
# reverb falso del golpe
for d,gv in ((0.09,0.5),(0.21,0.3),(0.37,0.2)):
    sh=int(d*SR); sig=np.roll(boom,sh)*gv; sig[:sh]=0; add(sig,0,0.6)
# cuerdas agudas (stinger) 31.3-34
st=np.zeros(N)
for fq in (233.1,277.2,349.2,415.3):
    st+=np.sin(2*np.pi*fq*t)
st*=env_at(hit_t,4.0,0.4,2.2)*0.05*(t>=hit_t)
add(st,0,1.0)

# fin: silencio y último acorde suave en la tarjeta
for fq in (220,261.63,329.63):
    add(pluck(33.8,fq,0.12,2.5),0,1.0)

# fundidos y normalización
fade=np.minimum(np.minimum(t/0.8,1),np.clip((DUR-t)/1.2,0,1))
L*=fade; R*=fade
L=np.tanh(L*1.1)*0.9; R=np.tanh(R*1.1)*0.9
st=np.stack([L,R],1)
pcm=(st*32767).astype(np.int16)
with wave.open('audio/ep1.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok',DUR)
