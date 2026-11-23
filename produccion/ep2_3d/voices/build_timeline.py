"""Construye la línea de tiempo del episodio a partir de las voces y mezcla el audio final."""
import json, wave, numpy as np, os
FPS = 30
SR = 44100
D = os.path.dirname(os.path.abspath(__file__))
L = {l['id']: l for l in json.load(open(f'{D}/lines.json'))}

def load(i):
    w = wave.open(f'{D}/{i}.wav'); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    return a

# --- tiempos (segundos) ---
dur = lambda i: len(load(i)) / SR
T = {}
T['flash'] = 1.0
T['narr1'] = 0.9
T['title_in'] = T['narr1'] + dur('narr1') - 0.4
T['narr2'] = T['narr1'] + dur('narr1') + 0.5
T['s1_end'] = T['narr2'] + dur('narr2') + 1.8
T['elv1'] = T['s1_end'] + 1.1
T['s2a_end'] = T['elv1'] + dur('elv1') + 0.3
T['elv2'] = T['s2a_end'] + 0.3
T['s2b_end'] = T['elv2'] + dur('elv2') + 0.3
T['elv3'] = T['s2b_end'] + 0.3
T['blow'] = T['elv3'] + dur('elv3') + 0.5
T['s2_end'] = T['blow'] + 1.1
T['mar1'] = T['s2_end'] + 1.0
T['steps'] = T['mar1'] + dur('mar1') + 0.4
T['beam'] = T['steps'] + 0.9
T['s3_end'] = T['steps'] + 2.3
T['tom1'] = T['s3_end'] + 0.5
T['stand'] = T['tom1'] + 0.6
T['s4a_end'] = T['tom1'] + dur('tom1') + 0.5
T['mar2'] = T['s4a_end'] + 0.3
T['s4b_end'] = T['mar2'] + dur('mar2') + 0.4
T['tom2'] = T['s4b_end'] + 0.3
T['glint'] = T['tom2'] + 1.6
T['insert'] = T['tom2'] + dur('tom2') + 0.3
T['hit'] = T['insert'] + 0.9
T['black'] = T['hit'] + 2.2
T['end_in'] = T['black'] + 0.4
T['total'] = T['end_in'] + 3.0

F = {k: int(round(v * FPS)) for k, v in T.items()}
N = F['total']
n = int(T['total'] * SR) + SR

# --- envolventes para sincronía labial ---
env = {'MARISOL': np.zeros(N), 'TOMAS': np.zeros(N), 'ELVIRA': np.zeros(N)}
cues = []
voice = np.zeros(n)
for i, l in L.items():
    a = load(i); s = int(T[i] * SR)
    voice[s:s + len(a)] += a * 0.9
    f0 = F[i]; f1 = int(round((T[i] + len(a) / SR) * FPS))
    if l['who'] in env:
        hop = SR // FPS
        r = np.array([np.sqrt(np.mean(a[k * hop:(k + 1) * hop] ** 2) + 1e-12) for k in range(len(a) // hop)])
        r = np.clip(r / (np.percentile(r, 90) + 1e-6), 0, 1.2)
        r = np.convolve(r, [0.25, 0.5, 0.25], mode='same')
        env[l['who']][f0:f0 + len(r)] = r[:max(0, N - f0)]
    cues.append({'from': f0 - 3, 'to': f1 + 10, 'who': None if l['who'] == 'NARR' else ('TOMÁS' if l['who'] == 'TOMAS' else l['who']),
                 'kind': 'dial' if l['who'] in ('MARISOL', 'TOMAS') else 'narr', 'text': l['text'].replace('...', '…')})

json.dump({'fps': FPS, 'total': N, 'f': F, 'cues': cues,
           'env': {k: [round(float(x), 3) for x in v] for k, v in env.items()}},
          open(f'{D}/../src/timeline.json', 'w'))

# ---------------- MÚSICA Y EFECTOS ----------------
rng = np.random.default_rng(7)
t = np.arange(n) / SR
L_ = np.zeros(n); R_ = np.zeros(n)
def lp(x, k):
    c = np.cumsum(np.insert(x, 0, 0)); y = (c[k:] - c[:-k]) / k
    return np.concatenate([np.full(k - 1, y[0]), y])
def env_at(t0, dur, atk=0.005, dec=3.0):
    e = np.zeros(n); i0 = int(t0 * SR); m = min(int(dur * SR), n - i0)
    tt = np.arange(m) / SR; e[i0:i0 + m] = np.minimum(tt / atk, 1) * np.exp(-tt / dec); return e
def add(sig, pan=0.0, g=1.0):
    global L_, R_
    L_ += sig * g * (1 - max(pan, 0)); R_ += sig * g * (1 + min(pan, 0))

# lluvia tras la ventana (interior)
nz = rng.standard_normal(n); rain_in = lp(nz, 30) * 2.4
add(rain_in * 0.04)
th = lp(lp(rng.standard_normal(n), 60), 60) * 60 * env_at(T['flash'] + 0.4, 3.0, 0.03, 1.0) * 0.18
add(th)
# música presente: pad grave
chord = [110.0, 130.81, 164.81]
pad = np.zeros(n)
for i, fq in enumerate(chord):
    pad += np.sin(2 * np.pi * fq * (1 + 0.004 * np.sin(2 * np.pi * (0.11 + i * 0.03) * t)) * t) + 0.3 * np.sin(2 * np.pi * 2 * fq * t)
pad *= np.clip(t / 3, 0, 1) * 0.04
def pluck(t0, fq, g=0.16, dec=1.6):
    e = env_at(t0, 5, 0.004, dec)
    return (np.sin(2 * np.pi * fq * t) + 0.45 * np.sin(2 * np.pi * 2 * fq * t) * np.exp(-np.clip(t - t0, 0, 9) * 1.5) + 0.2 * np.sin(2 * np.pi * 3 * fq * t)) * e * g
fb = ((t >= T['s1_end']) & (t < T['s2_end']))
music = pad * (1 - fb * 0.7)
for k, fq in enumerate([440, 523.25, 493.88, 440, 392, 440, 349.23, 329.63]):
    t0 = 0.8 + k * 1.6
    if t0 < T['s1_end'] - 0.5: music += pluck(t0, fq)
# caja de música en el flashback (Re mayor, aguda y dulce)
mb = [1174.66, 1479.98, 1760, 1479.98, 1318.51, 1174.66, 1318.51, 1479.98, 1174.66, 987.77, 1174.66, 1318.51, 1479.98, 1760, 1975.53, 1760, 1479.98, 1318.51]
for k, fq in enumerate(mb):
    t0 = T['s1_end'] + 0.4 + k * 0.62
    if t0 < T['blow'] - 0.2: music += pluck(t0, fq, 0.07, 0.9)
for t0 in np.arange(T['s1_end'] + 0.4, T['blow'], 2.48): music += pluck(t0, 293.66, 0.12, 2.5) + pluck(t0, 440, 0.06, 2.5)
# tensión al volver al presente
ten = np.zeros(n)
for fq in (55, 58.27): ten += np.sin(2 * np.pi * fq * t)
ten *= np.clip((t - T['steps']) / 2, 0, 1) * (t < T['hit']) * 0.08
music += ten
for t0, fq in [(T['mar1'], 110), (T['tom1'], 103.83), (T['tom2'], 98)]: music += pluck(t0, fq, 0.22, 3.0)
vact = lp(np.abs(voice), 4000); vact = np.clip(vact / (vact.max() * 0.25), 0, 1)
music *= 1 - 0.5 * vact
add(music)
# pluma rasgando el papel (flashback)
scr = lp(rng.standard_normal(n), 2) - lp(rng.standard_normal(n), 8)
scr *= (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 2.3 * t))) * ((t > T['s1_end'] + 0.6) & (t < T['blow'] - 0.4)) * 0.03
add(scr, 0.2)
# soplido a la vela
add(lp(rng.standard_normal(n), 25) * env_at(T['blow'], 0.6, 0.08, 0.15) * 1.6, 0, 0.5)
# papeles
for t0 in (2.2, T['s2_end'] + 0.4, T['stand'] + 0.1):
    w = lp(rng.standard_normal(n), 6) - lp(rng.standard_normal(n), 60); add(w * env_at(t0, 0.5, 0.05, 0.15) * 0.25)
# pasos acercándose en madera + puerta
for k, t0 in enumerate(np.arange(T['steps'], T['s3_end'] + 0.2, 0.5)):
    g = 0.08 + k * 0.03
    add(np.sin(2 * np.pi * 90 * t) * env_at(t0, 0.2, 0.002, 0.05) * 0.5 * g * 4 + lp(rng.standard_normal(n), 60) * env_at(t0, 0.1, 0.001, 0.03) * 3 * g, -0.3)
add(lp(rng.standard_normal(n), 10) * env_at(T['beam'] - 0.15, 0.08, 0.001, 0.02) * 2.5, 0, 0.3)  # clic linterna
# silla al levantarse
add(lp(rng.standard_normal(n), 40) * env_at(T['stand'], 0.5, 0.05, 0.15) * 3 * np.sin(2 * np.pi * 7 * t), 0, 0.2)
# destello del reloj
for fq in (3520, 4698): add(np.sin(2 * np.pi * fq * t) * env_at(T['glint'], 1.0, 0.01, 0.35) * 0.03)
# latido antes del golpe
for k, t0 in enumerate(np.arange(T['tom2'], T['hit'] - 0.2, 0.8)):
    for d in (0.0, 0.22): add(np.sin(2 * np.pi * 55 * t) * env_at(t0 + d, 0.4, 0.004, 0.12) * (0.2 + k * 0.04))
# whoosh del inserto
w = lp(rng.standard_normal(n), 20); w = w - lp(w, 200); add(w * np.exp(-((t - T['insert'] - 0.2) ** 2) / 0.04) * 0.12)
# GOLPE
h = T['hit']
boom = np.sin(2 * np.pi * (48 * np.clip(np.exp(-(t - h) * 1.5), 0.3, 1) * t)) * env_at(h, 3.0, 0.003, 0.9) * 0.7 * (t >= h)
add(boom); add(lp(rng.standard_normal(n), 4) * env_at(h, 1.0, 0.001, 0.18) * 0.5)
for dly, gv in ((0.09, 0.5), (0.21, 0.3), (0.37, 0.2)):
    sh = int(dly * SR); s2 = np.roll(boom, sh) * gv; s2[:sh] = 0; add(s2, 0, 0.6)
st = np.zeros(n)
for fq in (233.1, 277.2, 349.2, 415.3): st += np.sin(2 * np.pi * fq * t)
add(st * env_at(h, 4.0, 0.4, 2.2) * 0.045 * (t >= h))
for fq in (220, 261.63, 329.63): add(pluck(T['end_in'] + 0.2, fq, 0.12, 2.5))

# voces al centro
L_ += voice * 1.0; R_ += voice * 1.0
fade = np.minimum(np.minimum(t / 0.6, 1), np.clip((T['total'] + 0.2 - t) / 1.0, 0, 1))
L_ *= fade; R_ *= fade
L_ = np.tanh(L_ * 1.1) * 0.92; R_ = np.tanh(R_ * 1.1) * 0.92
pcm = (np.stack([L_, R_], 1)[:int(T['total'] * SR)] * 32767).astype(np.int16)
with wave.open(f'{D}/../audio/ep2_mix.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes())
print('frames', N, 'seg', round(T['total'], 2))
print({k: F[k] for k in F})
