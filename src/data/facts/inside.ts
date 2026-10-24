// Facts added by the inside module. Owned by that module's builder.
import { f, type FactMap } from './factType';

export const insideFacts = {
  // Solar
  earthTiltDeg: f(23.44, '°', "Tilt of Earth's axis (sets how low the winter sun gets)", 'textbook', 'textbook'),

  // Battery chemistries: energy per kilogram (paper's ranges)
  lfpWhKgLow: f(90, 'Wh/kg', 'Lithium iron phosphate (LFP) energy per kilogram, low end', 'verify', 'paper'),
  lfpWhKgHigh: f(160, 'Wh/kg', 'Lithium iron phosphate (LFP) energy per kilogram, high end', 'verify', 'paper'),
  nmcWhKgLow: f(150, 'Wh/kg', 'NMC lithium energy per kilogram, low end', 'verify', 'paper'),
  nmcWhKgHigh: f(250, 'Wh/kg', 'NMC lithium energy per kilogram, high end', 'verify', 'paper'),
  sodiumWhKgLow: f(100, 'Wh/kg', 'Sodium-ion energy per kilogram, low end', 'verify', 'paper'),
  sodiumWhKgHigh: f(160, 'Wh/kg', 'Sodium-ion energy per kilogram, high end', 'verify', 'paper'),
  leadAcidWhKgLow: f(30, 'Wh/kg', 'Lead-acid energy per kilogram, low end', 'verify', 'paper'),
  leadAcidWhKgHigh: f(50, 'Wh/kg', 'Lead-acid energy per kilogram, high end', 'verify', 'paper'),

  // Fusion
  fiaNoElectricity2023: f(2023, 'year', 'Fusion Industry Association CEO, 2023: "No one has delivered electricity."', 'cited', 'fia2023'),
  nifBeams: f(192, 'beams', 'Laser beams at the National Ignition Facility', 'cited', 'nif2022'),
  nifGridDrawNote: f(0, 'note', 'The NIF lasers drew far more energy from the grid than the laser energy that reached the target (exact number still to verify)', 'verify', 'nif2022'),
  readinessCFS: f(0.6, 'stage', 'Our rough position of Commonwealth Fusion Systems on the readiness bar (0 = lab proof, 3 = many plants)', 'assumption', 'assumption'),
  readinessHelion: f(0.8, 'stage', 'Our rough position of Helion on the readiness bar (0 = lab proof, 3 = many plants)', 'assumption', 'assumption'),
  readinessNIF: f(0.15, 'stage', 'Our rough position of NIF (a science facility, not a power plant) on the readiness bar', 'assumption', 'assumption'),

  // Wind
  windCubeExponent: f(3, 'power', 'Wind power grows with the cube of wind speed', 'textbook', 'textbook'),
  windCutInMs: f(3, 'm/s', 'Typical wind speed where a turbine starts making power', 'assumption', 'assumption'),
  windRatedMs: f(12, 'm/s', 'Typical wind speed where a turbine reaches full power', 'assumption', 'assumption'),
  windCutOutMs: f(25, 'm/s', 'Typical wind speed where a turbine shuts down to protect itself', 'assumption', 'assumption'),

  // Gas
  gasInsidePlantMW: f(500, 'MW', 'Size of the gas turbine shown in the cutaway', 'assumption', 'assumption'),
} satisfies FactMap;
