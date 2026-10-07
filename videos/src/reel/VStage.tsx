// The reel's 3D stage: a vertical 1080x1920 ThreeCanvas with a camera, a sun with shadows, optional sky colour
// and fog, or transparent (voxels over a 2D colour field). Reuses the game-accurate voxel renderer from
// ../launch/three.tsx (Voxels, Character, G). `vToScreen` pins 2D UI to 3D points for the same camera.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import type { Cam } from "../launch/camera3d";
import type { V3 } from "../launch/voxel";
import { H, W } from "./cues";

export type { Cam };

/** Like launch/camera3d applyCam, but for the vertical frame. `fov` is the VERTICAL field of view. */
export function applyCamV(camera: THREE.PerspectiveCamera, c: Cam) {
  camera.position.set(...c.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...c.look);
  if (c.roll) camera.rotateZ(c.roll);
  camera.fov = c.fov;
  camera.aspect = W / H;
  camera.near = 0.05;
  camera.far = 400;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/**
 * Convert a 16:9 camera fov (vertical degrees at 1920x1080) to the vertical fov that shows the same
 * HORIZONTAL width in 1080x1920 times `keep` (1 = same width, taller view; 0.6 = crop the sides).
 */
export function fovFor169(fov169: number, keep = 0.62) {
  const h = 2 * Math.atan(Math.tan((fov169 * Math.PI) / 360) * (1920 / 1080)) * keep; // horizontal fov kept
  return (2 * Math.atan(Math.tan(h / 2) * (H / W)) * 180) / Math.PI;
}

const _cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
const _v = new THREE.Vector3();
/** Screen position (px, 1080x1920) of a world point for a camera. */
export function vToScreen(cam: Cam, p: V3) {
  applyCamV(_cam, cam);
  _v.set(...p).project(_cam);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind: _v.z > 1 };
}

const CamRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  applyCamV(camera, cam);
  return null;
};

const Sun: React.FC<{ target: V3; dir: V3; tint: string; sun: number; amb: number; size: number }> = ({ target, dir, tint, sun, amb, size }) => {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff4e0", sun);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    return l;
  }, []);
  light.intensity = sun;
  const c = light.shadow.camera as THREE.OrthographicCamera;
  c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 90;
  c.updateProjectionMatrix();
  light.position.set(target[0] + dir[0], target[1] + dir[1], target[2] + dir[2]);
  light.target.position.set(...target);
  light.target.updateMatrixWorld();
  return (
    <>
      <hemisphereLight args={[tint, "#b8a888", amb]} />
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

/**
 * <VStage cam={...} bg="#8dd0ef" fog={[near, far]}>...voxels...</VStage>
 * `bg: null` = transparent canvas. `dir`: sun direction from the target. `size`: shadow half-extent (m).
 */
export const VStage: React.FC<{
  cam: Cam; bg?: string | null; fog?: [number, number]; dir?: V3; tint?: string; sun?: number; amb?: number; target?: V3; size?: number;
  blur?: number; style?: React.CSSProperties; children?: React.ReactNode;
}> = ({ cam, bg = "#8dd0ef", fog, dir = [9, 16, -11], tint = "#ffffff", sun = 1.9, amb = 1.0, target, size = 12, blur = 0, style, children }) => (
  <div style={{ position: "absolute", inset: 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, ...style }}>
    <ThreeCanvas width={W} height={H} flat shadows gl={{ antialias: true, preserveDrawingBuffer: true, alpha: bg === null }} dpr={1}>
      <CamRig cam={cam} />
      {bg ? <color attach="background" args={[bg]} /> : null}
      {fog && bg ? <fog attach="fog" args={[bg, fog[0], fog[1]]} /> : null}
      <Sun target={target ?? cam.look} dir={dir} tint={tint} sun={sun} amb={amb} size={size} />
      {children}
    </ThreeCanvas>
  </div>
);
