// Core facts from SPEC §1–10. Every number shown in the UI comes from the registry (src/data/facts.ts).
import { f, type FactMap } from './factType';

export const coreFacts = {
  // City
  cityAvgGW: f(1.0, 'GW', 'Average power use of the model city', 'assumption', 'paper'),
  cityPopulation: f(1_000_000, 'people', 'A city of about a million people', 'verify', 'assumption'),

  // Abu Dhabi benchmark
  abuDhabiSolarGW: f(5.2, 'GW', 'Solar in the Abu Dhabi round-the-clock project', 'cited', 'paper'),
  abuDhabiBatteryGWh: f(19, 'GWh', 'Batteries in the Abu Dhabi project', 'cited', 'paper'),
  abuDhabiSteadyGW: f(1, 'GW', 'Steady power delivered by the Abu Dhabi project', 'cited', 'paper'),

  // Solar
  solarAdded2025GW: f(647, 'GW', 'Solar added worldwide in 2025', 'cited', 'ember2025'),
  reactorsWorldCount: f(443, 'reactors', 'Nuclear reactors operating worldwide', 'cited', 'wna2025'),
  reactorsWorldGW: f(406, 'GW', 'Capacity of all nuclear reactors worldwide', 'cited', 'wna2025'),
  solarCFUS: f(0.234, 'fraction', 'US solar capacity factor (share of maximum made over a year)', 'cited', 'doeCF'),
  windCFUS: f(0.343, 'fraction', 'US wind capacity factor', 'cited', 'doeCF'),
  nuclearCFUS: f(0.92, 'fraction', 'US nuclear capacity factor (above 92%)', 'cited', 'doeCF'),
  nuclearCFWorld2024: f(0.83, 'fraction', 'Global nuclear fleet capacity factor in 2024', 'cited', 'wna2025'),
  solarCostDeclinePerYear: f(0.15, 'fraction/yr', 'Solar costs fell about 15% per year (long-run study)', 'cited', 'way2022'),
  solarInstalledCostFallSince2010: f(0.87, 'fraction', 'Installed solar costs fell 87% since 2010', 'cited', 'irena'),
  solarLearningRateOverall: f(0.26, 'fraction', 'Solar learning rate, 1976–2025 (per doubling)', 'cited', 'handmer2025'),
  solarLearningRateSince2007: f(0.48, 'fraction', 'Solar production-weighted learning rate since 2007', 'cited', 'handmer2025'),

  // Lazard 2026 LCOE ranges ($/MWh)
  lcoeSolarLow: f(40, '$/MWh', 'Utility solar, low end', 'cited', 'lazard2026'),
  lcoeSolarHigh: f(98, '$/MWh', 'Utility solar, high end', 'cited', 'lazard2026'),
  lcoeWindLow: f(37, '$/MWh', 'Onshore wind, low end', 'cited', 'lazard2026'),
  lcoeWindHigh: f(99, '$/MWh', 'Onshore wind, high end', 'cited', 'lazard2026'),
  lcoeNuclearLow: f(175, '$/MWh', 'New US nuclear, low end', 'cited', 'lazard2026'),
  lcoeNuclearHigh: f(255, '$/MWh', 'New US nuclear, high end', 'cited', 'lazard2026'),
  lcoeGasLow: f(51, '$/MWh', 'Combined-cycle gas, low end', 'cited', 'lazard2026'),
  lcoeGasHigh: f(129, '$/MWh', 'Combined-cycle gas, high end', 'cited', 'lazard2026'),
  lcoeFusionLow: f(140, '$/MWh', 'Tokamak fusion estimate, low end', 'cited', 'paper'),
  lcoeFusionHigh: f(550, '$/MWh', 'Tokamak fusion estimate, high end', 'cited', 'paper'),
  lcoeGeothermalLow: f(66, '$/MWh', 'Geothermal, low end', 'verify', 'lazard2026'),
  lcoeGeothermalHigh: f(109, '$/MWh', 'Geothermal, high end', 'verify', 'lazard2026'),
  lcoeHydroLow: f(50, '$/MWh', 'Existing hydro, low end', 'assumption', 'assumption'),
  lcoeHydroHigh: f(110, '$/MWh', 'Hydro, high end', 'assumption', 'assumption'),
  lcoeStorageAdderLow: f(60, '$/MWh', 'Battery storage, added cost per MWh shifted, low end', 'assumption', 'lazard2026'),
  lcoeStorageAdderHigh: f(130, '$/MWh', 'Battery storage, added cost per MWh shifted, high end', 'assumption', 'lazard2026'),
  storageCostRiseSince2020: f(0.27, 'fraction', 'US storage cost per MWh rose about 27% since 2020', 'cited', 'lazard2026'),

  // Batteries
  batteryPackPrice2025: f(70, '$/kWh', 'Stationary battery pack price, 2025', 'cited', 'bnef2025'),
  batteryPackFall2025: f(0.45, 'fraction', 'Stationary pack prices fell 45% in 2025', 'cited', 'bnef2025'),
  batterySystemPNNL2021: f(385, '$/kWh', 'Installed 100 MW, 4-hour battery system (2021 data)', 'cited', 'pnnl2022'),
  batterySystemPNNL2030: f(291, '$/kWh', 'Installed 100 MW, 4-hour LFP system by 2030', 'cited', 'pnnl2022'),
  batteryRoundTrip: f(0.85, 'fraction', 'Battery round-trip efficiency (100 in, about 85 out)', 'assumption', 'assumption'),
  containerMWh: f(5, 'MWh', 'Energy in one 20-foot battery container', 'verify', 'assumption'),
  batteryLearningRate: f(0.18, 'fraction', 'Battery pack learning rate per doubling of production', 'verify', 'assumption'),
  liIonWhPerKg: f(200, 'Wh/kg', 'Lithium battery energy per kilogram (pack level)', 'cited', 'paper'),

  // Fission
  vogtleReactorMW: f(1117, 'MW', 'Size of each Vogtle 3 and 4 reactor', 'cited', 'paper'),
  vogtleCostB: f(30, '$ billion', 'Vogtle 3 and 4 total cost (more than)', 'cited', 'paper'),
  vogtlePerKW: f(13400, '$/kW', 'Vogtle cost per kW (our division: $30B / 2,234 MW)', 'cited', 'paper'),
  fissionTargetPerKW: f(3000, '$/kW', 'Price at which fission competes almost everywhere in our model', 'cited', 'paper'),
  fissionOM: f(14, '$/MWh', 'Fission operations and maintenance', 'cited', 'paper'),
  fissionFuel: f(10, '$/MWh', 'Fission fuel', 'cited', 'paper'),
  fissionOutageWeeks: f(3, 'weeks', 'Refuelling outage length', 'assumption', 'doeCF'),
  fissionOutageEveryMonths: f(18, 'months', 'Refuelling every 18 months', 'assumption', 'doeCF'),
  haleuAward: f(900, '$ million', 'Awarded to build US HALEU fuel supply (General Matter, American Centrifuge Operating)', 'cited', 'paper'),
  u235NormalLow: f(0.03, 'fraction', 'U-235 share in normal reactor fuel, low', 'textbook', 'textbook'),
  u235NormalHigh: f(0.05, 'fraction', 'U-235 share in normal reactor fuel, high', 'textbook', 'textbook'),
  haleuLow: f(0.05, 'fraction', 'HALEU U-235 share, low', 'textbook', 'textbook'),
  haleuHigh: f(0.20, 'fraction', 'HALEU U-235 share, high', 'textbook', 'textbook'),
  neutronsPerFission: f(2.4, 'neutrons', 'Average new neutrons per split', 'textbook', 'textbook'),
  mevPerFission: f(200, 'MeV', 'Energy released per uranium split', 'textbook', 'textbook'),
  joulesPerFission: f(3.2e-11, 'J', 'Energy per split in joules', 'textbook', 'textbook'),
  delayedNeutronShare: f(0.0065, 'fraction', 'Share of neutrons that come out seconds later (under 1%)', 'textbook', 'textbook'),
  antaresCriticalityDate: f(20260604, 'date', 'Antares: first in DOE Reactor Pilot Program to reach zero-power criticality (June 4, 2026)', 'verify', 'paper'),
  valarCriticalityDate: f(20260618, 'date', 'Valar Atomics: second (June 18, 2026)', 'verify', 'paper'),
  kilopowerKW: f(10, 'kW', 'Kilopower: up to 10 kW for at least 10 years', 'cited', 'nasaKilopower'),
  fspTargetKW: f(40, 'kW', 'NASA fission surface power target: 40 kW', 'cited', 'nasaFSP'),
  fspTargetTonnes: f(6, 'tonnes', 'Fission surface power target mass: under six tonnes', 'cited', 'nasaFSP'),
  fsp2025DirectiveKW: f(100, 'kW', '2025 directive: at least 100 kW, ready to launch by late 2029', 'cited', 'nasaFSP'),

  // Fusion
  googleCfsMW: f(200, 'MW', 'Google agreed to buy 200 MW from CFS\'s first ARC plant (early 2030s)', 'cited', 'paper'),
  helionMicrosoftYear: f(2028, 'year', 'Microsoft agreed to buy electricity from Helion starting 2028', 'cited', 'paper'),
  nifOutMJ: f(3.15, 'MJ', 'NIF fusion energy out, Dec 5, 2022', 'cited', 'nif2022'),
  nifInMJ: f(2.05, 'MJ', 'NIF laser energy in, Dec 5, 2022', 'cited', 'nif2022'),
  mevPerDT: f(17.6, 'MeV', 'Energy per deuterium–tritium fusion', 'textbook', 'textbook'),
  fusionMinYear: f(2035, 'year', 'Earliest year fusion is available in the City Lab (speculative)', 'assumption', 'assumption'),

  // Gas
  gasCO2PerMWh: f(0.4, 't/MWh', 'CO2 from a gas plant per MWh', 'verify', 'assumption'),

  // Demand
  dcTWh2025: f(485, 'TWh', 'World data centre electricity use, 2025', 'cited', 'iea2025'),
  dcTWh2030: f(950, 'TWh', 'World data centre electricity use, 2030 (projected)', 'cited', 'iea2025'),
  usDcShare2023: f(0.044, 'fraction', 'US data centers share of US electricity, 2023', 'cited', 'lbnl2024'),
  usDcShare2028Low: f(0.067, 'fraction', 'US data centers share by 2028, low', 'cited', 'lbnl2024'),
  usDcShare2028High: f(0.12, 'fraction', 'US data centers share by 2028, high', 'cited', 'lbnl2024'),
  dcPowerCostPerYearB: f(0.6, '$ billion/yr', 'Power cost of a 1 GW data center per year', 'cited', 'epoch2026'),
  dcServerCostB: f(5, '$ billion', 'Server cost of a 1 GW data center', 'cited', 'epoch2026'),
  dcFlexShare: f(0.3, 'fraction', 'Share of data center load that can pause', 'assumption', 'norris2025'),
  dcFlexHours: f(4, 'hours', 'How long the flexible load can pause', 'assumption', 'norris2025'),
  homeMWhPerMonth: f(0.9, 'MWh/month', 'Average US home electricity use per month', 'verify', 'eia2017'),
  generationShare2007: f(0.69, 'fraction', 'Generation share of utility costs, a decade earlier', 'cited', 'eia2017'),
  generationShare2017: f(0.54, 'fraction', 'Generation share of utility costs, 2017', 'cited', 'eia2017'),

  // System studies
  sepulvedaNoFirmLow: f(5, '× peak', 'Capacity needed without firm power, low', 'cited', 'sepulveda2018'),
  sepulvedaNoFirmHigh: f(8, '× peak', 'Capacity needed without firm power, high', 'cited', 'sepulveda2018'),
  sepulvedaFirmLow: f(1.3, '× peak', 'Capacity needed with firm power, low', 'cited', 'sepulveda2018'),
  sepulvedaFirmHigh: f(2.6, '× peak', 'Capacity needed with firm power, high', 'cited', 'sepulveda2018'),

  // Off Earth
  solarConstant: f(1361, 'W/m²', 'Sunlight above the atmosphere', 'textbook', 'textbook'),
  leoPeriodMin: f(90, 'min', 'Low Earth orbit period', 'textbook', 'textbook'),
  leoShadowMin: f(36, 'min', 'Shadow per low Earth orbit', 'textbook', 'textbook'),
  geoEclipseMaxMin: f(72, 'min', 'Longest daily eclipse in geostationary orbit (eclipse seasons)', 'cited', 'noaaGoes'),
  lunarNightH: f(350, 'h', 'Lunar night at the equator (about 14.5 Earth days)', 'textbook', 'textbook'),
  lunarCycleDays: f(29.53, 'days', 'Lunar day–night cycle', 'textbook', 'textbook'),
  lunarPeakLit: f(0.8, 'fraction', 'Some lunar south pole peaks are lit more than 80% of the time', 'cited', 'paper'),
  lunarMastLit: f(0.9, 'fraction', 'A 10 m mast gives an area lit more than 90%', 'cited', 'paper'),
  lunarNightBatteryKg: f(1750, 'kg', 'Battery mass for 1 kW through a 350 h lunar night at 200 Wh/kg', 'cited', 'paper'),
  marsSolH: f(24.66, 'h', 'Mars day (sol)', 'textbook', 'textbook'),
  marsIrradiance: f(586.2, 'W/m²', 'Sunlight at Mars (0.431 × Earth)', 'textbook', 'textbook'),
  marsDustStormFactor: f(0.1, 'fraction', 'Solar output during a dust storm', 'assumption', 'assumption'),
  marsDustStormSols: f(30, 'sols', 'Dust storm length', 'assumption', 'assumption'),
  launchCostPerKg: f(1500, '$/kg', 'Launch cost to low Earth orbit (large reusable rocket, today)', 'verify', 'assumption'),
  surfaceDeliveryMultiplier: f(10, '×', 'Extra cost to land a kilogram on the Moon or Mars vs low orbit', 'assumption', 'assumption'),
} satisfies FactMap;
