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
T = {}
T['narr1'] = 0.8
T['lightning'] = 2.75
T['narr2'] = 3.2
T['title_in'] = 4.2
T['s1_end'] = 8.0
T['mar1'] = 8.5
T['s2a_end'] = T['mar1'] + len(load('mar1')) / SR + 0.35
T['aur1'] = T['s2a_end'] + 0.3
T['s2b_end'] = T['aur1'] + len(load('aur1')) / SR + 0.3
T['key_a'] = T['s2b_end'] + 0.15
T['key_b'] = T['key_a'] + 1.2
T['aur2'] = T['key_b'] + 0.1
T['s2_end'] = T['aur2'] + len(load('aur2')) / SR + 0.8
T['walk_a'] = T['s2_end'] + 0.1
T['narr3'] = T['s2_end'] + 0.6
T['walk_b'] = T['walk_a'] + 4.9
T['mar2'] = T['walk_b'] + 0.1
T['arm_a'] = T['mar2'] + len(load('mar2')) / SR + 0.1
T['insert'] = T['arm_a'] + 1.1
T['click'] = T['insert'] + 0.5
T['open_a'] = T['insert'] + 0.8
T['open_b'] = T['open_a'] + 1.9
T['s3_end'] = T['open_b'] + 0.4
T['enter_a'] = T['s3_end'] - 0.6
T['mar3'] = T['s3_end'] + 1.2
T['s4_close'] = T['mar3'] + len(load('mar3')) / SR + 0.7
T['paper_in'] = T['s4_close'] + 1.4
T['elv1'] = T['paper_in'] + 1.0
T['line2'] = T['elv1'] + 1.55
T['elv2'] = T['elv1'] + len(load('elv1')) / SR + 0.6
T['hit'] = T['elv2']
T['black'] = T['hit'] + len(load('elv2')) / SR + 1.4
T['end_in'] = T['black'] + 0.4
T['total'] = T['end_in'] + 3.0

F = {k: int(round(v * FPS)) for k, v in T.items()}
N = F['total']
n = int(T['total'] * SR) + SR

# --- envolventes para sincronía labial ---
env = {'MARISOL': np.zeros(N), 'AURELIO': np.zeros(N)}
cues = []
voice = np.zeros(n)
for i, l in L.items():
    a = load(i); s = int(T[i] * SR)
    voice[s:s + len(a)] += a * (0.9 if l['who'] != 'ELVIRA' else 1.0)
    f0 = F[i]; f1 = int(round((T[i] + len(a) / SR) * FPS))
    if l['who'] in env:
        hop = SR // FPS
        r = np.array([np.sqrt(np.mean(a[k * hop:(k + 1) * hop] ** 2) + 1e-12) for k in range(len(a) // hop)])
        r = np.clip(r / (np.percentile(r, 90) + 1e-6), 0, 1.2)
        r = np.convolve(r, [0.25, 0.5, 0.25], mode='same')
        env[l['who']][f0:f0 + len(r)] = r[:max(0, N - f0)]
    if l['who'] != 'ELVIRA':
        cues.append({'from': f0 - 3, 'to': f1 + 10, 'who': l['who'] if l['who'] != 'NARR' else None,
                     'kind': 'narr' if l['who'] == 'NARR' else 'dial', 'text': l['text'].replace('...', '…')})

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

# lluvia exterior / interior amortiguada
nz = rng.standard_normal(n); rain = nz - lp(nz, 6); rain_in = lp(nz, 40) * 2.2
gm = np.clip((t - T['s2_end'] + 0.3) / 0.6, 0, 1)
add(rain * (1 - gm) * 0.05 + rain_in * gm * 0.035)
add(np.roll(rain, 1500) * (1 - gm) * 0.02, 0.6)
# gotas en tejado del porche (escena 2)
for k in range(140):
    t0 = T['s1_end'] + rng.random() * (T['s2_end'] - T['s1_end'])
    add(lp(rng.standard_normal(n), 3) * env_at(t0, 0.05, 0.001, 0.01), rng.random() - 0.5, 0.05)

# música: pad en La menor + piano, con ducking bajo las voces
chord = [110.0, 130.81, 164.81, 220.0]
pad = np.zeros(n)
for i, fq in enumerate(chord):
    lfo = 1 + 0.004 * np.sin(2 * np.pi * (0.13 + i * 0.03) * t)
    pad += np.sin(2 * np.pi * fq * lfo * t) + 0.3 * np.sin(2 * np.pi * fq * 2 * t)
pad *= np.clip(t / 3, 0, 1) * 0.04 * (1 + 0.15 * np.sin(2 * np.pi * 0.1 * t))
pad *= 1 + np.clip((t - T['s3_end']) / 6, 0, 1) * 0.9
def pluck(t0, fq, g=0.16, dec=1.6):
    e = env_at(t0, 5, 0.004, dec)
    return (np.sin(2 * np.pi * fq * t) + 0.45 * np.sin(2 * np.pi * 2 * fq * t) * np.exp(-np.clip(t - t0, 0, 9) * 1.5) + 0.2 * np.sin(2 * np.pi * 3 * fq * t)) * e * g
music = pad.copy()
mel = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440, 523.25, 493.88, 440, 329.63, 392, 440, 329.63, 293.66, 329.63, 349.23, 329.63, 293.66, 261.63, 246.94]
for k, fq in enumerate(mel):
    t0 = 1.0 + k * 1.55
    if t0 < T['hit'] - 2: music += pluck(t0, fq)
for t0, fq in [(0.5, 110), (6.5, 87.31), (12.5, 98), (18.5, 110), (24.5, 87.31), (30.5, 98), (36.5, 110)]:
    music += pluck(t0, fq, 0.22, 3.0)
vact = lp(np.abs(voice), 4000); vact = np.clip(vact / (vact.max() * 0.25), 0, 1)
music *= 1 - 0.55 * vact
add(music)

# trueno
th = lp(lp(rng.standard_normal(n), 60), 60) * 60 * env_at(T['lightning'] + 0.1, 3.0, 0.02, 0.9) * 0.25
add(th)
# pasos exteriores (charcos) y pasos en madera
for t0 in np.arange(0.3, T['s1_end'] - 0.3, 0.6):
    add(lp(rng.standard_normal(n), 30) * env_at(t0, 0.15, 0.002, 0.04) * 2.0, 0, 0.15)
for t0 in np.arange(T['walk_a'], T['walk_b'], 0.55):
    s = np.sin(2 * np.pi * 95 * t) * env_at(t0, 0.2, 0.002, 0.05) * 0.5 + lp(rng.standard_normal(n), 60) * env_at(t0, 0.1, 0.001, 0.03) * 3
    add(s, 0, 0.22)
# crujido de duela al detenerse
add(np.sin(2 * np.pi * 180 * t * (1 + 0.1 * np.sin(2 * np.pi * 7 * t))) * env_at(T['walk_b'] + 0.1, 0.8, 0.1, 0.3) * 0.04)
# llave
def clink(t0, g=0.14):
    s = np.zeros(n)
    for fq in (2150, 3270, 4410, 5830): s += np.sin(2 * np.pi * fq * t) * np.exp(-np.clip(t - t0, 0, 9) * 14) * (t >= t0)
    return s * g
add(clink(T['key_a'] + 0.2)); add(clink(T['key_b'] - 0.1, 0.1), 0.2)
add(clink(T['arm_a'] + 0.3, 0.08))
# clic de cerradura
add(lp(rng.standard_normal(n), 12) * env_at(T['click'], 0.15, 0.001, 0.03) * 5, 0, 0.35); add(clink(T['click'] + 0.03, 0.18))
add(lp(rng.standard_normal(n), 20) * env_at(T['click'] + 0.18, 0.15, 0.001, 0.03) * 5, 0, 0.3)
# crujido de puerta
i0 = int(T['open_a'] * SR); m = int(2.0 * SR); tt = np.arange(m) / SR
ph = np.cumsum(2 * np.pi * (140 - 30 * tt / 2) / SR)
creak = (np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 3.1) * 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)) * np.minimum(tt / 0.2, 1) * np.exp(-tt / 1.6) * 0.06
sig = np.zeros(n); sig[i0:i0 + m] = creak; add(sig, 0.1)
shim = np.zeros(n)
for fq in (880, 1320, 1760, 2640):
    shim += np.sin(2 * np.pi * fq * t) * np.clip((t - T['open_a'] - 0.4) / 1.2, 0, 1) * np.exp(-np.clip(t - T['open_a'] - 0.4, 0, 99) / 2.5)
add(shim * 0.022)
# papeles en el aire
pap = lp(rng.standard_normal(n), 3) - lp(rng.standard_normal(n), 30)
pap *= (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) * ((t > T['s3_end']) & (t < T['s4_close'] + 1)) * 0.018
add(pap)
# latido
for k, t0 in enumerate(np.arange(T['elv1'] + 0.5, T['hit'] - 0.3, 0.85)):
    for d in (0.0, 0.22): add(np.sin(2 * np.pi * 55 * t) * env_at(t0 + d, 0.4, 0.004, 0.12) * (0.22 + k * 0.03))
# whoosh de la carta
w = lp(rng.standard_normal(n), 20); w = w - lp(w, 200); add(w * np.exp(-((t - T['paper_in'] - 0.4) ** 2) / 0.05) * 0.12)
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
with wave.open(f'{D}/../audio/ep1_mix.wav', 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes())
print('frames', N, 'seg', round(T['total'], 2))
print({k: F[k] for k in F})
