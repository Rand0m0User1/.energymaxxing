// Small shared 3D helpers for the inside views. Matte materials, Html labels, instancing helpers.
import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useApp } from '../store';

export type Vec3 = [number, number, number];

export const DEG = Math.PI / 180;

/** Plain matte material (SPEC §14). */
export function Matte({ color, opacity, double, depthWrite }: {
  color: string; opacity?: number; double?: boolean; depthWrite?: boolean;
}) {
  const transparent = opacity !== undefined && opacity < 1;
  return (
    <meshStandardMaterial
      color={color} roughness={0.9} metalness={0.04}
      transparent={transparent} opacity={opacity ?? 1}
      side={double ? THREE.DoubleSide : THREE.FrontSide}
      depthWrite={depthWrite ?? !transparent}
    />
  );
}

/** A small DOM label pinned to a 3D point. No fonts are fetched. */
export function Label({ position, children, muted }: { position: Vec3; children: ReactNode; muted?: boolean }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`inside-label${muted ? ' muted' : ''}`}>{children}</div>
    </Html>
  );
}

/** Default lights: hemisphere fill plus one soft-shadow sun. */
export function InsideLights({ sun = [8, 14, 6], size = 16 }: { sun?: Vec3; size?: number }) {
  return (
    <>
      <hemisphereLight args={['#f5f7f8', '#cfc9bc', 0.95]} />
      <directionalLight
        position={sun} intensity={1.5} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-size} shadow-camera-right={size}
        shadow-camera-top={size} shadow-camera-bottom={-size}
        shadow-camera-near={0.5} shadow-camera-far={120}
        shadow-bias={-0.0005}
      />
    </>
  );
}

export function Ground({ size = 60, color = '#dcdfd9', y = 0, position }: { size?: number | [number, number]; color?: string; y?: number; position?: Vec3 }) {
  const [w, d] = Array.isArray(size) ? size : [size, size];
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position ?? [0, y, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <Matte color={color} />
    </mesh>
  );
}

/** Write static instance matrices once. */
export function setInstances(mesh: THREE.InstancedMesh | null, count: number, fn: (i: number, o: THREE.Object3D) => void) {
  if (!mesh) return;
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    fn(i, o);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Seeded random numbers so layouts are stable between renders. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Animation speed multiplier: slower when the viewer prefers reduced motion. Safe to call inside useFrame. */
export function motionScale(): number {
  return useApp.getState().reducedMotion ? 0.35 : 1;
}

/** Clamp a frame delta so a stalled tab does not make particles jump. */
export function safeDt(dt: number): number {
  return Math.min(0.05, Math.max(0, dt)) * motionScale();
}

export function usd(v: number): string {
  return '$' + Math.round(v).toLocaleString('en-US');
}
