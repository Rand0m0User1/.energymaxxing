// Camera modes: orbit (damped OrbitControls), map (high top-down view), walk (WASD at eye height, drag to look).
// Fly-to on flyNonce, slow orbit on the title screen, and nearStation tracking.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useApp } from '../store';
import { EYE_HEIGHT, ISLAND_RADIUS, RUN_SPEED, STATIONS, WALK_SPEED, type Station } from './layout';
import { OBSTACLES } from './cityLayout';
import { STATION_IDS, type CameraMode, type StationId } from '../types';

type Kind = 'orbit' | 'walk' | 'map';
interface Tween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
  dur: number;
  kind: Kind;
}

/** Minimal shape of the three-stdlib OrbitControls we use. */
interface Controls {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
}

const PLAYER_R = 0.7;
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const DEFAULT_ORBIT_POS = new THREE.Vector3(70, 150, 215);
const MAP_POS = new THREE.Vector3(0, 440, 45);
const FLY_S = 1.2;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Push a ground point out of obstacles and keep it on the island. */
export function resolveWalk(p: { x: number; z: number }) {
  for (let iter = 0; iter < 3; iter++) {
    for (const o of OBSTACLES) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + PLAYER_R;
      if (d < min) {
        if (d < 1e-4) {
          p.x = o.x + min;
          continue;
        }
        p.x = o.x + (dx / d) * min;
        p.z = o.z + (dz / d) * min;
      }
    }
  }
  const r = Math.hypot(p.x, p.z);
  const lim = ISLAND_RADIUS - 3;
  if (r > lim) {
    p.x *= lim / r;
    p.z *= lim / r;
  }
}

function frontOf(st: Station): THREE.Vector3 {
  let dx = st.view[0];
  let dz = st.view[2];
  let len = Math.hypot(dx, dz);
  if (len < 1e-3) {
    dx = -st.pos[0];
    dz = -st.pos[1];
    len = Math.hypot(dx, dz) || 1;
  }
  const p = { x: st.pos[0] + (dx / len) * (st.radius + 8), z: st.pos[1] + (dz / len) * (st.radius + 8) };
  resolveWalk(p);
  return new THREE.Vector3(p.x, EYE_HEIGHT, p.z);
}

/**
 * Station nearest a ground point, or null if none is within its radius + margin.
 * byEdge ranks by distance to the footprint edge (walking), otherwise by distance to the centre (orbit target).
 */
export function nearestStation(x: number, z: number, margin = 18, byEdge = false): StationId | null {
  let best: StationId | null = null;
  let bestD = Infinity;
  for (const id of STATION_IDS) {
    const st = STATIONS[id];
    const d = Math.hypot(x - st.pos[0], z - st.pos[1]);
    if (d >= st.radius + margin) continue;
    const score = byEdge ? d - st.radius : d;
    if (score < bestD) {
      best = id;
      bestD = score;
    }
  }
  return best;
}

/** nearStation rule: orbit uses the controls target (radius + 12), walk the camera (radius + 18); the city counts as none. */
export function nearStationFor(mode: CameraMode, focus: { x: number; z: number }): StationId | null {
  if (mode === 'map') return null;
  const id = mode === 'walk' ? nearestStation(focus.x, focus.z, 18, true) : nearestStation(focus.x, focus.z, 12, false);
  return id === 'city' ? null : id;
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

const WALK_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

export default function CameraRig() {
  const mode = useApp((s) => s.cameraMode);
  const screen = useApp((s) => s.screen);
  const flyNonce = useApp((s) => s.flyNonce);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controlsRef = useRef<Controls | null>(null);
  const tween = useRef<Tween | null>(null);
  const walk = useRef({ yaw: 0, pitch: -0.05 });
  const keys = useRef(new Set<string>());
  const prev = useRef<{ mode: CameraMode; screen: string; nonce: number }>({ mode: 'orbit', screen: 'title', nonce: flyNonce });
  const titleAngle = useRef(0.6);
  const nearTimer = useRef(0);

  // ---------- helpers ----------
  /** Point the camera looks at right now, at the distance of the next target (keeps the turn continuous). */
  const lookTarget = (toTarget: THREE.Vector3): THREE.Vector3 => {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const d = Math.max(5, camera.position.distanceTo(toTarget));
    return camera.position.clone().addScaledVector(fwd, d);
  };

  const finish = (tw: { toPos: THREE.Vector3; toTarget: THREE.Vector3; kind: Kind }) => {
    camera.position.copy(tw.toPos);
    // Re-evaluate nearStation on the next frame (the target is now the station centre).
    nearTimer.current = 0;
    if (tw.kind === 'walk') {
      const d = tw.toTarget.clone().sub(tw.toPos);
      walk.current.yaw = Math.atan2(-d.x, -d.z);
      walk.current.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(d.y, Math.hypot(d.x, d.z))));
      camera.rotation.set(walk.current.pitch, walk.current.yaw, 0, 'YXZ');
    } else {
      camera.lookAt(tw.toTarget);
      const c = controlsRef.current;
      if (c) {
        c.target.copy(tw.toTarget);
        c.update();
      }
    }
  };

  const startTween = (toPos: THREE.Vector3, toTarget: THREE.Vector3, kind: Kind) => {
    const tw = { fromPos: camera.position.clone(), toPos, fromTarget: lookTarget(toTarget), toTarget, t: 0, dur: FLY_S, kind };
    // No station prompt while flying: the old one would point at the place we are leaving.
    useApp.getState().setNearStation(null);
    if (useApp.getState().reducedMotion) {
      tween.current = null;
      finish(tw);
      return;
    }
    tween.current = tw;
  };

  const flyToStation = (id: StationId, m: CameraMode) => {
    const st = STATIONS[id];
    if (m === 'walk') {
      startTween(frontOf(st), new THREE.Vector3(st.pos[0], 3, st.pos[1]), 'walk');
    } else {
      const target = new THREE.Vector3(st.pos[0], 2, st.pos[1]);
      const pos = target.clone().add(new THREE.Vector3(st.view[0], st.view[1], st.view[2]));
      startTween(pos, target, 'orbit');
    }
  };

  const enterMode = (m: CameraMode, from: CameraMode, fromTitle: boolean) => {
    const c = controlsRef.current;
    if (m === 'map') {
      startTween(MAP_POS.clone(), DEFAULT_TARGET.clone(), 'map');
    } else if (m === 'orbit') {
      if (fromTitle) {
        startTween(DEFAULT_ORBIT_POS.clone(), DEFAULT_TARGET.clone(), 'orbit');
      } else if (from === 'walk') {
        const yaw = walk.current.yaw;
        const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const target = new THREE.Vector3(camera.position.x, 0, camera.position.z).addScaledVector(fwd, 30);
        clampTarget(target);
        const pos = target.clone().addScaledVector(fwd, -75).add(new THREE.Vector3(0, 60, 0));
        startTween(pos, target, 'orbit');
      } else {
        const target = c ? c.target.clone() : DEFAULT_TARGET.clone();
        target.y = 0;
        clampTarget(target);
        startTween(target.clone().add(new THREE.Vector3(0, 120, 165)), target, 'orbit');
      }
    } else {
      // walk: step down in front of the station nearest the current focus
      const focus = c && from !== 'walk' ? c.target.clone() : DEFAULT_TARGET.clone();
      const near = nearestStation(focus.x, focus.z) ?? 'city';
      const st = STATIONS[near];
      startTween(frontOf(st), new THREE.Vector3(st.pos[0], EYE_HEIGHT + 1, st.pos[1]), 'walk');
    }
  };

  // ---------- react to store changes ----------
  useEffect(() => {
    const p = prev.current;
    const nonceChanged = flyNonce !== p.nonce;
    prev.current = { mode, screen, nonce: flyNonce };
    if (screen === 'title') {
      tween.current = null;
      return;
    }
    const target = useApp.getState().cameraTarget;
    if (nonceChanged && target) {
      flyToStation(target, mode);
      return;
    }
    if (p.screen === 'title' || p.mode !== mode) enterMode(mode, p.mode, p.screen === 'title');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, screen, flyNonce]);

  // ---------- keyboard (walk) ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!WALK_KEYS.has(e.code)) return;
      keys.current.add(e.code);
      if (useApp.getState().cameraMode === 'walk' && e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // ---------- mouse drag to look (walk) ----------
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if (useApp.getState().cameraMode !== 'walk') return;
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      walk.current.yaw -= dx * 0.0035;
      walk.current.pitch = Math.max(-1.2, Math.min(1.2, walk.current.pitch - dy * 0.0035));
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  // ---------- per frame ----------
  useFrame((_, rawDt) => {
    const s = useApp.getState();
    if (s.inside) return;
    const dt = Math.min(rawDt, 0.1);
    const c = controlsRef.current;

    // Title: slow orbit around the island.
    if (s.screen === 'title') {
      if (c) c.enabled = false;
      titleAngle.current += dt * (s.reducedMotion ? 0.015 : 0.05);
      const a = titleAngle.current;
      camera.position.set(Math.cos(a) * 285, 115, Math.sin(a) * 285);
      camera.lookAt(0, 6, 0);
      if (c) c.target.set(0, 0, 0);
      s.setNearStation(null);
      return;
    }

    const tw = tween.current;
    if (tw) {
      if (c) c.enabled = false;
      tw.t += dt / tw.dur;
      if (tw.t >= 1) {
        tween.current = null;
        finish(tw);
      } else {
        const e = ease(tw.t);
        camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
        const look = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.toTarget, e);
        camera.lookAt(look);
        if (c && tw.kind !== 'walk') c.target.copy(look);
      }
    } else if (s.cameraMode === 'walk') {
      if (c) c.enabled = false;
      const k = keys.current;
      let f = 0;
      let r = 0;
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) r += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) r -= 1;
      const yaw = walk.current.yaw;
      if (f !== 0 || r !== 0) {
        const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;
        let dx = -Math.sin(yaw) * f + Math.cos(yaw) * r;
        let dz = -Math.cos(yaw) * f - Math.sin(yaw) * r;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;
        const p = { x: camera.position.x + dx * speed * dt, z: camera.position.z + dz * speed * dt };
        resolveWalk(p);
        camera.position.x = p.x;
        camera.position.z = p.z;
      }
      camera.position.y = EYE_HEIGHT;
      camera.rotation.set(walk.current.pitch, yaw, 0, 'YXZ');
    } else if (c) {
      c.enabled = true;
      clampTarget(c.target);
      if (camera.position.y < 3) camera.position.y = 3;
    }

    // nearStation (throttled)
    nearTimer.current -= dt;
    if (nearTimer.current <= 0) {
      nearTimer.current = 0.25;
      if (tween.current) {
        s.setNearStation(null);
      } else {
        const focus = s.cameraMode === 'walk' || !c ? camera.position : c.target;
        s.setNearStation(nearStationFor(s.cameraMode, focus));
      }
    }
  });

  const isMap = mode === 'map';
  return (
    <OrbitControls
      ref={controlsRef as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={isMap ? 120 : 12}
      maxDistance={isMap ? 620 : 560}
      minPolarAngle={0}
      maxPolarAngle={isMap ? 0.3 : Math.PI / 2 - 0.1}
      enableRotate={!isMap}
      screenSpacePanning={false}
      zoomSpeed={0.8}
      mouseButtons={isMap ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    />
  );
}

function clampTarget(t: THREE.Vector3) {
  const r = Math.hypot(t.x, t.z);
  const lim = ISLAND_RADIUS + 30;
  if (r > lim) {
    t.x *= lim / r;
    t.z *= lim / r;
  }
  if (t.y < 0) t.y = 0;
  if (t.y > 30) t.y = 30;
}
