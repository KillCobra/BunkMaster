// Instagram reel grid: 136 BPM, 17 bars = 30.000 s, 1080x1920. Every moment is b(bar, beat). No literal frame numbers.
// Brief for every act: videos/reel-brief.md.
export const BPM = 136;
export const BEAT = 60 / BPM; // 0.44118 s
export const BAR = BEAT * 4; // 1.76471 s
export const BARS = 17;
export const DURATION = BARS * BAR; // 30.000 s
export const W = 1080;
export const H = 1920;
export const b = (bar: number, beat = 0) => (bar * 4 + beat) * BEAT;

/** Act windows in reel seconds: [start, end). Each act renders only inside its window. */
export const ACTS = {
  hook: [b(0), b(2)], // POV: 5:00 to escape class (alarm clock), dive into the clock face
  sneak: [b(2), b(6)], // classroom POV, RUN!, SNEAK OUT OF CLASS., DON'T GET CAUGHT.
  chaos: [b(6), b(11)], // DODGE (minimap), proximity voice, talk your way out, chaos items, SURPRISE TEST!
  crew: [b(11), b(15)], // UP TO 8 FRIENDS, ESCAPE THE UNIVERSITY (maps), the escape, YOU ESCAPED
  logo: [b(15), DURATION + 0.01], // voxel island, BUNK MASTER, tagline, COMING SOON
} as const;
export type ActName = keyof typeof ACTS;
export const within = (t: number, a: readonly [number, number]) => t >= a[0] && t < a[1];

// ---- borrowing the Steam trailer's scenes (128 BPM) beat for beat
const STEAM_BEAT = 60 / 128;
/**
 * Steam-film time for reel time `t`, so that reel bar `reelBar` lines up with Steam bar `steamBar` and every
 * later beat stays locked (the borrowed scene just plays 6% faster). Feed the result to any src/steam/* scene,
 * camera or actor function: their own b(bar, beat) cues then land on the reel's beats.
 */
export const steamT = (t: number, reelBar: number, steamBar: number) => steamBar * 4 * STEAM_BEAT + ((t - b(reelBar)) / BEAT) * STEAM_BEAT;
/** The same for the Launch film (src/launch/*, also 128 BPM). */
export const launchT = steamT;
