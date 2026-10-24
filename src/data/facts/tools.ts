// Facts added by the tools module (Reactor Row, capital stack, Battery Factory, Industry Quarter, Beyond Earth).
// Owned by that module's builder. Keys are prefixed rr / cs / bf / iq / be to avoid clashes.
import { f, type FactMap } from './factType';

export const toolsFacts = {
  // ---- Reactor Row (SPEC §10.2) ----
  rrLearnUS: f(-0.08, 'fraction', 'US history: cost change per doubling of reactors built (our reading of Eash-Gates et al.; costs rose)', 'assumption', 'eashgates2020'),
  rrLearnFrance: f(-0.04, 'fraction', 'France: cost change per doubling of reactors built (our reading of Grubler, "negative learning")', 'assumption', 'grubler2010'),
  rrLearnKorea: f(0.1, 'fraction', 'South Korea: cost change per doubling of reactors built (our reading of Lovering et al.; costs fell)', 'assumption', 'lovering2016'),
  rrSoftCostShare: f(0.5, 'fraction', 'US plants 1976–1987: "soft" factors outside the hardware caused over half of the cost rise', 'cited', 'eashgates2020'),
  rrCustomMin: f(-0.1, 'fraction', 'Lowest learning rate on the "Your choice" slider', 'assumption', 'assumption'),
  rrCustomMax: f(0.2, 'fraction', 'Highest learning rate on the "Your choice" slider', 'assumption', 'assumption'),
  rrPads: f(10, 'reactors', 'Building pads in Reactor Row', 'assumption', 'assumption'),
  rrLifeYears: f(40, 'years', 'Reactor life used in the cost formula (paper calculator)', 'cited', 'paper'),

  // ---- Capital stack (SPEC §10.3): share of the money for reactor 1 (FOAK) and reactor 10 (NOAK) ----
  csShareVcFoak: f(0.15, 'fraction', 'Design and licensing (venture capital): share of money, first reactor', 'assumption', 'assumption'),
  csShareVcNoak: f(0.01, 'fraction', 'Design and licensing (venture capital): share of money, tenth reactor', 'assumption', 'assumption'),
  csShareGovFoak: f(0.35, 'fraction', 'Government grants, cost-share, loan guarantees: share, first reactor', 'assumption', 'assumption'),
  csShareGovNoak: f(0.02, 'fraction', 'Government grants, cost-share, loan guarantees: share, tenth reactor', 'assumption', 'assumption'),
  csShareFuelFoak: f(0.1, 'fraction', 'Fuel supply contracts: share, first reactor', 'assumption', 'assumption'),
  csShareFuelNoak: f(0.04, 'fraction', 'Fuel supply contracts: share, tenth reactor', 'assumption', 'assumption'),
  csSharePpaFoak: f(0.25, 'fraction', 'Long-term power deals from tech companies: share, first reactor', 'assumption', 'assumption'),
  csSharePpaNoak: f(0.23, 'fraction', 'Long-term power deals from tech companies: share, tenth reactor', 'assumption', 'assumption'),
  csShareDebtFoak: f(0.15, 'fraction', 'Utilities and infrastructure funds (cheap debt): share, first reactor', 'assumption', 'assumption'),
  csShareDebtNoak: f(0.7, 'fraction', 'Utilities and infrastructure funds (cheap debt): share, tenth reactor', 'assumption', 'assumption'),
  csReturnVc: f(0.3, 'fraction/yr', 'Yearly return venture investors expect', 'assumption', 'assumption'),
  csReturnGov: f(0.04, 'fraction/yr', 'Yearly cost of government-backed money', 'assumption', 'assumption'),
  csReturnFuel: f(0.06, 'fraction/yr', 'Yearly cost of money behind fuel contracts', 'assumption', 'assumption'),
  csReturnPpa: f(0.1, 'fraction/yr', 'Yearly return for project owners backed by power deals', 'assumption', 'assumption'),
  csReturnDebt: f(0.05, 'fraction/yr', 'Yearly cost of utility and infrastructure debt', 'assumption', 'assumption'),

  // ---- Battery Factory (SPEC §12) ----
  bfPackNMC: f(105, '$/kWh', 'NMC battery pack price, starting point', 'verify', 'bnef2025'),
  bfPackSodium: f(90, '$/kWh', 'Sodium-ion battery pack price, starting point', 'verify', 'assumption'),
  bfMaxDoublings: f(8, 'doublings', 'Most doublings of total production in the Battery Factory', 'assumption', 'assumption'),
  bfPackShareOfSystem: f(0.33, 'fraction', 'Battery pack share of an installed grid battery system today (about a third)', 'assumption', 'assumption'),
  bfNonPackLearningRate: f(0.05, 'fraction', 'Learning rate of the rest of the system (wiring, land, labor, permits, inverters)', 'assumption', 'assumption'),
  bfQueueYears: f(5, 'years', 'Typical US wait from asking for a grid connection to switching on', 'verify', 'assumption'),
  bfGraphiteTopShare: f(0.9, 'fraction', 'Share of battery graphite processed in one country (China)', 'verify', 'assumption'),
  bfTransformerWaitYears: f(2, 'years', 'Typical wait to get a large power transformer', 'verify', 'assumption'),

  // ---- Industry Quarter (SPEC §13) ----
  iqPriceMax: f(100, '$/MWh', 'Top of the electricity price dial', 'assumption', 'assumption'),
  iqPriceMin: f(1, '$/MWh', 'Bottom of the electricity price dial', 'assumption', 'assumption'),
  iqBoomFactor: f(0.5, 'fraction', 'A building booms when power costs half its break-even price or less', 'assumption', 'assumption'),
  iqSmelterMWhPerT: f(14, 'MWh/t', 'Electricity to make one tonne of aluminium', 'verify', 'textbook'),
  iqSmelterOtherPerT: f(1400, '$/t', 'Other costs per tonne of aluminium (alumina, carbon, labor, plant)', 'assumption', 'assumption'),
  iqSmelterThreshold: f(40, '$/MWh', 'Power price at which a new smelter is worth building in our model', 'assumption', 'assumption'),
  iqH2KWhPerKg: f(52, 'kWh/kg', 'Electricity to make 1 kg of hydrogen by splitting water', 'verify', 'textbook'),
  iqH2OtherPerKg: f(0.45, '$/kg', 'Other costs per kg of hydrogen (electrolyser, water, labor)', 'assumption', 'assumption'),
  iqGreyH2PerKg: f(1.5, '$/kg', 'Cost of hydrogen made from natural gas', 'assumption', 'assumption'),
  iqH2Threshold: f(20, '$/MWh', 'Power price at which hydrogen from water matches hydrogen from gas', 'assumption', 'assumption'),
  iqDesalKWhPerM3: f(3.5, 'kWh/m³', 'Electricity to turn 1 m³ of seawater into fresh water', 'verify', 'textbook'),
  iqDesalOtherPerM3: f(0.5, '$/m³', 'Other costs per m³ of fresh water (plant, membranes, labor)', 'assumption', 'assumption'),
  iqDacMWhPerT: f(2, 'MWh/t', 'Energy to pull one tonne of CO2 out of the air', 'verify', 'assumption'),
  iqDacOtherPerT: f(100, '$/t', 'Other costs per tonne of CO2 captured, at large scale', 'assumption', 'assumption'),
  iqDesalThreshold: f(10, '$/MWh', 'Power price at which large desalination and air capture become possible in our model', 'assumption', 'assumption'),

  // ---- Beyond Earth (SPEC §7 off-Earth rows, §8.3, §9.3) ----
  beSolarWPerKg: f(100, 'W/kg', 'Solar array power per kilogram, including its frame', 'assumption', 'assumption'),
  beCosAvg: f(0.64, 'fraction', 'Average sunlight on a fixed panel while the sun is up, compared with noon', 'textbook', 'textbook'),
  beLunarPoleDarkH: f(100, 'h', 'Longest dark spell at a well-lit lunar south pole peak', 'verify', 'assumption'),
  beLunarPoleMastDarkH: f(48, 'h', 'Longest dark spell at the pole with a 10 m mast', 'verify', 'assumption'),
  bePoleSunScale: f(0.9, 'fraction', 'Sunlight on upright, turning panels at the pole, compared with full sun', 'assumption', 'assumption'),
  beMarsMidLatNightH: f(16, 'h', 'Longest winter night at Mars mid-latitude', 'assumption', 'assumption'),
  beMarsMidLatSun: f(0.5, 'fraction', 'Winter sunlight at Mars mid-latitude compared with the equator', 'assumption', 'assumption'),
  beKrustyYear: f(2018, 'year', 'KRUSTY: NASA ground test of a small space reactor', 'cited', 'nasaKilopower'),
  beKilopowerYears: f(10, 'years', 'Kilopower design life (at least)', 'cited', 'nasaKilopower'),
  beFspLaunchYear: f(2029, 'year', '2025 directive: reactor ready to launch by late 2029', 'cited', 'nasaFSP'),
  beInsightEndYear: f(2022, 'year', 'NASA InSight lander ran out of power, partly from dust on its panels', 'cited', 'nasaInsight'),
} satisfies FactMap;
