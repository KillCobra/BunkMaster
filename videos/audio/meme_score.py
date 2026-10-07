"""Bunk Master meme score: the trailer's own tune (audio/make_music.py), re-arranged for the meme.

128 BPM, 10 bars = 18.75 s. D minor, i VI III VII (Dm Bb F C), one chord per bar: Dm Bb F C | Dm Bb F C | Dm, C, Dm.
Same instruments and the same hook as the trailer (they are exec'd straight from make_music.py, so they cannot drift).

Arrangement (cut points in src/meme/cues.json sit on these beats and bars):
  bars 0-1  sneak     pizzicato bass, a soft pad opening up, a ticking clock; bar 1 builds: kick, hats, riser, snare roll,
                      and the first four hook notes answer the pad. YELL = the downbeat of bar 2.
  bars 2-3  drop      the full groove: four on the floor, claps, bass, supersaw stabs, the chip-lead hook with its echo
  bar 4     drop      open hats come in; riser + snare roll in its last beats lift into the escape
  bar 5     drop 2    ESCAPE on the downbeat: impact, crash, an arpeggio joins the groove
  bars 6-7  lift      half-time, sustained chords, arp blips, one long riser and a roll (sad Kenji rides this)
  bar 8     logo      impact + crash, then the final Dm chord rings out (COMING SOON lands on beat 1) and fades

Run via audio/make_meme.py (it reads MUSIC from here). Standalone: uv run --with numpy --with scipy python audio/meme_score.py
"""
import json
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
Q = json.loads((ROOT / "src/meme/cues.json").read_text())

# the trailer's instruments (Bus, kick, clap, snare, hat, crash, pizz, bass, supersaw, chip_lead, blip, riser, whoosh, impact, tick, ...)
_src = (ROOT / "audio/make_music.py").read_text()
exec(compile(_src[: _src.index("# ----------------------------------------------------------------------------- arrangement")], "make_music(head)", "exec"), globals())

BARS = 10
LENGTH = BARS * BAR  # 16.875 s
N = int(round(LENGTH * SR))
assert abs(LENGTH - Q["duration"]) < 1e-6, "cues.json duration must be 10 bars"

drums, bassb, chords, lead, fx, pads = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()
kicks = []

A = lambda i, beat=1, frac=0.0: at(i + 1, beat, frac)  # 0-based bar index

DM, BB, F, C = [62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]
PROG = [DM, BB, F, C]
ROOTS = [38, 34, 41, 36]
HOOK = [
    [(0, 2, 74), (3, 1, 77), (4, 2, 81), (6, 2, 79), (8, 2, 77), (10, 1, 76), (11, 1, 77), (12, 4, 74)],
    [(0, 2, 70), (2, 2, 74), (4, 2, 77), (7, 1, 74), (8, 3, 77), (11, 1, 79), (12, 4, 81)],
    [(0, 2, 81), (3, 1, 84), (4, 2, 81), (6, 2, 79), (8, 2, 77), (10, 2, 79), (12, 4, 81)],
    [(0, 2, 79), (2, 2, 76), (4, 2, 72), (6, 2, 76), (8, 2, 79), (10, 2, 84), (12, 2, 81), (14, 2, 79)],
]
S16 = BEAT / 4


def K(t, big=False, g=1.0):
    drums.add(t, kick(big), g)
    kicks.append(t)


def hat_bar(i, g_on=0.18, g_off=0.42, opens=False):
    for k in range(8):
        drums.add(A(i, 1 + k // 2, 0.5 * (k % 2)), hat(opens and k % 2 == 1), g_off if k % 2 else g_on, pan=0.25)


def groove(i, full=True, arp=False, lead_on=True, open_hats=False):
    ci = i % 4
    for beat in range(1, 5):
        K(A(i, beat))
    for beat in (2, 4):
        drums.add(A(i, beat), clap(), 0.62)
    hat_bar(i, opens=open_hats)
    if full:
        for k in range(16):
            if k % 4 == 2:
                continue
            drums.add(A(i, 1 + k // 4, 0.25 * (k % 4)), hat(), 0.12, pan=-0.35)
    r = ROOTS[ci]
    for k in range(8):
        bassb.add(A(i, 1 + k // 2, 0.5 * (k % 2)), bass(r + (12 if k % 2 else 0), BEAT * 0.48), 0.55)
    for beat in range(1, 5):
        l, rr = supersaw([n + 12 for n in PROG[ci]] + [PROG[ci][0]], BEAT * 0.42, cutoff=5500)
        e = env(len(l), 0.003, 0.12, 0.35, 0.05)
        chords.add(A(i, beat, 0.5), l * e, 0.30, pan=-0.7)
        chords.add(A(i, beat, 0.5), rr * e, 0.30, pan=0.7)
    if lead_on:
        for step, ln, m in HOOK[ci]:
            lead.add(A(i, 1 + step // 4, 0.25 * (step % 4)), chip_lead(m, S16 * ln * 0.92), 0.26, pan=-0.1)
            lead.add(A(i, 1 + step // 4, 0.25 * (step % 4) + 0.75), chip_lead(m, S16 * ln * 0.8), 0.07, pan=0.5)  # dotted-8th echo
    if arp:
        notes = [n + 12 for n in PROG[ci]]
        for k in range(16):
            lead.add(A(i, 1 + k // 4, 0.25 * (k % 4)), blip(notes[k % 3] + (12 if k % 6 > 2 else 0), S16 * 0.9, 0.125), 0.10, pan=0.45 * (1 if k % 2 else -1))


def snare_roll(i, beat0, steps16, steps32, g0=0.3):
    """16ths over `steps16` notes starting at beat0, then 32nds, crescendo."""
    k = 0
    for j in range(steps16):
        drums.add(A(i, beat0, 0.25 * j), snare(), g0 + 0.05 * k)
        k += 1
    for j in range(steps32):
        drums.add(A(i, beat0 + 1, 0.125 * j), snare(), g0 + 0.05 * k)
        k += 1


# ---- bars 0-1: the sneak -----------------------------------------------------------------------------------------
SNEAK = [[38, None, 41, None, 43, None, 44, 45], [None, 45, None, 44, 43, None, 41, None]]
for i in (0, 1):
    for k, m in enumerate(SNEAK[i]):
        if m is not None:
            bassb.add(A(i, 1 + k // 2, 0.5 * (k % 2)), pizz(m + 12, BEAT * 0.45), 0.6)
    for b in range(4):
        fx.add(A(i, b + 1), tick(b % 2 == 0), 0.4, pan=0.3 if b % 2 else -0.3)
pl, pr = supersaw([50, 57, 62, 65], BAR * 2, cutoff=900, voices=4, spread=0.12)
fade = np.clip(np.arange(len(pl)) / (SR * 1.0), 0, 1)
pads.add(A(0), sweep_lp(pl, 500, 3500, curve=2.5) * fade, 0.18, pan=-0.6)
pads.add(A(0), sweep_lp(pr, 500, 3500, curve=2.5) * fade, 0.18, pan=0.6)
# bar 1 builds into the yell
for beat in (1, 3):
    K(A(1, beat), g=0.9)
hat_bar(1, 0.25, 0.5)
drums.add(A(1, 2), clap(), 0.5)
drums.add(A(1, 4), clap(), 0.5)
for k, m in enumerate([74, 77, 81, 79]):
    lead.add(A(1, 1 + k), chip_lead(m, BEAT * 0.4, vib=False), 0.2, pan=0.2)  # the hook's first notes, as a question
fx.add(A(1, 1), riser(BAR - BEAT * 0.1), 0.5)
snare_roll(1, 3, 4, 6, 0.3)

# ---- bars 2-4: the drop (YELL on the downbeat of bar 2) --------------------------------------------------------
drums.add(A(2), impact(), 0.85)
drums.add(A(2), crash(), 0.85)
groove(2)
groove(3)
groove(4, open_hats=True)
drums.add(A(4), crash(1.4), 0.25)
# the last beats of bar 4 lift into the escape: riser, then a roll
fx.add(A(4, 2), riser(BEAT * 3 - 0.02), 0.5)
snare_roll(4, 4, 4, 0, 0.35)
w, pk = whoosh(0.45)
fx.add(A(5) - pk, w, 0.9)

# ---- bar 5: drop 2 (ESCAPE on the downbeat) ------------------------------------------------------------------------
drums.add(A(5), impact(), 0.9)
drums.add(A(5), crash(), 0.85)
groove(5, arp=True, open_hats=True)

# ---- bars 6-7: the half-time lift (sad Kenji): chords sustain, the beat thins, a long riser and a roll ------------
for i in (6, 7):
    ci = i % 4
    K(A(i, 1))
    K(A(i, 3), g=0.8)
    drums.add(A(i, 3), clap(), 0.6)
    hat_bar(i, 0.12, 0.3)
    l, rr = supersaw([n + 12 for n in PROG[ci]] + [PROG[ci][0] - 12], BAR, cutoff=6000)
    e = env(len(l), 0.01, 0.6, 0.6, 0.1)
    chords.add(A(i), l * e, 0.34, pan=-0.7)
    chords.add(A(i), rr * e, 0.34, pan=0.7)
    r = ROOTS[ci]
    for k in range(4):
        bassb.add(A(i, 1 + k), bass(r + (12 if k % 2 else 0), BEAT * 0.9), 0.55)
    notes = [n + 12 for n in PROG[ci]]
    for k in range(16):
        lead.add(A(i, 1 + k // 4, 0.25 * (k % 4)), blip(notes[k % 3] + (12 if k >= 8 else 0), S16 * 0.9, 0.125), 0.12 + 0.004 * k, pan=0.45 * (1 if k % 2 else -1))
    drums.add(A(i), crash(1.4), 0.2 if i == 6 else 0.0)
fx.add(A(6, 1), riser(BAR * 2 - BEAT * 0.2), 0.5)
snare_roll(7, 3, 4, 7, 0.35)
w, pk = whoosh(0.7)
fx.add(A(8) - pk, w, 1.0)

# ---- bars 8-9: the end card. Bar 8 = impact, crash, the full groove with the Dm hook (BUNK, MASTER, tagline, WINDOWS,
# MAC land on its beats). Bar 9 beat 0 = ONLINE WITH FRIENDS over a pickup (C bass, snare roll, riser); the last Dm chord
# lands on bar 9 beat 1 (COMING SOON) and rings out to the fade.
drums.add(A(8), impact(), 1.0)
drums.add(A(8), crash(2.6), 0.9)
groove(8)
fx.add(A(8, 3), riser(BEAT * 3 - 0.02), 0.45)
# pickup: C (the VII chord) for one beat, then home
K(A(9, 1))
hat_bar(9, 0.18, 0.42)
for k in range(2):
    bassb.add(A(9, 1, 0.5 * k), bass(36 + (12 if k else 0), BEAT * 0.48), 0.55)
l, rr = supersaw([n + 12 for n in C] + [C[0]], BEAT * 0.42, cutoff=5500)
e = env(len(l), 0.003, 0.12, 0.35, 0.05)
chords.add(A(9, 1, 0.5), l * e, 0.30, pan=-0.7)
chords.add(A(9, 1, 0.5), rr * e, 0.30, pan=0.7)
for k, m in enumerate((79, 76)):
    lead.add(A(9, 1, 0.5 * k), chip_lead(m, S16 * 2), 0.26, pan=-0.1)
for j in range(4):
    drums.add(A(9, 1, 0.5 + 0.125 * j), snare(), 0.35 + 0.07 * j)
stamp = A(9, 2)
K(stamp, big=True)
drums.add(stamp, crash(3.0), 0.8)
l, rr = supersaw([50, 57, 62, 65, 69, 74], BAR * 1.2, cutoff=4500, voices=7)
e = env(len(l), 0.004, 0.7, 0.35, 0.8)
chords.add(stamp, l * e, 0.42, pan=-0.7)
chords.add(stamp, rr * e, 0.42, pan=0.7)
bassb.add(stamp, bass(38, BAR * 1.1) * env(int(SR * BAR * 1.1), 0.003, 0.8, 0.3, 0.6), 0.6)
lead.add(stamp, chip_lead(86, BEAT * 1.5), 0.24)
lead.add(stamp, chip_lead(74, BEAT * 3.0), 0.12, pan=0.3)


# ---- mix (the trailer's chain: sidechain, reverb, glue) ---------------------------------------------------------------
def sidechain(n, depth=0.65, release=0.13):
    g = np.ones(n)
    t = np.arange(n) / SR
    for tk in kicks:
        i = int(tk * SR)
        j = min(n, i + int(SR * 0.4))
        g[i:j] = np.minimum(g[i:j], 1 - depth * np.exp(-(t[i:j] - tk) / release))
    return g


def reverb(st, seconds=1.8, mix=0.18):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = noise(n) * np.exp(-t / (seconds / 5))
        ir = lp(ir, 6000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(fftconvolve(st[ch], ir)[: st.shape[1]])
    return np.stack(out) * mix


M = len(drums.l)
sc = sidechain(M)
dr = drums.stereo()
bs = bassb.stereo() * sc
ch = chords.stereo() * sc
pd = pads.stereo()
ld = lead.stereo()
fxx = fx.stereo()
wet = reverb(ch * 0.8 + ld * 0.9 + pd + fxx * 0.3, 2.2, 0.26)
wet = np.stack([lp(wet[0], 5000), lp(wet[1], 5000)])
mix = dr * 0.95 + bs * 0.9 + ch + pd + ld + fxx + wet
mix = np.stack([hp(mix[0], 28), hp(mix[1], 28)])
mix = mix[:, :N]
tail = np.ones(N)
f0 = int((LENGTH - 0.6) * SR)
tail[f0:] = np.linspace(1, 0, N - f0) ** 2
mix *= tail
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.35) / np.tanh(1.35)
mix *= 10 ** (-1.0 / 20)
MUSIC = mix.T.copy()  # (N, 2) float, peak about -1 dBFS

if __name__ == "__main__":
    path = ROOT / "public/audio/meme-music.wav"
    pcm = (np.clip(MUSIC, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", path, f"{LENGTH:.3f}s rms {20 * np.log10(np.sqrt(np.mean(MUSIC ** 2))):.1f} dBFS")
