// Vertical recut, bars 9-12. The lobby offers two maps, so: bar 9 First Day, bar 10 Grand Campus (the real plates,
// exits pinned on beats), then bars 11-12 the lobby fills with up to 8 friends, everyone readies up, START CLASS.
import React from "react";
import { Img, staticFile } from "remotion";
import { clamp01 } from "../../kit/time";
import { b } from "../../film/cues";
import { ease, inCubic, JELLY, lerp, outCubic, outExpo, POP, pulses, SNAP, sp } from "../../film/fx";
import { Burst, Iris, Shockwave, slam } from "../fxui";
import { C, H, W } from "../tokens";
import { Button, ExitMarker, font, NameTag, Outlined } from "../../film/ui";

const CARD_W = 940, CARD_H = 760, CARD_X = 70, CARD_Y = 500;

type Exit = { label: string; x: number; y: number; beat: number };
type MapDef = {
  bar: number; plate: string; name: string; venue: string; bg: string;
  s: number; ox: number; oy: number; // plate -> card: px = (x - ox) * s
  exits: Exit[];
};

// Exit labels are the game's own markers (first_day.gd, grand_campus.gd). Positions are in 1920x1080 plate pixels.
const MAPS: MapDef[] = [
  {
    bar: 9, plate: "c_air0", name: "FIRST DAY", venue: "The small school. Learn the ropes.", bg: C.purple,
    s: 0.95, ox: 700, oy: 250,
    exits: [{ label: "Chai stall", x: 1180, y: 440, beat: 2 }],
  },
  {
    bar: 10, plate: "c_air1", name: "GRAND CAMPUS", venue: "The Old Quadrangle", bg: C.orange,
    s: 0.75, ox: 380, oy: 67,
    exits: [
      { label: "Main gate", x: 560, y: 700, beat: 2 },
      { label: "Storm drain", x: 1180, y: 1000, beat: 3 },
      { label: "Scaffolding", x: 1440, y: 560, beat: 4 },
    ],
  },
];

const FRIENDS = ["Riya", "Kenji", "Amara", "Mateo", "Zoe", "Omar", "Lin", "Sam"];
const FRIEND_COLORS = [C.classA, C.classB, C.classC, C.lab, C.orange, C.teal, C.pink, C.yellow];

const MapCard: React.FC<{ t: number; m: MapDef; i: number }> = ({ t, m, i }) => {
  const start = b(m.bar);
  const end = b(m.bar + 1);
  const inU = i === 0 ? sp(t, start, JELLY) : ease(t, start - 0.12, 0.26, outExpo);
  const outU = ease(t, end - 0.12, 0.2, inCubic);
  const vx = i === 0 ? 0 : (1 - inU) * 1600;
  const ox2 = -outU * 1800;
  const smear = (i === 0 ? 0 : Math.abs(1 - inU)) + outU;
  const drift = clamp01((t - start) / (end - start));
  const kick = 1 + 0.015 * pulses(t, [b(m.bar, 1), b(m.bar, 2), b(m.bar, 3), b(m.bar, 4)], 0.09);
  const scale0 = i === 0 ? lerp(0.2, 1, inU) : 1;
  const z = 1 + drift * 0.07; // slow push-in on the plate
  return (
    <div
      style={{
        position: "absolute", left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H,
        translate: `${vx + ox2}px 0`,
        scale: `${scale0 * kick * (1 + smear * 0.2)} ${scale0 * kick * (1 - smear * 0.1)}`,
        transform: `perspective(2600px) rotateY(${-9 + drift * 4}deg) rotateX(4deg) rotateZ(${-2 + drift * 1.5}deg)`,
        filter: smear > 0.05 ? `blur(${smear * 10}px)` : undefined,
      }}
    >
      <div style={{ position: "absolute", inset: 0, translate: "20px 28px", borderRadius: 30, background: C.ink, opacity: 0.35 }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, overflow: "hidden", border: `10px solid ${C.ink}`, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", inset: 0, scale: `${z}`, transformOrigin: "50% 50%" }}>
          <Img src={staticFile(`plates/${m.plate}.jpg`)} style={{ position: "absolute", left: -m.ox * m.s, top: -m.oy * m.s, width: 1920 * m.s, height: 1080 * m.s, maxWidth: "none" }} />
          {m.exits.map((e, j) => {
            const at = b(m.bar, e.beat);
            const u = sp(t, at, JELLY);
            if (u <= 0) return null;
            const x = (e.x - m.ox) * m.s - 10, y = (e.y - m.oy) * m.s - 10;
            const ring = clamp01((t - at) / 0.5);
            return (
              <div key={j} style={{ position: "absolute", left: x, top: y }}>
                <div style={{ position: "absolute", left: -90 * ring, top: -90 * ring, width: 180 * ring, height: 180 * ring, borderRadius: 999, border: `${8 * (1 - ring)}px solid #2fa85a`, opacity: 1 - ring }} />
                <div style={{ position: "absolute", translate: "-50% -50%", scale: `${u}` }}>
                  <ExitMarker s={3.4} />
                </div>
                <div style={{ position: "absolute", top: 50, translate: "-50% 0", scale: `${u}`, transformOrigin: "50% 0" }}>
                  <NameTag k={2.5} bg="rgba(26,89,46,0.92)">{e.label}</NameTag>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Title: React.FC<{ t: number; m: MapDef }> = ({ t, m }) => {
  const start = b(m.bar);
  const end = b(m.bar + 1);
  if (t < start - 0.02 || t >= end - 0.02) return null;
  const letters = m.name.split("");
  const venue = sp(t, start + 0.18, POP);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1290, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex" }}>
        {letters.map((ch, j) => {
          const u = sp(t, start + j * 0.018, JELLY);
          return (
            <div key={j} style={{ translate: `0 ${(1 - u) * -260}px`, opacity: clamp01(u * 4), scale: `${0.6 + 0.4 * u}`, width: ch === " " ? 40 : undefined }}>
              <Outlined size={156} color="#fff" stroke={C.ink} strokeWidth={26}>{ch}</Outlined>
            </div>
          );
        })}
      </div>
      <div style={{ ...font, fontSize: 58, color: C.ink, marginTop: 8, opacity: clamp01(venue * 3), translate: `${(1 - venue) * -120}px 0` }}>{m.venue}</div>
    </div>
  );
};

// ---------------------------------------------------------------- bars 11-12: the lobby fills up
const Lobby: React.FC<{ t: number }> = ({ t }) => {
  const press = b(12, 3);
  const pressed = b(12, 3, 0.5);
  const dim = ease(t, press, 0.15, outCubic);
  const btn = slam(t, press, 2.6, 0.26);
  const bump = 1 + 0.02 * pulses(t, [b(11, 1), b(11, 2), b(11, 3), b(11, 4), b(12, 1), b(12, 2)], 0.09);
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${bump}` }}>
      {/* headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", flexDirection: "column", alignItems: "center",}}>
        <div style={{ scale: `${slam(t, b(11, 1), 2.4, 0.26)}`, opacity: t >= b(11, 1) ? 1 : 0 }}>
          <Outlined size={120} color="#fff" stroke="#000" strokeWidth={16}>PLAY WITH</Outlined>
        </div>
        <div style={{ marginTop: -10, scale: `${slam(t, b(11, 1, 0.5), 2.6, 0.26)}`, opacity: t >= b(11, 1, 0.5) ? 1 : 0, rotate: "-3deg" }}>
          <Outlined size={230} color={C.gold} stroke="#000" strokeWidth={28}>UP TO 8</Outlined>
        </div>
        <div style={{ marginTop: -50, scale: `${slam(t, b(11, 2), 2.6, 0.26)}`, opacity: t >= b(11, 2) ? 1 : 0, rotate: "2deg" }}>
          <Outlined size={230} color={C.gold} stroke="#000" strokeWidth={28}>FRIENDS</Outlined>
        </div>
      </div>
      {/* the roster */}
      <div style={{ position: "absolute", left: 75, right: 75, top: 880, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 30, rowGap: 22, opacity: 1 - 0.8 * dim, filter: `blur(${dim * 6}px)` }}>
        {FRIENDS.map((name, i) => {
          const at = b(11, 2, 0.5) + i * 0.25 * (60 / 128);
          const u = sp(t, at, JELLY);
          const readyAt = b(12, 1) + i * 0.25 * (60 / 128);
          const ready = t >= readyAt;
          const rk = ready ? sp(t, readyAt, JELLY) : 0;
          return (
            <div key={name} style={{ height: 130, opacity: u > 0 ? 1 : 0 }}>
              <div style={{ height: 130, borderRadius: 24, background: "rgba(20,20,36,0.88)", display: "flex", alignItems: "center", padding: "0 22px", gap: 20, scale: `${u}`, rotate: `${(1 - u) * (i % 2 ? 8 : -8)}deg`, boxShadow: ready ? `0 0 0 6px ${C.green}` : "none" }}>
                <div style={{ width: 86, height: 86, borderRadius: 18, background: FRIEND_COLORS[i], border: `6px solid ${C.mapInk}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ ...font, fontSize: 60, color: C.ink }}>{name[0]}</div>
                </div>
                <div style={{ ...font, fontSize: 60, color: "#fff" }}>{name}</div>
                <div style={{ marginLeft: "auto", scale: `${rk}`, opacity: ready ? 1 : 0 }}>
                  <div style={{ ...font, fontSize: 40, color: C.ink, background: C.green, borderRadius: 12, padding: "6px 14px" }}>READY</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* START CLASS */}
      {t >= press && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1080, display: "flex", justifyContent: "center", scale: `${btn}` }}>
          <Button color={C.gold} k={4.4} size={30} pressed={t >= pressed ? Math.exp(-(t - pressed) / 0.12) : 0}>START CLASS</Button>
        </div>
      )}
      <Burst t={t} at={pressed} x={W / 2} y={1170} colors={[C.gold, "#fff", C.green, C.orange]} seed={61} power={1500} n={22} size={20} />
      <Shockwave t={t} at={press} x={W / 2} y={1170} color="#ffffff" r={1300} width={60} dur={0.5} />
      <Burst t={t} at={b(11, 2)} x={W / 2} y={620} colors={[C.gold, "#fff", C.cyan, C.pink]} seed={44} power={1300} n={18} size={18} />
    </div>
  );
};

export const Maps: React.FC<{ t: number }> = ({ t }) => {
  if (t < b(9) || t >= b(13) + 0.05) return null;
  const inLobby = t >= b(11) - 0.04;
  const idx = t >= b(10) ? 1 : 0;
  const head = sp(t, b(9), SNAP);
  const leave = ease(t, b(11) - 0.1, 0.15, inCubic);
  const leaveEnd = ease(t, b(13) - 0.1, 0.15, inCubic);
  return (
    <div style={{ position: "absolute", inset: 0, background: inLobby ? C.orange : C.purple, overflow: "hidden" }}>
      {!inLobby && idx === 1 && <Iris t={t} at={b(10) - 0.04} x={W + 100} y={H / 2} color={C.orange} dur={0.3} />}
      {inLobby && <Iris t={t} at={b(11) - 0.04} x={W / 2} y={H / 2} color={C.cyan} dur={0.3} />}
      {/* pixel grid texture drifting */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
        {Array.from({ length: 24 }, (_, i) =>
          Array.from({ length: 13 }, (_, j) => {
            const s = 14 + 10 * (0.5 + 0.5 * Math.sin(t * 3 + i * 0.7 + j * 0.4));
            return <rect key={`${i}-${j}`} x={j * 92 - ((t * 60) % 92) + 46 - s / 2} y={i * 92 + 46 - s / 2} width={s} height={s} fill={C.ink} />;
          }),
        )}
      </svg>
      {!inLobby && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 255, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, scale: `${head}`, opacity: 1 - leave }}>
          <div style={{ ...font, fontSize: 84, color: C.ink }}>ESCAPE THE</div>
          <div style={{ ...font, fontSize: 104, color: "#fff", background: C.ink, padding: "4px 24px", borderRadius: 14 }}>WHOLE UNIVERSITY</div>
        </div>
      )}
      {!inLobby && MAPS.map((m, i) => (t >= b(m.bar) - 0.15 && t < b(m.bar + 1) + 0.1 ? <MapCard key={m.name} t={t} m={m} i={i} /> : null))}
      {!inLobby && MAPS.map((m) => <Title key={m.name} t={t} m={m} />)}
      {inLobby && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - leaveEnd }}>
          <Lobby t={t} />
        </div>
      )}
      <Burst t={t} at={b(9)} x={W / 2} y={H / 2} colors={[C.purple, C.gold, "#fff", C.green]} seed={5} power={1500} n={20} size={20} />
    </div>
  );
};
