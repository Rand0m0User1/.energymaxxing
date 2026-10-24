// Plant components for the island. Each renders centred at its own origin (the world places it at STATIONS[id].pos),
// reads what it needs from the store, takes no required props. Owned by the plants module.
export { default as SolarFarm } from './SolarFarm';
export { default as BatteryYard } from './BatteryYard';
export { default as ReactorHall } from './ReactorHall';
export { default as FusionLab } from './FusionLab';
export { default as GasPlant } from './GasPlant';
export { default as WindRidge } from './WindRidge';
export { default as HydroGeo } from './HydroGeo';
export { default as BatteryFactoryBuilding } from './BatteryFactoryBuilding';
export { default as IndustryQuarterBuildings } from './IndustryQuarterBuildings';
/** Rendered by the world at REACTOR_ROW.start (absolute coordinates are handled inside using layout.ts). */
export { default as ReactorRow3D } from './ReactorRow3D';
