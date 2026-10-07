// "Silent escape" meme, 15 s, 9:16. In-game 3D (the game's voxel classroom and compound, its HUD pieces and its real
// strings) cut like a meme: setup, the friend with one job, the teacher spins, "It was Kenji!", escape, detention.
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { useTime } from "../kit/time";
import { step } from "../kit/spring";
import { VStage, vToScreen, type Cam } from "../reel/VStage";
import { Burst, Flash, Shockwave, slam } from "../filmv/fxui";
import { C } from "../film/tokens";
import { Button, font, NameTag, Outlined } from "../film/ui";
import { ease, impulse, noise1, outCubic, outExpo, POP, sp, JELLY, SNAP, shake } from "../film/fx";
import { ComingSoon } from "../film/acts/Finale";
import { Cloud, Voxels, voxelBounds } from "../film/voxel";
import { EXCUSES } from "../steam/dodge/ui";
import { Alert } from "../launch/ui";
import type { V3 } from "../launch/voxel";
import { ARRIVE, BEAT, ClassWorld, DetentionWorld, hero, kenji, OutsideWorld, Q, Ring3D, teacher } from "./world";

export const W = 1080;
export const H = 1920;
export const DURATION = Q.duration;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => u * u * (3 - 2 * u);
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const INK = C.ink;

// ---------------------------------------------------------------- cameras (pure functions of t)
export function cam(t: number): Cam {
  if (t < Q.yell) {
    const u = smooth(clamp01(t / Q.yell));
    return { pos: mix3([2.6, 4.6, -8.8], [2.4, 4.0, -7.2], u), look: mix3([2.2, 0.8, 1.6], [2.8, 0.9, 1.3], u), fov: lerp(66, 58, u) };
  }
  if (t < Q.spot) {
    const k = kenji(t).p;
    const u = clamp01((t - Q.yell) / (Q.spot - Q.yell));
    return { pos: [k[0] - 1.7, 1.25, Math.min(k[2] + 4.3, 4.0)], look: [k[0], 1.35, k[2]], fov: lerp(38, 33, u) };
  }
  if (t < Q.picker) {
    // from the back of the class, over the heads that swing round, into the teacher's face
    const zoom = smooth(clamp01((t - Q.spot) / (Q.picker - Q.spot)));
    return { pos: [-0.3, 1.75, -3.4], look: [-0.85, 1.55, 3.85], fov: lerp(40, 17, zoom) };
  }
  if (t < Q.out) {
    const u = smooth(clamp01((t - Q.picker) / 0.4));
    const drift = clamp01((t - Q.picker) / (Q.out - Q.picker));
    return { pos: mix3([2.6, 1.9, 4.0], [1.2, 1.9, 4.15], drift * 0.6), look: [3.0, 1.0 - u * 0.2, 0.8], fov: 54 };
  }
  if (t < Q.detention) {
    const u = clamp01((t - Q.out) / (Q.detention - Q.out));
    return { pos: [-0.2, 1.2 + u * 0.1, 13.8 - u * 0.6], look: [0.35, 1.5, 3.0], fov: 50 };
  }
  const u = clamp01((t - Q.detention) / (Q.end - Q.detention));
  return { pos: mix3([-3.4, 1.6, 4.6], [-2.8, 1.55, 4.1], smooth(u)), look: mix3([-1.6, 1.0, 1.0], [-1.75, 0.72, 0.94], smooth(u)), fov: lerp(46, 40, smooth(u)) };
}

// ---------------------------------------------------------------- small 2D pieces
/** Meme caption: white game-font text with a thick ink outline, slammed in on the cut. */
const Caption: React.FC<{ t: number; a: number; b: number; lines: string[]; size?: number; top?: number }> = ({ t, a, b, lines, size = 92, top = 270 }) => {
  if (t < a || t >= b) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ scale: `${slam(t, a + i * 0.1, 1.9, 0.2)}`, opacity: t >= a + i * 0.1 ? 1 : 0 }}>
          <Outlined size={size} color="#fff" stroke={INK} strokeWidth={size * 0.2}>{l}</Outlined>
        </div>
      ))}
    </div>
  );
};

const Label: React.FC<{ t: number; at: number; x: number; y: number; children: React.ReactNode; bg?: string; color?: string; size?: number }> = ({ t, at, x, y, children, bg = "rgba(26,20,31,0.85)", color = "#fff", size = 44 }) => {
  const s = sp(t, at, JELLY);
  if (s <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: `${s}` }}>
      <NameTag bg={bg} color={color} size={size}>{children}</NameTag>
    </div>
  );
};

const head = (p: V3, h = 2.0): V3 => [p[0], p[1] + h, p[2]];

// ---------------------------------------------------------------- the three classroom shots (3D + their overlays)
const RINGS = { whisper: "#7fe0a0", talk: "#ff9a3c", yell: "#e0524f" };

const ClassShot: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const h = hero(t), k = kenji(t), te = teacher(t);
  // voice rings on the floor
  const pulse = 0.5 + 0.5 * Math.sin(t * 7.2 * 1.0);
  const yellU = clamp01((t - Q.yell) / 0.9);
  const rings = (
    <>
      {t < Q.yell + 0.05 ? (
        <>
          <Ring3D x={h.p[0]} z={h.p[2]} r={1.3 + 0.2 * pulse} color={RINGS.whisper} opacity={t > Q.sneak ? 0.8 : 0} />
          <Ring3D x={k.p[0]} z={k.p[2]} r={1.3 + 0.2 * (1 - pulse)} color={RINGS.whisper} opacity={t > Q.sneak + 0.25 ? 0.8 : 0} />
        </>
      ) : null}
      {t >= Q.yell ? (
        <>
          <Ring3D x={k.p[0]} z={k.p[2]} r={16.5 * outExpo(yellU)} color={RINGS.yell} opacity={(1 - yellU * 0.7) * 0.95} width={0.35} />
          <Ring3D x={k.p[0]} z={k.p[2]} r={8 * outExpo(clamp01(yellU * 1.4))} color={RINGS.talk} opacity={(1 - yellU) * 0.8} width={0.25} />
        </>
      ) : null}
    </>
  );
  const hs = vToScreen(c, head(h.p, 2.05));
  const ks = vToScreen(c, head(k.p, 2.05));
  const ts = vToScreen(c, head([te.p[0], 0.08, te.p[2]], 2.35));
  const yellLabel = slam(t, Q.yell, 3.0, 0.24);
  return (
    <>
      <VStage cam={c} bg="#cfd8e3" fog={[14, 40]} dir={[6, 14, -6]} sun={1.7} amb={1.05} size={11}>
        <ClassWorld t={t} rings={rings} />
      </VStage>
      {/* A: name tags and the whisper label */}
      {t < Q.yell && t > Q.stand ? (
        <>
          <Label t={t} at={0.4} x={hs.x} y={hs.y - 30} size={46}>You</Label>
          <Label t={t} at={0.55} x={ks.x} y={ks.y - 30} size={46}>Kenji</Label>
          <Label t={t} at={1.1} x={hs.x} y={hs.y + 560} bg={RINGS.whisper} color={INK} size={48}>WHISPER</Label>
        </>
      ) : null}
      {/* B: the yell */}
      {t >= Q.yell && t < Q.spot ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1130, display: "flex", justifyContent: "center", scale: `${yellLabel}`, rotate: `${-5 + noise1(t * 30, 3) * 2}deg` }}>
          <Outlined size={300} color={RINGS.yell === "" ? "#fff" : "#ff5a4a"} stroke={INK} strokeWidth={50}>YELL</Outlined>
        </div>
      ) : null}
      {t >= Q.yell && t < Q.spot ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 930, display: "flex", justifyContent: "center", scale: `${slam(t, Q.yell + 0.08, 2.4, 0.22)}`, rotate: "3deg" }}>
          <Outlined size={112} color="#fff" stroke={INK} strokeWidth={22}>WE'RE FREEEE!!!</Outlined>
        </div>
      ) : null}
      {/* C: the teacher turns */}
      {t >= Q.spot && t < Q.picker ? <Alert t={t} at={Q.spot + 0.05} x={ts.x} y={ts.y} kind="!" size={330} /> : null}
      {t >= Q.spot && t < Q.picker ? (
        <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 220px 70px rgba(255,40,40,${0.5 * clamp01((t - Q.spot) / 0.15)})`, pointerEvents: "none" }} />
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------- the excuse picker (game's strings, Kenji gets the blame)
const ROWS = [0.08, 0.22, 0.36, 0.5]; // rows land slowly so every line can be read before the pick
const Picker: React.FC<{ t: number }> = ({ t }) => {
  const at = Q.picker + 0.05;
  const rise = sp(t, at, { stiffness: 420, damping: 24 });
  if (rise <= 0.001) return null;
  const picked = t >= Q.pick;
  const d = t - Q.pick;
  const drop = picked ? clamp01((d - 0.1) / 0.18) : 0;
  if (drop >= 1) return null;
  const left = 1 - clamp01((t - at) / (Q.pick - at + 0.5));
  const lines = EXCUSES.map((e) => (e.kind === "snitch" ? { ...e, text: e.text.replace("Arjun", "Kenji") } : e));
  const ROW_COL = { proof: "#7fe0a0", talk: "#ffffff", snitch: "#ff6a8a" };
  return (
    <div style={{ position: "absolute", left: 66, top: 1000, width: 948, translate: `0 ${(1 - rise) * 1000 + drop * drop * 1000}px`, rotate: `${(1 - Math.min(1, rise)) * 5 + drop * 8}deg` }}>
      <div style={{ padding: "30px 28px 32px", borderRadius: 34, background: "rgba(26,13,13,0.95)", border: `8px solid ${INK}`, boxShadow: `0 16px 0 ${INK}` }}>
        <div style={{ ...font, fontSize: 66, color: "#ff9a7a", WebkitTextStroke: "6px #000", paintOrder: "stroke fill" }}>MS. OKAFOR STOPPED YOU!</div>
        <div style={{ ...font, fontSize: 48, color: "rgba(255,255,255,0.8)", marginTop: 8 }}>Talk your way out:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 22 }}>
          {lines.map((e, i) => {
            const rt = at + ROWS[i];
            const s = sp(t, rt, POP);
            const isChosen = picked && i === 3;
            const pop = isChosen ? 1 + 0.16 * Math.exp(-d * 10) * Math.cos(d * 30) : 1;
            const gone = picked && !isChosen ? 0.65 * clamp01(d / 0.06) : 0;
            return (
              <div key={i} style={{ opacity: t < rt ? 0 : clamp01(s * 3) * (1 - gone), translate: `${Math.max(0, 1 - s) * 260}px 0`, scale: `${pop}`, transformOrigin: "0% 50%" }}>
                <span style={{ ...font, fontSize: 50, color: ROW_COL[e.kind], WebkitTextStroke: "4px #000", paintOrder: "stroke fill", background: isChosen ? "rgba(255,106,138,0.28)" : undefined, borderRadius: 12, padding: "6px 12px 2px", marginLeft: -12 }}>
                  {`[${i + 1}]  ${e.text}`}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ height: 16, background: "rgba(255,255,255,0.12)", marginTop: 22, borderRadius: 4 }}>
          <div style={{ width: `${left * 100}%`, height: "100%", background: "#ff6a5a", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
};

const Betrayal: React.FC<{ t: number }> = ({ t }) => {
  if (t < Q.shout || t >= Q.out) return null;
  const c = cam(t);
  const h = hero(t), k = kenji(t);
  const hs = vToScreen(c, head(h.p, 2.1));
  const ks = vToScreen(c, head(k.p, 2.1));
  const s = sp(t, Q.shout, JELLY);
  const shakeX = 6 * Math.sin((t - Q.shout) * 70) * Math.exp(-(t - Q.shout) * 6);
  const out = ease(t, Q.out - 0.25, 0.2, (u) => u * u);
  return (
    <div style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", left: clamp(hs.x + shakeX, 330, 750), top: 1010, translate: "-50% 0", scale: `${Math.max(0, s)}`, rotate: `${-3 + (1 - Math.min(1, s)) * -14}deg`, transformOrigin: "50% 0%" }}>
        <div style={{ position: "relative", background: "#fff", border: `8px solid ${INK}`, borderRadius: 40, padding: "24px 40px 16px", boxShadow: `0 14px 0 ${INK}`, textAlign: "center" }}>
          <div style={{ ...font, fontSize: 112, lineHeight: 0.9, color: INK }}>It was Kenji!</div>
          <div style={{ ...font, fontSize: 56, color: "#c83a52", marginTop: 6 }}>They made me do it!</div>
        </div>
      </div>
      <Alert t={t} at={Q.betray} x={ks.x} y={ks.y} kind="!" size={200} />
      <Label t={t} at={Q.betray + 0.2} x={ks.x} y={ks.y + 640} bg="#ffc93c" color={INK} size={70}>WHO, ME?!</Label>
    </div>
  );
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- escape + detention + end card
const Escape: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const arrive = Q.out + ARRIVE;
  const banner = sp(t, arrive, { stiffness: 420, damping: 22 });
  return (
    <>
      <VStage cam={c} bg="#8dd0ef" fog={[18, 60]} dir={[8, 16, 6]} sun={1.9} amb={1.05} size={14}>
        <OutsideWorld t={t} />
      </VStage>
      {t >= arrive ? (
        <div style={{ position: "absolute", left: 60, right: 60, top: 1200, translate: `0 ${(1 - banner) * 600}px` }}>
          <div style={{ background: "#48b06a", borderRadius: 30, padding: "30px 36px", boxShadow: "0 14px 0 #2a6e42", textAlign: "center" }}>
            <div style={{ ...font, fontSize: 70, color: "#fff" }}>YOU ESCAPED THE UNIVERSITY!   0:47</div>
            <div style={{ ...font, fontSize: 56, color: "#e8ffe8", marginTop: 10 }}>Enjoy your chai.</div>
          </div>
        </div>
      ) : null}
      <Burst t={t} at={arrive} x={W / 2} y={1000} colors={[C.gold, "#fff", C.green, C.purple]} seed={31} power={1500} n={24} size={22} />
    </>
  );
};

const Detention: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const d = t - Q.detention;
  const card = sp(t, Q.detention + 0.1, { stiffness: 420, damping: 22 });
  const award = slam(t, Q.detention + 0.55, 2.6, 0.25);
  const secs = Math.max(0, 299 - Math.floor(d * 7));
  return (
    <>
      <VStage cam={c} bg="#cfd8e3" fog={[12, 40]} dir={[6, 14, 6]} sun={1.7} amb={1.05} size={9}>
        <DetentionWorld t={t} />
      </VStage>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1200, translate: `0 ${(1 - card) * 700}px` }}>
        <div style={{ background: "#f2a93b", borderRadius: 30, padding: "26px 34px", boxShadow: "0 14px 0 #9a6618" }}>
          <div style={{ ...font, fontSize: 76, color: INK }}>DETENTION   {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</div>
          <div style={{ ...font, fontSize: 44, color: INK, opacity: 0.85, marginTop: 8 }}>Type your lines (-5 s each).</div>
        </div>
      </div>
      {d > 1.5 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 520, display: "flex", justifyContent: "center", scale: `${slam(t, Q.detention + 1.5, 2.0, 0.22)}`, rotate: "-2deg" }}>
          <div style={{ background: "#fff", border: `8px solid ${INK}`, borderRadius: 40, padding: "20px 44px 12px", boxShadow: `0 14px 0 ${INK}` }}>
            <div style={{ ...font, fontSize: 112, color: INK }}>I trusted you.</div>
          </div>
        </div>
      ) : null}
      {d > 0.5 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1470, display: "flex", justifyContent: "center", scale: `${award}`, rotate: "-4deg" }}>
          <div style={{ background: "#ffc93c", border: `8px solid ${INK}`, borderRadius: 24, padding: "14px 30px", boxShadow: `0 12px 0 ${INK}`, textAlign: "center" }}>
            <div style={{ ...font, fontSize: 84, color: INK }}>MOST BETRAYED</div>
            <div style={{ ...font, fontSize: 46, color: INK }}>Kenji · blamed by friends 1 time(s)</div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const A = 30;
const HERO_BOX = voxelBounds("hero", A);
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const d = t - Q.end;
  const drift = d * 40;
  const bob = Math.sin(d * 5) * 6;
  // everything lands on a beat: BUNK 0, MASTER 1, tagline 2, WINDOWS 3, MAC 3.5, ONLINE WITH FRIENDS 4, COMING SOON 5
  const at = (beats: number) => Q.end + beats * BEAT;
  const stampAt = at(5);
  const chips = [
    { text: "WINDOWS", color: C.orange, at: at(3) },
    { text: "MAC", color: C.purple, at: at(3.5) },
    { text: "ONLINE WITH FRIENDS", color: C.green, at: at(4) },
  ];
  const tag = sp(t, at(2), POP);
  const kick = 1 + 0.02 * [0, 1, 2, 3, 4, 5, 6, 7].reduce((acc, k) => acc + impulse(t, at(k), 0.1), 0);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.sky, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <Cloud a={30} w={5} x={260 - drift} y={170} />
        <Cloud a={22} w={4} x={900 - drift * 0.6} y={130} o={0.9} />
        <Cloud a={18} w={3} x={1100 - drift * 0.4} y={1000} o={0.8} />
      </svg>
      <div style={{ position: "absolute", left: W / 2 - HERO_BOX.w / 2 - 20, top: 1695 - HERO_BOX.h / 2 + bob, scale: `${sp(t, Q.end, JELLY) * kick}` }}>
        <Voxels scene="hero" a={A} width={HERO_BOX.w + 40} height={HERO_BOX.h + 40} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 235, display: "flex", flexDirection: "column", alignItems: "center", scale: `${kick}` }}>
        <div style={{ scale: `${slam(t, at(0), 3, 0.28)}` }}><Outlined size={310} strokeWidth={46} style={{ letterSpacing: 4 }}>BUNK</Outlined></div>
        <div style={{ marginTop: -60, scale: `${slam(t, at(1), 3, 0.28)}`, opacity: t >= at(1) ? 1 : 0 }}><Outlined size={310} strokeWidth={46} style={{ letterSpacing: 4 }}>MASTER</Outlined></div>
        <div style={{ ...font, fontSize: 70, color: INK, marginTop: 18, opacity: clamp01(tag * 3), translate: `0 ${(1 - tag) * 60}px` }}>tag your loudest friend</div>
        <div style={{ display: "flex", gap: 18, marginTop: 34, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
          {chips.map((c) => {
            const u = sp(t, c.at, JELLY);
            return (
              <div key={c.text} style={{ scale: `${u}`, opacity: u > 0 ? 1 : 0 }}>
                <Button color={c.color} k={2.1} size={22}>{c.text}</Button>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 40 }}>
          {t >= stampAt ? <ComingSoon t={t} size={104} at={stampAt} /> : null}
        </div>
      </div>
      <Shockwave t={t} at={at(0)} x={W / 2} y={560} color="#ffffff" r={1300} width={50} dur={0.5} />
      <Shockwave t={t} at={at(1)} x={W / 2} y={760} color={C.gold} r={900} width={40} dur={0.45} />
      <Shockwave t={t} at={stampAt} x={W / 2} y={1210} color="#ffffff" r={1100} width={40} dur={0.45} />
      <Burst t={t} at={stampAt} x={W / 2} y={1210} colors={[C.red, C.gold, "#fff"]} seed={95} power={900} n={14} size={14} />
      <Burst t={t} at={at(4)} x={W / 2} y={1080} colors={[C.green, C.orange, C.purple, "#fff"]} seed={96} power={800} n={12} size={12} />
      <Flash t={t} at={Q.end} color="#ffffff" dur={0.25} />
    </div>
  );
};

// ---------------------------------------------------------------- the meme
const CUTS = [[Q.yell, 1.0], [Q.spot, 0.8], [Q.shout, 0.5], [Q.out, 0.35], [Q.detention, 0.35], [Q.end, 0.5]] as const;

export const Meme: React.FC<{ fps: number }> = () => {
  const t = useTime();
  const s = shake(t, CUTS.map(([a, v]) => [a, v] as [number, number]));
  const bump = 1 + 0.02 * CUTS.reduce((acc, [a]) => acc + impulse(t, a, 0.08), 0);
  const stage = t < Q.out ? "class" : t < Q.detention ? "out" : t < Q.end ? "det" : "end";
  return (
    <AbsoluteFill style={{ background: C.panel, overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: `${s.x * 0.5}px ${s.y * 0.5}px`, rotate: `${s.r * 0.6}deg`, scale: `${1.02 * bump}` }}>
        {stage === "class" ? <ClassShot t={t} /> : null}
        {stage === "class" ? <Picker t={t} /> : null}
        {stage === "class" ? <Betrayal t={t} /> : null}
        {stage === "out" ? <Escape t={t} /> : null}
        {stage === "det" ? <Detention t={t} /> : null}
        {stage === "end" ? <EndCard t={t} /> : null}
        <Caption t={t} a={0.05} b={Q.yell - 0.1} lines={["ME AND MY FRIEND", "PLANNING A SILENT ESCAPE"]} size={84} />
        <Caption t={t} a={Q.yell} b={Q.spot - 0.05} lines={["MY FRIEND, WHEN HE", "SEES THE OPEN DOOR:"]} size={88} />
        <Caption t={t} a={Q.picker} b={Q.out - 0.1} lines={["ME, WHEN THE TEACHER", "ASKS WHO DID IT:"]} size={84} />
        <Caption t={t} a={Q.out} b={Q.detention - 0.05} lines={["ME, TEN SECONDS LATER:"]} size={90} />
        <Caption t={t} a={Q.detention} b={Q.end - 0.05} lines={["MY FRIEND:"]} size={110} />
        <Flash t={t} at={Q.yell} dur={0.12} peak={0.6} />
        <Flash t={t} at={Q.spot} dur={0.12} peak={0.7} color="#ff6a5a" />
        <Flash t={t} at={Q.out} dur={0.1} peak={0.6} />
        <Flash t={t} at={Q.detention} dur={0.1} peak={0.6} />
      </AbsoluteFill>
      <Audio src={staticFile("audio/meme.wav")} />
    </AbsoluteFill>
  );
};

void ease; void outCubic; void SNAP; void step;
