// Facts added by the reactor module. Owned by that module's builder.
import { f, type FactMap } from './factType';

export const reactorFacts = {
  // Level 1: the plant
  pwrWaterTempC: f(315, '°C', 'Water temperature inside a pressurized water reactor (about)', 'textbook', 'textbook'),
  // Level 2: the core
  assembliesPerCore: f(193, 'bundles', 'Fuel bundles (assemblies) in a large pressurized water reactor core', 'textbook', 'textbook'),
  // Level 3: fuel assembly
  rodsPerAssembly: f(264, 'rods', 'Fuel rods in one 17 by 17 fuel bundle', 'textbook', 'textbook'),
  pelletsPerRod: f(350, 'pellets', 'Pellets stacked in one fuel rod (about)', 'textbook', 'textbook'),
  pelletSizeCm: f(1, 'cm', 'A fuel pellet is about 1 cm across, the size of a fingertip', 'textbook', 'textbook'),
  pelletCoalTonnes: f(1, 'tonne of coal', 'One pellet holds about as much energy as a tonne of coal (NEI comparison, not yet checked)', 'verify', 'textbook'),
  // Level 5: atoms
  carbonBurnEV: f(4, 'eV', 'Energy from burning one carbon atom (about 4 eV)', 'textbook', 'textbook'),
  fissionVsCarbonRatio: f(50_000_000, 'times', 'One uranium split (200 MeV) vs burning one carbon atom (4 eV)', 'textbook', 'textbook'),
  simU235Share: f(0.55, 'fraction', 'Share of U-235 in the atoms model (far more than real fuel, so a chain reaction fits in a small box)', 'assumption', 'assumption'),
  simDelayedShare: f(0.15, 'fraction', 'Share of delayed neutrons in the atoms model (enlarged so you can see it)', 'assumption', 'assumption'),
  simNuclei: f(300, 'atoms', 'Uranium atoms in the atoms model', 'assumption', 'assumption'),
  simNeutronCap: f(200, 'neutrons', 'Most neutrons drawn at once in the atoms model', 'assumption', 'assumption'),
  // Moon reactor sidebar
  krustyYear: f(2018, 'year', 'KRUSTY reactor demonstration', 'cited', 'nasaKilopower'),
  kilopowerYears: f(10, 'years', 'Kilopower runs for at least 10 years', 'cited', 'nasaKilopower'),
  fspLaunchYear: f(2029, 'year', '2025 directive: ready to launch by late 2029', 'cited', 'nasaFSP'),
} satisfies FactMap;
