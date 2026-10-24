// Places each plant model at its station, with click-to-select (fly to it and open its floating card).
import { Component, type ComponentType, type ReactNode } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useApp } from '../store';
import { STATIONS } from './layout';
import type { StationId } from '../types';
import {
  SolarFarm, BatteryYard, ReactorHall, FusionLab, GasPlant, WindRidge, HydroGeo,
  BatteryFactoryBuilding, IndustryQuarterBuildings, ReactorRow3D,
} from './plants';
import { setCursor } from './cursor';

/** Keeps one broken model (another module mid-edit) from taking down the whole 3D view. */
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

type PlantStation = Exclude<StationId, 'city'>;

const MODELS: Record<PlantStation, ComponentType> = {
  solar: SolarFarm,
  battery: BatteryYard,
  reactor: ReactorHall,
  fusion: FusionLab,
  gas: GasPlant,
  wind: WindRidge,
  hydro: HydroGeo,
  batteryFactory: BatteryFactoryBuilding,
  industry: IndustryQuarterBuildings,
};

const PLANT_STATIONS = Object.keys(MODELS) as PlantStation[];

const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const ringMat = new THREE.MeshStandardMaterial({ color: '#1f5f8b', roughness: 0.9, metalness: 0 });

export function selectAndFly(id: StationId) {
  const s = useApp.getState();
  s.selectDistrict(null);
  s.selectStation(id);
  s.flyTo(id);
}

export default function Stations() {
  const selected = useApp((s) => s.selectedStation);
  return (
    <group>
      {PLANT_STATIONS.map((id) => (
        <StationGroup key={id} id={id} selected={selected === id} />
      ))}
      <SafeBoundary name="ReactorRow3D">
        <ReactorRow3D />
      </SafeBoundary>
    </group>
  );
}

function StationGroup({ id, selected }: { id: PlantStation; selected: boolean }) {
  const st = STATIONS[id];
  const Model = MODELS[id];
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    selectAndFly(id);
  };
  return (
    <group
      position={[st.pos[0], 0, st.pos[1]]}
      onClick={onClick}
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
