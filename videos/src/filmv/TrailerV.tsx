import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { useTime } from "../kit/time";
import { b, KICKS } from "../film/cues";
import { pulses, shake } from "../film/fx";
import { C } from "../film/tokens";
import { Bell, Classroom } from "./acts/Intro";
import { Minimap, Phone, Style, Words } from "./acts/Drop";
import { Maps } from "./acts/Maps";
import { Canteen, Logo, Ranks } from "./acts/Finale";

// Vertical (9:16, Instagram Reels) recut of the 30 s trailer: the same score and beat grid, every act re-staged for
// 1080x1920. Big hits shake the frame (trauma decays); every kick in the drops nudges the zoom.
const HITS: [number, number][] = [
  [b(5), 0.9], [b(5, 3), 0.5], [b(5, 4), 0.9],
  [b(6, 3), 0.35], [b(7, 4, 0.5), 0.9],
  [b(9), 0.45], [b(10), 0.45], [b(11), 0.45], [b(12), 0.45], [b(12, 3), 0.6],
  [b(14, 4), 0.7], [b(15), 1.1], [b(15, 3), 0.7], [b(15, 4), 0.7], [b(16), 0.8], [b(16, 2), 0.5],
];

export const TrailerV: React.FC<{ fps: number }> = () => {
  const t = useTime();
  const s = shake(t, HITS);
  const bump = 1 + 0.012 * pulses(t, KICKS.filter((k) => k >= b(5)), 0.08);
  return (
    <AbsoluteFill style={{ background: C.panel, overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: `${s.x * 0.6}px ${s.y * 0.6}px`, rotate: `${s.r}deg`, scale: `${1.03 * bump}` }}>
        <Bell t={t} />
        <Classroom t={t} />
        <Words t={t} />
        <Minimap t={t} />
        <Style t={t} />
        <Phone t={t} />
        <Maps t={t} />
        <Canteen t={t} />
        <Ranks t={t} />
        <Logo t={t} />
      </AbsoluteFill>
      <Audio src={staticFile("audio/trailer.wav")} />
    </AbsoluteFill>
  );
};
