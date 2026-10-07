// Vertical recut, bars 1-4: the bell, the clock, the period card, the classroom, standing up, suspicion, RUN!
import React from "react";
import { Img, staticFile } from "remotion";
import { clamp01 } from "../../kit/time";
import { b, BEAT } from "../../film/cues";
import { ease, HEAVY, inCubic, JELLY, lerp, noise1, POP, pulses, SNAP, SOFT, sp } from "../../film/fx";
import { Flash, PixelWipe, Shockwave, slam } from "../fxui";
import { C, H, W } from "../tokens";
import { Card, Chip, font, mixHex, Outlined } from "../../film/ui";

// ---------------------------------------------------------------- the classroom wall clock
const WallClock: React.FC<{ t: number; size: number }> = ({ t, size }) => {
  let sec = 0;
  for (let k = 0; k < 8; k++) sec += 6 * sp(t, b(1 + Math.floor(k / 4), (k % 4) + 1), JELLY);
  const ring = t < 1.7 ? Math.exp(-t / 0.8) : 0;
  const wob = Math.sin(t * 2 * Math.PI * 22) * 5 * ring;
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} style={{ overflow: "visible", rotate: `${wob}deg` }}>
      <rect x={-r + 10} y={-r + 22} width={size - 20} height={size - 20} rx={18} fill="rgba(0,0,0,0.35)" />
      <rect x={-r} y={-r} width={size} height={size} rx={18} fill={C.mapInk} />
      <rect x={-r + 22} y={-r + 22} width={size - 44} height={size - 44} rx={6} fill="#f4f4f0" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const long = i % 3 === 0;
        const r0 = r - 44, r1 = r - (long ? 78 : 60);
        return <line key={i} x1={Math.sin(a) * r0} y1={-Math.cos(a) * r0} x2={Math.sin(a) * r1} y2={-Math.cos(a) * r1} stroke={C.mapInk} strokeWidth={long ? 12 : 6} />;
      })}
      <line x1={0} y1={0} x2={-r * 0.42} y2={0} stroke={C.mapInk} strokeWidth={18} strokeLinecap="square" />
      <line x1={0} y1={0} x2={0} y2={-r * 0.62} stroke={C.mapInk} strokeWidth={12} strokeLinecap="square" />
      <g transform={`rotate(${sec})`}>
        <line x1={0} y1={r * 0.16} x2={0} y2={-r * 0.7} stroke={C.classA} strokeWidth={6} />
      </g>
      <rect x={-12} y={-12} width={24} height={24} fill={C.classA} />
    </svg>
  );
};

const Riiing: React.FC<{ t: number }> = ({ t }) => {
  if (t > 1.9) return null;
  const letters = "RIIIING!".split("");
  const out = clamp01((t - 1.5) / 0.3);
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {letters.map((ch, i) => {
        const at = 0.02 + i * 0.035;
        const s = sp(t, at, JELLY);
        const jig = noise1(t * 30, i) * 10 * Math.exp(-t / 1.2);
        return (
          <div key={i} style={{ scale: `${s * (1 - out)}`, translate: `0 ${jig}px`, rotate: `${noise1(t * 18, i + 9) * 10}deg` }}>
            <Outlined size={190}>{ch}</Outlined>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- the period card (hud.gd:431)
const PeriodCard: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const f = k * 1.35;
  const minutesLeft = 7 * 60 + 51 - Math.max(0, Math.floor((t - b(2)) / BEAT));
  const bell = `${Math.floor(minutesLeft / 60)}:${String(minutesLeft % 60).padStart(2, "0")}`;
  const rows: [number, React.ReactNode][] = [
    [b(2, 1), <div style={{ display: "flex", alignItems: "center", gap: 12 * k }}><span style={{ ...font, fontSize: 22 * f, color: "#fff" }}>Riya</span><Chip color={C.classA} k={k}>Class A</Chip></div>],
    [b(2, 1, 0.5), <span style={{ ...font, fontSize: 16 * f, color: "#fff" }}>Final bell in {bell}</span>],
    [b(2, 2), <span style={{ ...font, fontSize: 15 * f, color: C.blue }}>Period 1/3  ·  Thermodynamics</span>],
    [b(2, 3), <span style={{ ...font, fontSize: 15 * f, color: C.blue }}>Class A, Ground floor</span>],
    [b(2, 4), <span style={{ ...font, fontSize: 16 * f, color: C.yellow }}>Pocket money: Rs 30</span>],
  ];
  return (
    <Card k={k} style={{ padding: 16 * k, display: "flex", flexDirection: "column", gap: 10 * k, width: "auto" }}>
      {rows.map(([at, node], i) => {
        const u = sp(t, at, POP);
        return (
          <div key={i} style={{ opacity: clamp01(u * 3), translate: `${(1 - u) * 60}px 0`, scale: `${0.7 + 0.3 * u}`, transformOrigin: "0 50%" }}>
            {node}
          </div>
        );
      })}
    </Card>
  );
};

export const Bell: React.FC<{ t: number }> = ({ t }) => {
  if (t >= b(3) + 0.05) return null;
  const slide = sp(t, b(2), HEAVY);
  const out = ease(t, b(2, 4, 0.55), 0.2, inCubic);
  const clockIn = sp(t, 0, JELLY);
  const clockY = lerp(900, 640, slide);
  const clockSize = 600;
  const cardIn = sp(t, b(2) - 0.05, HEAVY);
  const beatPulse = 1 + 0.035 * pulses(t, [b(1, 1), b(1, 2), b(1, 3), b(1, 4), b(2, 1), b(2, 2), b(2, 3), b(2, 4)], 0.08);
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 45%, ${C.phoneScreen} 0%, ${C.panel} 70%)` }}>
      <div style={{ position: "absolute", left: W / 2 - clockSize / 2, top: clockY - clockSize / 2, scale: `${clockIn * beatPulse * (1 - out) * lerp(1, 0.86, slide)}`, rotate: `${out * -30}deg` }}>
        <WallClock t={t} size={clockSize} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", translate: `0 ${-slide * 90}px`, opacity: 1 }}>
        <Riiing t={t} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center", translate: `0 ${(1 - cardIn) * 900}px`, rotate: `${(1 - cardIn) * 6}deg`, scale: `${1 - out}` }}>
        <PeriodCard t={t} k={2.5} />
      </div>
      <Shockwave t={t} at={0} x={W / 2} y={900} r={900} width={60} dur={0.6} color={C.gold} />
    </div>
  );
};

// ---------------------------------------------------------------- the classroom
const SuspicionCard: React.FC<{ t: number; k: number; value: number }> = ({ t, k, value }) => {
  const f = k * 1.35;
  const seen = t > b(4, 2) && Math.floor((t - b(4, 2)) / 0.25) % 2 === 0;
  const fill = mixHex("#ffd24a", "#ff3b3b", value / 100);
  return (
    <Card k={k} style={{ width: 280 * k, padding: 16 * k }}>
      <div style={{ display: "flex", alignItems: "center", ...font, fontSize: 16 * f, color: "#fff" }}>
        <span>SUSPICION</span>
        <span style={{ marginLeft: 14 * k, color: "#ff5a5a", opacity: seen ? 1 : 0 }}>SEEN!</span>
        <span style={{ marginLeft: "auto" }}>{Math.round(value)}%</span>
      </div>
      <div style={{ marginTop: 10 * k, height: 14 * k, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ width: `${value}%`, height: "100%", background: fill }} />
      </div>
      <div style={{ ...font, marginTop: 12 * k, fontSize: 15 * f, color: "#ff6a6a" }}>{value > 70 ? "They're onto you..." : " "}</div>
      <div style={{ ...font, marginTop: 10 * k, fontSize: 14 * f, color: mixHex(C.green, "#ff5a5a", value / 100) }}>HEAT {1 + Math.min(3, Math.floor(value / 26))}/4</div>
    </Card>
  );
};

// Plate shown 1040 source px wide (x 60-1100 of 1920): board, the students, the window and the teacher's spot.
const PLATE_X0 = 60, PLATE_SPAN = 1040;
const PLATE_SCALE = W / PLATE_SPAN;
const PLATE_W = 1920 * PLATE_SCALE, PLATE_H = 1080 * PLATE_SCALE;

export const Classroom: React.FC<{ t: number }> = ({ t }) => {
  if (t < b(3) - 0.02 || t >= b(5)) return null;
  const standUp = sp(t, b(3, 4), SOFT);
  const push = 1.04 + 0.1 * clamp01((t - b(3)) / (b(5) - b(3)));
  const barFour = clamp01((t - b(4)) / 0.25);
  const sus = 22 * sp(t, b(4, 1), SNAP) + 26 * sp(t, b(4, 2), SNAP) + 28 * sp(t, b(4, 3), SNAP) + 24 * sp(t, b(4, 4), SNAP);
  const trauma = 0.25 * pulses(t, [b(4, 1), b(4, 2), b(4, 3), b(4, 4)], 0.12) * (0.6 + sus / 100);
  const jx = noise1(t * 24, 4) * 22 * trauma, jy = noise1(t * 24, 5) * 30 * trauma;
  const line = "Everyone, eyes on the board.";
  const typed = Math.floor(clamp01((t - b(3, 1, 0.1)) / (BEAT * 1.4)) * line.length);
  const dlgIn = sp(t, b(3), HEAVY);
  const dlgOut = ease(t, b(3, 4), 0.2, inCubic);
  const prompt = slam(t, b(3, 3), 2.2, 0.3);
  const press = t > b(3, 4) ? Math.exp(-(t - b(3, 4)) / 0.08) : 0;
  const promptOut = ease(t, b(3, 4, 0.35), 0.18, inCubic);
  const cardIn = sp(t, b(4), JELLY);
  const runAt = b(4, 4, 0.02);
  const cardOut = ease(t, runAt, 0.25, inCubic);
  const run = slam(t, runAt, 3.2, 0.3);
  const red = sus / 100;
  const plate = t >= b(4) ? "fpteach" : "fp0"; // the teacher walks into view as suspicion rises
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.panel }}>
      {/* The plate is shown near full width so the students (and, from the suspicion beat, Ms. Okafor) stay in view; a
          blurred cover-crop of the same frame fills the rest of the vertical canvas. */}
      <div
        style={{
          position: "absolute", inset: 0,
          scale: `${push + barFour * 0.1}`,
          translate: `${jx}px ${jy + standUp * 120 - barFour * 40}px`,
          rotate: `${standUp * -1.5 + barFour * noise1(t * 3, 8) * 1.5}deg`,
          filter: `saturate(${1 - 0.5 * barFour}) brightness(${1 - 0.35 * barFour}) blur(${barFour * 5}px)`,
        }}
      >
        <Img src={staticFile(`plates/${plate}.jpg`)} style={{ position: "absolute", inset: 0, width: W, height: H, objectFit: "cover", objectPosition: "30% 50%", scale: "1.2", filter: "blur(34px) brightness(0.9)" }} />
        <Img
          src={staticFile(`plates/${plate}.jpg`)}
          style={{
            position: "absolute", left: -PLATE_X0 * PLATE_SCALE, top: (H - PLATE_H) / 2, width: PLATE_W, height: PLATE_H, maxWidth: "none",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
          }}
        />
      </div>
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${120 + 180 * red}px ${40 + 60 * red}px rgba(255,40,40,${0.55 * red * (0.6 + 0.4 * pulses(t, [b(4, 1), b(4, 2), b(4, 3), b(4, 4)], 0.15))})` }} />
      {/* dialog: sits above the caption zone */}
      <div style={{ position: "absolute", left: 60, width: 960, top: 1150, translate: `0 ${(1 - dlgIn) * 500 + dlgOut * 900}px` }}>
        <div style={{ background: "rgba(15,15,26,0.9)", borderRadius: 28, padding: "28px 34px" }}>
          <div style={{ ...font, fontSize: 42, color: C.yellow }}>MS. OKAFOR</div>
          <div style={{ ...font, fontSize: 60, color: "#fff", marginTop: 12 }}>{line.slice(0, typed)}<span style={{ opacity: Math.floor(t * 8) % 2 ? 1 : 0 }}>_</span></div>
        </div>
      </div>
      {prompt > 0 && promptOut < 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", scale: `${prompt * (1 - 0.12 * press) * (1 - promptOut)}`, translate: `0 ${press * 10}px` }}>
          <Outlined size={150} color={C.yellow} stroke="#000" strokeWidth={20}>[E] Stand up</Outlined>
        </div>
      )}
      {t > b(4) - 0.05 && cardOut < 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", scale: `${cardIn}`, translate: `${noise1(t * 30, 11) * 12 * trauma}px ${-cardOut * 900}px`, rotate: `${(1 - cardIn) * -10}deg` }}>
          <SuspicionCard t={t} k={2.4} value={Math.min(100, sus)} />
        </div>
      )}
      {run > 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", scale: `${run}`, rotate: `${-4 + noise1(t * 20, 2) * 2}deg` }}>
          <div style={{ background: C.red, borderRadius: 40, padding: "30px 90px", boxShadow: "0 24px 0 #a82020" }}>
            <div style={{ ...font, fontSize: 300, color: "#fff" }}>RUN!</div>
          </div>
        </div>
      )}
      <Shockwave t={t} at={runAt} x={W / 2} y={H / 2} color="#ffffff" r={1300} width={70} dur={0.45} />
      <PixelWipe t={t} start={b(3) - 0.02} dur={0.5} color={C.panel} mode="reveal" />
      <Flash t={t} at={b(3)} color={C.gold} dur={0.15} peak={0.35} />
    </div>
  );
};
