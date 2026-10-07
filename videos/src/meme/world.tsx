// The meme's 3D world: the game's classroom and compound as voxels, with every actor a pure function of time.
import React, { useMemo } from "react";
import * as THREE from "three";
import { step } from "../kit/spring";
import type { Cam } from "../launch/camera3d";
import { WOBBLE } from "../launch/juice";
import { CHAI_GLASS, classroom, outside, seat } from "../launch/sets";
import { Character, G, Voxels } from "../launch/three";
import { CAST, mixPose, REST, sitPose, walkPose, type Pose, type V3 } from "../launch/voxel";
import cues from "./cues.json";

export const Q = cues;
/** One beat and the escape-banner delay (2 beats), from the score's tempo. */
export const BEAT = 60 / cues.bpm;
export const ARRIVE = 2 * BEAT;
const PI = Math.PI;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const SOFT = { stiffness: 170, damping: 22 };

// ---------------------------------------------------------------- paths through the classroom to the door
const PATH: [number, number][] = [[1.05, -0.86], [2.3, -0.5], [3.05, 0.6], [3.35, 2.8], [5.9, 2.8]];
const KPATH: [number, number][] = [[0.15, -0.86], ...PATH];
export const SPEED = 1.25; // m/s tiptoe

function along(path: [number, number][], d: number) {
  let rem = Math.max(0, d);
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i], [x1, z1] = path[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0);
    if (rem <= L || i === path.length - 2) {
      const f = Math.min(1, rem / L);
      return { x: lerp(x0, x1, f), z: lerp(z0, z1, f), dx: (x1 - x0) / L, dz: (z1 - z0) / L };
    }
    rem -= L;
  }
  return { x: 0, z: 0, dx: 0, dz: 1 };
}
/** Yaw (0 = facing -Z) for a direction, unwrapped to be near `near`. */
export function yawFor(dx: number, dz: number, near = PI) {
  let y = Math.atan2(-dx, -dz);
  while (y - near > PI) y -= 2 * PI;
  while (y - near < -PI) y += 2 * PI;
  return y;
}

export type Actor = { look: (typeof CAST)[string]; pose: Pose; p: V3; yaw: number; squash?: number };
export const TEACHER_AT: V3 = [-0.85, 0.08, 3.85];
const FREEZE = Q.yell + 0.05;

const tiptoe = (t0: number, t: number): Pose => ({ ...walkPose((t - t0) * 7.2, 0.55, 0.55) });

/** The hero: seated, stands, tiptoes toward the door, freezes with a hand over the face when his friend yells. */
export function hero(t: number): Actor {
  const seatP = seat(3, 1);
  const stand = step(t - Q.stand, SOFT);
  const dist = SPEED * Math.max(0, Math.min(t, FREEZE) - Q.sneak);
  const w = along(PATH, dist);
  const walking = t > Q.sneak && t < FREEZE;
  const seated = sitPose(1 - stand);
  let pose: Pose = walking ? mixPose(seated, tiptoe(Q.sneak, t), clamp01((t - Q.sneak) / 0.2)) : seated;
  let yaw = lerp(PI, yawFor(w.dx, w.dz), clamp01((t - Q.stand) / 0.5));
  let p: V3 = [lerp(seatP[0], w.x, clamp01(stand)), 0, lerp(seatP[2], w.z, clamp01(stand))];
  let squash = 1;
  if (t >= FREEZE) {
    // frozen: crouched, one hand over the face
    const u = step(t - FREEZE, { stiffness: 380, damping: 16 });
    pose = mixPose(tiptoe(Q.sneak, FREEZE), { ...REST, hipY: 0.62, legL: 0.9, legR: 0.9, torsoX: -0.3, armRX: 2.5, armRZ: -0.4, armLX: 0.2, headX: 0.35 }, clamp01(u));
    squash = 1 + 0.1 * Math.exp(-(t - FREEZE) * 8) * Math.sin((t - FREEZE) * 30);
    // after the pick: straightens up and points at his friend, then strolls to the door
    if (t >= Q.shout - 0.1) {
      const k = clamp01((t - (Q.shout - 0.1)) / 0.2);
      pose = mixPose(pose, { ...REST, torsoX: 0.05, armRX: 1.55, armRZ: 0.1, headX: 0, headY: 0.3 }, k);
    }
    if (t >= Q.betray + 0.5) {
      const d2 = dist + SPEED * 1.6 * (t - (Q.betray + 0.5));
      const w2 = along(PATH, d2);
      p = [w2.x, 0, w2.z];
      yaw = yawFor(w2.dx, w2.dz, yaw);
      pose = { ...walkPose((t - Q.betray) * 9, 0.7, 0.1), armRX: 0.2 };
      squash = 1;
    }
  }
  return { look: CAST.hero, pose, p, yaw, squash };
}

/** Kenji, the friend with one job. Whispers along behind, then sees the door. */
export function kenji(t: number): Actor {
  const seatP = seat(3, 0);
  const start = Q.sneak + 0.25;
  const stand = step(t - (Q.stand + 0.2), SOFT);
  const dist = SPEED * Math.max(0, Math.min(t, Q.yell) - start);
  const w = along(KPATH, dist);
  let pose: Pose = sitPose(1 - stand);
  if (t > start) pose = mixPose(pose, tiptoe(start, t), clamp01((t - start) / 0.2));
  const yaw0 = lerp(PI, yawFor(w.dx, w.dz), clamp01((t - Q.stand) / 0.5));
  const p: V3 = [lerp(seatP[0], w.x, clamp01(stand)), 0, lerp(seatP[2], w.z, clamp01(stand))];
  let squash = 1;
  let yaw = yaw0;
  if (t >= Q.yell) {
    // the yell: head back, both arms up, a hop
    const u = step(t - Q.yell, { stiffness: 520, damping: 14 });
    const hop = Math.max(0, Math.sin(clamp01((t - Q.yell) / 0.35) * PI)) * 0.35;
    const cheer: Pose = { ...REST, hipY: REST.hipY + hop, armLX: 2.9, armRX: 2.9, armLZ: -0.5, armRZ: 0.5, headX: -0.55 };
    pose = mixPose(pose, cheer, clamp01(u));
    yaw = yawFor(0.2, 1, yaw0);
    if (t >= Q.spot + 0.15) {
      pose = mixPose(pose, { ...REST, armLX: 0.4, armRX: 0.4, armLZ: -0.1, armRZ: 0.1, headX: 0.1 }, clamp01(step(t - Q.spot - 0.15, { stiffness: 300, damping: 18 })));
    }
    // betrayed: arms out, head shaking "who, me?"
    if (t >= Q.betray) {
      const bt = step(t - Q.betray, { stiffness: 420, damping: 13 });
      pose = mixPose(pose, { ...REST, armLX: 1.2, armRX: 1.2, armLZ: -1.1, armRZ: 1.1, headX: -0.1, headY: 0.5 * Math.sin((t - Q.betray) * 22) * Math.exp(-(t - Q.betray) * 2) }, clamp01(bt));
      squash = 1 + 0.12 * Math.exp(-(t - Q.betray) * 7) * Math.sin((t - Q.betray) * 28);
    }
  }
  return { look: CAST.friendB, pose, p, yaw, squash };
}

export function teacher(t: number): Actor {
  const writing = (): Pose => ({ ...REST, armRX: 2.2 + 0.14 * Math.sin(t * 9), armRZ: -0.3, headX: -0.12, headY: 0.1 * Math.sin(t * 3) });
  const h = hero(t), k = kenji(t);
  const faceHero = yawFor(h.p[0] - TEACHER_AT[0], h.p[2] - TEACHER_AT[2]);
  const spin = step(t - Q.spot, WOBBLE);
  const toKenji = yawFor(k.p[0] - TEACHER_AT[0], k.p[2] - TEACHER_AT[2]);
  let yaw = lerp(PI, faceHero, spin);
  yaw = lerp(yaw, toKenji, step(t - (Q.betray + 0.1), WOBBLE));
  let pose = t < Q.spot ? writing() : mixPose(writing(), { ...REST, armRX: 1.55, armRZ: 0.1, armLX: 0.5, headX: 0.1 }, clamp01((t - Q.spot) / 0.12));
  let p: V3 = [...TEACHER_AT];
  // marches over to his friend after the betrayal
  if (t >= Q.betray + 0.3) {
    const u = clamp01((t - Q.betray - 0.3) / 1.0);
    p = [lerp(TEACHER_AT[0], k.p[0] - 0.9, u), 0.08 * (1 - u), lerp(TEACHER_AT[2], k.p[2] + 0.3, u)];
    pose = mixPose(pose, { ...walkPose(t * 8, 0.8), armRX: 1.55 }, 0.8 * (1 - clamp01((t - Q.betray - 1.3) / 0.2)));
  }
  const squash = t < Q.spot ? 1 : 1 + 0.16 * Math.exp(-(t - Q.spot) * 9) * Math.sin((t - Q.spot) * 28);
  return { look: CAST.teacher, pose, p, yaw, squash };
}

/** The rest of the class: heads down, until the yell, then every head swings round to look. */
export function classmates(t: number): (Actor & { id: string })[] {
  const k = kenji(t);
  const mk = (id: string, look: Actor["look"], i: number, side: 0 | 1, lag: number): Actor & { id: string } => {
    const s = seat(i, side);
    const pose: Pose = { ...sitPose(1), headY: 0.1 * Math.sin(t * 1.3 + i * 2 + side), headX: 0.05 * Math.sin(t * 1.7 + i) };
    let yaw = PI;
    const u = step(t - (Q.yell + lag), WOBBLE);
    if (u > 0) {
      const want = yawFor(k.p[0] - s[0], k.p[2] - s[2], PI) - PI;
      yaw = PI + want * 0.3 * Math.min(1, u);
      pose.headY = pose.headY * (1 - Math.min(1, u)) + Math.max(-1.3, Math.min(1.3, want * 0.8)) * u;
      pose.headX = -0.08 * u;
    }
    return { id, look, pose, p: [s[0], 0, s[2]], yaw };
  };
  return [
    mk("npc1", CAST.npc1, 0, 0, 0.1), mk("npc2", CAST.npc2, 0, 1, 0.05), mk("friendA", CAST.friendA, 1, 1, 0.15),
    mk("friendC", CAST.friendC, 1, 0, 0.0), mk("npc4", CAST.npc4, 2, 0, 0.12), mk("npc3", CAST.npc3, 2, 1, 0.2),
    mk("npcb", CAST.npc1, 4, 0, 0.08), mk("npcc", CAST.npc2, 4, 1, 0.18), mk("npcd", CAST.npc3, 5, 0, 0.22),
  ];
}

/** Flat voice ring on the floor (the game's proximity-voice rings). */
export const Ring3D: React.FC<{ x: number; z: number; r: number; color: string; opacity: number; width?: number }> = ({ x, z, r, color, opacity, width = 0.12 }) =>
  r > 0.01 && opacity > 0.01 ? (
    <mesh position={[x, 0.04, z]} rotation={[-PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(0.001, r - width), r, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  ) : null;

const Fig: React.FC<{ a: Actor }> = ({ a }) => <Character look={a.look} pose={a.pose} p={a.p} yaw={a.yaw} squash={a.squash ?? 1} />;

export const ClassWorld: React.FC<{ t: number; rings?: React.ReactNode }> = ({ t, rings }) => {
  const room = useMemo(() => classroom(), []);
  const cast = classmates(t);
  const h = hero(t), k = kenji(t), te = teacher(t);
  return (
    <>
      <Voxels boxes={room} />
      {cast.map((a) => <Fig key={a.id} a={a} />)}
      <Fig a={h} />
      <Fig a={k} />
      <Fig a={te} />
      {rings}
    </>
  );
};

/** Detention: Kenji at the front desk writing lines, the teacher standing over him. */
export const DetentionWorld: React.FC<{ t: number }> = ({ t }) => {
  const room = useMemo(() => classroom(), []);
  const s = seat(0, 1);
  const d0 = t - Q.detention;
  const writing: Pose = { ...sitPose(1), armRX: 2.0 + 0.2 * Math.sin(t * 14), armLX: 1.6, headX: 0.55, headY: 0.08 * Math.sin(t * 2) };
  // 1.3 s in he stops writing, slowly lifts his head and looks into the camera (sad), then sinks a little
  const look = step(d0 - 1.3, { stiffness: 90, damping: 18 });
  const sink = clamp01((d0 - 2.3) / 0.7);
  const sad: Pose = { ...sitPose(1), armRX: 0.9, armLX: 0.9, armRZ: 0.25, armLZ: -0.25, headX: -0.12 + 0.18 * sink, headY: 0.0, torsoX: -0.55 };
  const write = mixPose(writing, sad, clamp01(look));
  const glare: Pose = { ...REST, armRX: 1.2, armLX: 1.2, armRZ: -0.9, armLZ: 0.9, headX: 0.1, headY: -0.15 };
  const sinceD = t - Q.detention;
  return (
    <>
      <Voxels boxes={room} />
      <Character look={CAST.friendB} pose={write} p={[s[0], 0, s[2]]} yaw={PI} squash={1 + 0.05 * Math.exp(-sinceD * 6) * Math.sin(sinceD * 26)} />
      <Character look={CAST.teacher} pose={glare} p={[s[0] + 1.0, 0, s[2] + 0.1]} yaw={yawFor(-1, 0.1)} />
    </>
  );
};

export const OutsideWorld: React.FC<{ t: number }> = ({ t }) => {
  const set = useMemo(() => outside(), []);
  const u = clamp01((t - Q.out) / ARRIVE);
  const z = lerp(-3.2, 6.4, u * u * (3 - 2 * u));
  const arriving = u < 1;
  const cheer = clamp01(step(t - Q.out - ARRIVE, { stiffness: 480, damping: 13 }));
  const hop = arriving ? 0 : Math.max(0, Math.sin(clamp01((t - Q.out - ARRIVE) / 0.4) * PI)) * 0.5;
  const run = { ...walkPose((t - Q.out) * 15, 1, 0, true), torsoX: -0.3 };
  const pose = arriving ? run : mixPose(run, { ...REST, hipY: REST.hipY + hop, armLX: 2.9, armRX: 2.9, armLZ: -0.5, armRZ: 0.5, headX: -0.3 }, cheer);
  return (
    <>
      <Voxels boxes={set} />
      <Character look={CAST.hero} pose={pose} p={[0.35, hop, z]} yaw={yawFor(0.05, 1)} />
      {!arriving ? (
        <G p={[0.55, 1.7 + hop, z + 0.35]} r={[0, 0, 0.2]}><Voxels boxes={CHAI_GLASS} shadow={false} /></G>
      ) : null}
    </>
  );
};

export type { Cam };
