"""Sound design for the 15 s "silent escape" meme: original, synthesized from scratch (no samples, no third-party audio).
Event times come from src/meme/cues.json so picture and sound share one clock.
    uv run --with numpy --with scipy python audio/make_meme.py   ->   public/audio/meme.wav
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

ROOT = Path(__file__).resolve().parent.parent
Q = json.loads((ROOT / "src/meme/cues.json").read_text())
SR = 48000
N = int(Q["duration"] * SR)
rng = np.random.default_rng(7)
out = np.zeros((N, 2))


def tt(d):
    return np.arange(int(d * SR)) / SR


def put(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    n = min(len(sig), N - i)
    l, r = gain * (1 - max(0, pan)), gain * (1 + min(0, pan))
    out[i:i + n, 0] += sig[:n] * l
    out[i:i + n, 1] += sig[:n] * r


def env(n, a=0.003, d=0.2, sustain=0.0, curve=3.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), np.exp(-(t - a) * curve / max(d, 1e-3)))
    return np.maximum(e, sustain)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def tone(f, d, shape="sine", vib=0.0, glide=None):
    t = tt(d)
    fr = np.full_like(t, f) if glide is None else f + (glide - f) * (t / d)
    if vib:
        fr = fr * (1 + 0.012 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    if shape == "sine":
        return np.sin(ph)
    if shape == "square":
        return np.sign(np.sin(ph)) * 0.6
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    return np.sin(ph)


def pluck(f, d=0.25):
    x = tone(f, d, "saw") * 0.5 + tone(f * 2, d, "sine") * 0.3
    return lp(x, 900) * env(len(x), 0.002, d, curve=5)


def tick(pitch=1800, d=0.05):
    x = noise(d) * 0.4 + tone(pitch, d, "sine") * 0.6
    return x * env(len(x), 0.0008, d, curve=6)


def thud(f=70, d=0.35, g=1.0):
    x = tone(f * 1.8, d, "sine", glide=f * 0.55) * env(int(d * SR), 0.001, d, curve=5)
    return x * g


def whoosh(d=0.5, up=True):
    x = noise(d)
    y = lp(x, 400) + lp(x, 2500) * 0.4
    k = np.linspace(0, 1, len(x))
    e = np.sin(np.pi * (k if up else 1 - k)) ** 1.5
    return y * e


def hp(x, fc):
    return x - lp(x, fc)


# ---------------------------------------------------------------- 0 - 3.4  the sneak
put(noise(3.4) * 0.012, 0.0, 1.0)  # room tone
for k, f in enumerate([82.4, 87.3, 82.4, 98.0, 82.4, 87.3, 73.4, 82.4] * 2):
    at = Q["sneak"] + k * 0.32
    if at < Q["yell"] - 0.05:
        put(tick(1500 + 300 * (k % 2)), at + 0.16, 0.35, 0.3 if k % 2 else -0.3)  # tiptoe
for k in range(4):
    put(lp(hp(noise(0.35), 3000), 7000) * env(int(0.35 * SR), 0.06, 0.25, curve=4), Q["sneak"] + 0.5 + k * 0.7, 0.1)  # whispers

# ---------------------------------------------------------------- 3.4  the yell (air horn + "AAAH")
d = 0.95
horn = sum(tone(f, d, "saw", vib=6) for f in (349.2, 440.0, 523.3)) / 3
horn = lp(horn, 3200) * env(int(d * SR), 0.01, d, sustain=0.0, curve=2.2)
vox = tone(310, d, "saw", vib=5.5, glide=380)
vox = (lp(vox, 1300) - lp(vox, 350)) * env(int(d * SR), 0.01, d, curve=2.0)
put(horn, Q["yell"], 0.55)
put(vox, Q["yell"], 0.9)
put(thud(60, 0.5, 1.2), Q["yell"], 0.9)
put(noise(0.3) * env(int(0.3 * SR), 0.001, 0.2, curve=6), Q["yell"], 0.25)

# ---------------------------------------------------------------- 4.35  spotted: record scratch, "!" stab, silence
d = 0.45
sc = hp(noise(d), 600)
sc = lp(sc, 5000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * tt(d)))) * np.linspace(1, 0.1, int(d * SR))
put(sc, Q["spot"] - 0.08, 0.55)
for k, f in enumerate((880.0, 1174.7)):
    put(tone(f, 0.22, "square") * env(int(0.22 * SR), 0.002, 0.2, curve=4), Q["spot"] + 0.05 + k * 0.12, 0.35)
put(thud(48, 0.7, 1.4), Q["spot"] + 0.3, 0.8)

# ---------------------------------------------------------------- 5.9 the excuse picker, 7.0 the pick
for k in range(4):
    put(tone(660 * 2 ** (k / 6), 0.07, "square") * env(int(0.07 * SR), 0.001, 0.07, curve=5), Q["picker"] + 0.05 + [0.08, 0.22, 0.36, 0.5][k], 0.2)
put(whoosh(0.3, True), Q["picker"], 0.25)
for k in range(int((Q["pick"] - Q["picker"] - 1.4) / 0.2)):
    put(tick(1400, 0.02), Q["picker"] + 1.2 + k * 0.2, 0.07)  # timer
put(tone(1318.5, 0.15, "square") * env(int(0.15 * SR), 0.001, 0.12, curve=5), Q["pick"], 0.3)
put(thud(120, 0.2, 0.8), Q["pick"], 0.6)
put(whoosh(0.2, False), Q["pick"] + 0.05, 0.3)
# the line is shouted: a cheeky two-note stab
# 7.55 betrayed: a sharp gasp, then a "bruh" bass drop
g = lp(hp(noise(0.4), 1500), 6500) * np.sin(np.pi * np.linspace(0, 1, int(0.4 * SR))) ** 2
put(g, Q["betray"] - 0.05, 0.45)
put(tone(150, 0.5, "saw", glide=55) * env(int(0.5 * SR), 0.005, 0.5, curve=3) * 0.8, Q["betray"] + 0.1, 0.5)
for k, at in enumerate((Q["betray"] + 0.8, Q["betray"] + 1.12, Q["betray"] + 1.44)):
    put(thud(58, 0.3, 1.0), at, 0.55 + 0.1 * k)  # teacher stomps over

# ---------------------------------------------------------------- 9.0  escape: jaunty run, arrival fanfare
for k in range(10):
    put(tick(1200 + 100 * (k % 2), 0.04), Q["out"] + 0.05 + k * 0.115, 0.3, -0.2 if k % 2 else 0.2)  # sprint
arr = Q["out"] + 2 * 60 / Q["bpm"]
put(thud(80, 0.3, 1.0), arr, 0.6)
for k in range(12):
    put(tone(1800 + 700 * rng.random(), 0.12, "sine") * env(int(0.12 * SR), 0.001, 0.12, curve=6), arr + 0.05 + k * 0.07, 0.07, rng.uniform(-0.6, 0.6))

# ---------------------------------------------------------------- detention: scribbling, award stamp
dt = Q["detention"]
put(whoosh(0.3, True), dt - 0.2, 0.4)
for k in range(11):
    put(lp(hp(noise(0.06), 2000), 6000) * env(int(0.06 * SR), 0.003, 0.05, curve=5), dt + 0.3 + k * 0.11, 0.12, (-1) ** k * 0.3)
put(thud(75, 0.35, 1.2), dt + 0.55, 0.8)  # MOST BETRAYED stamp
put(tone(1568, 0.25, "square") * env(int(0.25 * SR), 0.001, 0.25, curve=4), dt + 0.55, 0.12)

# ---------------------------------------------------------------- 13.3 end card
e0 = Q["end"]
put(thud(62, 0.45, 1.3), e0, 0.6)
bt = 60 / Q["bpm"]
put(thud(70, 0.35, 1.0), e0 + bt, 0.4)  # MASTER
for f, beats in ((1174.7, 3.0), (1396.9, 3.5), (1760.0, 4.0)):  # WINDOWS, MAC, ONLINE pop, in key (Dm)
    put(tone(f, 0.09, "sine") * env(int(0.09 * SR), 0.001, 0.09, curve=5), e0 + beats * bt, 0.22)
stamp = Q["end"] + 5 * 60 / Q["bpm"]
put(thud(70, 0.45, 1.3), stamp, 0.6)
put(tone(2093, 0.4, "sine") * env(int(0.4 * SR), 0.001, 0.4, curve=4), stamp + 0.02, 0.12)

# ---------------------------------------------------------------- music (audio/meme_music.py)
exec(compile((ROOT / "audio/meme_music.py").read_text(), "meme_music.py", "exec"))

# ---------------------------------------------------------------- master
out[:, 0] = np.tanh(out[:, 0] * 1.1)
out[:, 1] = np.tanh(out[:, 1] * 1.1)
peak = np.max(np.abs(out))
out *= 0.9 / peak
fade = np.minimum(1, (N - np.arange(N)) / (0.25 * SR))
out *= fade[:, None]
pcm = (out * 32767).astype("<i2")
path = ROOT / "public/audio/meme.wav"
with wave.open(str(path), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", path, f"peak {peak:.2f}")
