// Shared pieces for the island plant models: unit geometries, a matte material cache, sim helpers,
// and soft rising puffs.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { stepIndex } from '../../engine/timeIndex';
import type { GenId } from '../../types';
import { OFF_GREY } from './plantFacts';

// ---------- geometries (unit sized, scaled per mesh) ----------
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  /** radius 0.5, height 1 */
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cylLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  /** radius 1 */
  sphere: new THREE.SphereGeometry(1, 20, 14),
  /** radius 1, top half */
  hemi: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  puff: new THREE.IcosahedronGeometry(1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
};

// ---------- matte materials ----------
const matCache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared matte material. Do not mutate the returned material (it is shared across plants). */
export function mat(color: string, opts: { rough?: number; metal?: number; opacity?: number; side?: THREE.Side } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.rough ?? 0.9}|${opts.metal ?? 0}|${opts.opacity ?? 1}|${opts.side ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    const transparent = opts.opacity != null && opts.opacity < 1;
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.9,
      metalness: opts.metal ?? 0,
      transparent,
      opacity: opts.opacity ?? 1,
      depthWrite: !transparent,
      side: opts.side ?? THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}

/** A private material the caller may animate (colour, opacity). */
export function ownMat(color: string, opts: { rough?: number; opacity?: number } = {}): THREE.MeshStandardMaterial {
  const transparent = opts.opacity != null && opts.opacity < 1;
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.9, metalness: 0, transparent, opacity: opts.opacity ?? 1, depthWrite: !transparent,
  });
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
/** Colour mixed toward a soft grey, used for accents when a plant is switched off. */
export function greyed(color: string, amount = 0.7): string {
  tmpA.set(color);
  tmpB.set(OFF_GREY);
  return '#' + tmpA.lerp(tmpB, amount).getHexString();
}

/** Accent colour that turns grey when the plant is off. */
export function accent(color: string, on: boolean): string {
  return on ? color : greyed(color);
}

// ---------- palette for neutral parts ----------
export const NEUTRAL = {
  white: '#f1f0ec',
  offWhite: '#e4e2dc',
  concrete: '#c9c6bf',
  concreteDark: '#a9a69f',
  steel: '#8e959b',
  dark: '#4a5058',
  panel: '#34404f',
  glass: '#bcd3df',
  roof: '#b9bcbe',
  window: '#7d8b97',
  lit: '#f1dfab',
  snow: '#eef2f5',
  sand: '#d8c39a',
  water: '#7fa8cf',
};

// ---------- store helpers ----------
/** True when a generator is switched on and has some size. Narrow store slice. */
export function usePlantOn(gen: GenId): boolean {
  return useApp((s) => s.input.plants[gen].on && s.input.plants[gen].gw > 0);
}

export function usePlantGw(gen: GenId): number {
  return useApp((s) => s.input.plants[gen].gw);
}

/** Current sim step, read without subscribing (call inside useFrame). */
export function simNow() {
  const s = useApp.getState();
  const r = s.result;
  const i = r && r.steps > 0 ? stepIndex(r, s.hourOfYear) : 0;
  /** False while the engine is still a stub returning zeros. */
  const live = !!r && r.totals.demandTWh > 0;
  return { s, r, i, live };
}

export function safe(v: number | undefined): number {
  return v != null && Number.isFinite(v) ? v : 0;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Output of a generator now as a fraction of its size (0..1). 0 when off.
 * While the engine is not live yet, returns `fallback` for a switched-on plant.
 */
export function genFrac(gen: GenId, fallback = 1): number {
  const { s, r, i, live } = simNow();
  const p = s.input.plants[gen];
  if (!p.on || p.gw <= 0) return 0;
  if (!live) return fallback;
  return clamp01(safe(r.supply[gen]?.[i]) / p.gw);
}

/** Exponential approach, frame-rate independent. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

// ---------- simple parts ----------
type V3 = [number, number, number];

/** A box with its bottom at y = p[1]. */
export function Block({ p, s, color, m, ry = 0, shadow = true }: {
  p: V3; s: V3; color?: string; m?: THREE.Material; ry?: number; shadow?: boolean;
}) {
  return (
    <mesh
      geometry={GEO.box}
      material={m ?? mat(color ?? NEUTRAL.white)}
      position={[p[0], p[1] + s[1] / 2, p[2]]}
      scale={s}
      rotation={[0, ry, 0]}
      castShadow={shadow}
      receiveShadow
    />
  );
}

/** A vertical cylinder with its bottom at y = p[1]. */
export function Cyl({ p, r, h, color, m, low = false, shadow = true }: {
  p: V3; r: number; h: number; color?: string; m?: THREE.Material; low?: boolean; shadow?: boolean;
}) {
  return (
    <mesh
      geometry={low ? GEO.cylLow : GEO.cyl}
      material={m ?? mat(color ?? NEUTRAL.white)}
      position={[p[0], p[1] + h / 2, p[2]]}
      scale={[r * 2, h, r * 2]}
      castShadow={shadow}
      receiveShadow
    />
  );
}

export interface InstanceItem { p: V3; s: V3; ry?: number; rx?: number; rz?: number }

const tmpObj = new THREE.Object3D();
/** Many boxes (or other unit geometry) in one draw call. Positions are box centres. */
export function Instanced({ items, geometry = GEO.box, material, shadow = true }: {
  items: InstanceItem[]; geometry?: THREE.BufferGeometry; material: THREE.Material; shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = Math.max(1, items.length);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, k) => {
      tmpObj.position.set(it.p[0], it.p[1], it.p[2]);
      tmpObj.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      tmpObj.scale.set(it.s[0], it.s[1], it.s[2]);
      tmpObj.updateMatrix();
      m.setMatrixAt(k, tmpObj.matrix);
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, n, geometry]);
  // Material goes in as a prop (not args) so swapping it does not rebuild the mesh and lose the matrices.
  return <instancedMesh ref={ref} args={[geometry, undefined, n]} material={material} castShadow={shadow} receiveShadow />;
}

// ---------- puffs (steam, exhaust) ----------
interface PuffState { age: number; life: number; x: number; z: number; alive: boolean }

/**
 * Soft rising puffs from a point. `rate()` is called every frame and returns 0..1
 * (0 = none, 1 = full rate). One draw call.
 */
export function Puffs({ origin, rate, color = '#ffffff', opacity = 0.45, max = 16, perSecond = 1.6, rise = 10, size = 1.2, drift = [0.6, 0.15] }: {
  origin: V3; rate: () => number; color?: string; opacity?: number; max?: number; perSecond?: number;
  rise?: number; size?: number; drift?: [number, number];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => ownMat(color, { opacity, rough: 1 }), [color, opacity]);
  const parts = useMemo<PuffState[]>(() => Array.from({ length: max }, () => ({ age: 0, life: 1, x: 0, z: 0, alive: false })), [max]);
  const acc = useRef(0);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    tmpObj.position.set(0, -1000, 0);
    tmpObj.scale.set(0, 0, 0);
    tmpObj.updateMatrix();
    for (let k = 0; k < max; k++) m.setMatrixAt(k, tmpObj.matrix);
    m.instanceMatrix.needsUpdate = true;
  }, [max]);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    const reduced = useApp.getState().reducedMotion;
    const r = clamp01(rate());
    acc.current += r * perSecond * (reduced ? 0.4 : 1) * dt;
    let anyAlive = false;
    for (let k = 0; k < max; k++) {
      const pt = parts[k];
      if (!pt.alive && acc.current >= 1) {
        acc.current -= 1;
        pt.alive = true;
        pt.age = 0;
        pt.life = (rise / 2.2) * (0.85 + Math.random() * 0.3);
        pt.x = (Math.random() - 0.5) * size * 0.6;
        pt.z = (Math.random() - 0.5) * size * 0.6;
      }
      if (pt.alive) {
        pt.age += dt;
        const t = pt.age / pt.life;
        if (t >= 1) {
          pt.alive = false;
          tmpObj.scale.set(0, 0, 0);
          tmpObj.position.set(0, -1000, 0);
        } else {
          anyAlive = true;
          const grow = 0.45 + t * 1.3;
          const fade = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
          const sc = size * grow * Math.max(0.05, fade);
          tmpObj.position.set(origin[0] + pt.x + drift[0] * t * rise * 0.3, origin[1] + t * rise, origin[2] + pt.z + drift[1] * t * rise * 0.3);
          tmpObj.scale.set(sc, sc, sc);
        }
        tmpObj.rotation.set(0, 0, 0);
        tmpObj.updateMatrix();
        m.setMatrixAt(k, tmpObj.matrix);
      }
    }
    if (acc.current > 1) acc.current = Math.min(acc.current, 1); // no backlog after a pause
    m.visible = anyAlive || acc.current > 0;
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[GEO.puff, material, max]} frustumCulled={false} />;
}
