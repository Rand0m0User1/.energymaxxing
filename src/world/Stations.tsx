// Places each plant model at its station, with click-to-select (opens its floating card).
import { Component, type ComponentType, type ReactNode } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useApp } from '../store';
import { STATIONS, stationsFor, type WorldStation } from './layout';
import { SolarFarm, BatteryYard, ReactorHall, GasPlant, WindRidge } from './plants';
import { setCursor } from './cursor';

/** Keeps one broken model from taking down the whole 3D view. */
export class SafeBoundary extends Component<{ children: ReactNode; name?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn(`[world] ${this.props.name ?? 'component'} failed to render`, err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type PlantStation = Exclude<WorldStation, 'city'>;

const MODELS: Record<PlantStation, ComponentType> = {
  solar: SolarFarm,
  battery: BatteryYard,
  reactor: ReactorHall,
  gas: GasPlant,
  wind: WindRidge,
};

const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const ringMat = new THREE.MeshStandardMaterial({ color: '#1f5f8b', roughness: 0.9, metalness: 0 });

export function selectStationClick(e: ThreeEvent<MouseEvent>, id: WorldStation) {
  e.stopPropagation();
  if (e.delta > 6) return;
  const s = useApp.getState();
  s.selectStation(s.selectedStation === id ? null : id);
}

export default function Stations() {
  const env = useApp((s) => s.env);
  const selected = useApp((s) => s.selectedStation);
  const ids = stationsFor(env).filter((id): id is PlantStation => id !== 'city');
  return (
    <group>
      {ids.map((id) => (
        <StationGroup key={id} id={id} selected={selected === id} />
      ))}
    </group>
  );
}

function StationGroup({ id, selected }: { id: PlantStation; selected: boolean }) {
  const st = STATIONS[id];
  const Model = MODELS[id];
  return (
    <group
      position={[st.pos[0], 0, st.pos[1]]}
      onClick={(e) => selectStationClick(e, id)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setCursor(true);
      }}
      onPointerOut={() => setCursor(false)}
    >
      <SafeBoundary name={id}>
        <Model />
      </SafeBoundary>
      {/* invisible ground disc so the whole footprint is clickable */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.12} material={hitMat}>
        <circleGeometry args={[st.radius, 32]} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.25} material={ringMat}>
          <ringGeometry args={[st.radius + 1.2, st.radius + 1.9, 64]} />
        </mesh>
      )}
    </group>
  );
}
