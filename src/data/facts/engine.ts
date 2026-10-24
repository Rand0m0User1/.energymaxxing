// Facts added by the engine module. Owned by that module's builder.
// These are the knobs of the simulation. Most are model assumptions and are tagged as such.
import { f, type FactMap } from './factType';

export const engineFacts = {
  // Solar model (SPEC §9.2)
  solarDerate: f(0.85, 'fraction', 'Solar losses from wiring, heat and dirt (85% gets through)', 'assumption', 'assumption'),
  solarTrackerShare: f(1, 'fraction', 'Share of solar farms with panels that turn east to west to follow the sun', 'assumption', 'assumption'),
  solarAirMassExp: f(1.15, '', 'How much the air dims low sunlight (exponent on the sun angle)', 'assumption', 'assumption'),
  snowSolarLoss: f(0.6, 'fraction', 'Share of winter solar lost to snow on panels at high latitude', 'assumption', 'assumption'),

  // Weather events (SPEC §9.2, §8.5, §9.3)
  cloudyDayFactor: f(0.25, 'fraction', 'Sunlight on a cloudy day, compared with a clear day', 'assumption', 'assumption'),
  cloudyDayHours: f(24, 'h', 'Length of a cloudy day event', 'assumption', 'assumption'),
  cloudyWeekFactor: f(0.2, 'fraction', 'Sunlight during a cloudy week, compared with clear weather', 'assumption', 'assumption'),
  cloudyWeekDays: f(5, 'days', 'Length of a cloudy week event', 'assumption', 'assumption'),
  windlessWeekFactor: f(0.03, 'fraction', 'Wind output during a windless week (share of maximum)', 'assumption', 'assumption'),
  windlessWeekDays: f(7, 'days', 'Length of a windless week event', 'assumption', 'assumption'),

  // Battery
  batteryChargeHoursMin: f(4, 'h', 'A battery can be refilled from the solar farm in about 4 hours, even if its output to the city is capped lower', 'assumption', 'assumption'),

  // Firm and dispatchable plants (SPEC §9.4)
  hydroCF: f(0.45, 'fraction', 'Hydro yearly water budget, as a share of running flat out all year', 'assumption', 'assumption'),
  fissionUnplannedOutage: f(0.04, 'fraction', 'Share of time a reactor is down for small repairs, besides refuelling', 'assumption', 'doeCF'),
  fissionFlexMin: f(0.5, 'fraction', 'Lowest output a flexible reactor turns down to when solar floods the grid', 'assumption', 'assumption'),
  industryFlexCapMW: f(300, 'MW', 'Flexible industry that soaks up spare power, when no hydrogen district is set', 'assumption', 'assumption'),
  heatStorageTrim: f(0.5, 'fraction', 'Share of winter home heating covered by stored summer heat (sand pile)', 'assumption', 'handmer2025'),
  dcFlexRecoveryPerHour: f(0.5, 'h/h', 'How fast the data center earns back pause time after a pause', 'assumption', 'assumption'),

  // Off Earth (SPEC §9.3)
  marsSunShare: f(0.431, 'fraction', 'Sunlight at Mars compared with sunlight near Earth', 'textbook', 'textbook'),
  geoEclipseSeasonDays: f(22, 'days', 'Eclipse season half-length around each equinox in geostationary orbit', 'verify', 'noaaGoes'),
  lunarPoleDarkSwing: f(1, '×', 'Darkness at the lunar pole peak changes with the season, from none to twice the average', 'assumption', 'assumption'),

  // Advanced cost model (SPEC §9.7)
  solarLifeYears: f(25, 'years', 'Solar plant life', 'cited', 'paper'),
  batteryLifeYears: f(15, 'years', 'Battery life', 'cited', 'paper'),
  fissionLifeYears: f(40, 'years', 'Fission plant life', 'cited', 'paper'),
  solarFixedOMPerKWYr: f(15, '$/kW-yr', 'Solar upkeep per year', 'assumption', 'assumption'),
  batteryFixedOMPerKWhYr: f(5, '$/kWh-yr', 'Battery upkeep per year', 'assumption', 'assumption'),
  costSolarPerKWDefault: f(1000, '$/kW', 'Solar, installed (default)', 'assumption', 'paper'),
  costSolarPerKWMin: f(300, '$/kW', 'Solar, installed (slider low)', 'assumption', 'paper'),
  costSolarPerKWMax: f(1500, '$/kW', 'Solar, installed (slider high)', 'assumption', 'paper'),
  costBatteryPerKWhDefault: f(300, '$/kWh', 'Battery, installed (default)', 'assumption', 'pnnl2022'),
  costBatteryPerKWhMin: f(100, '$/kWh', 'Battery, installed (slider low)', 'assumption', 'pnnl2022'),
  costBatteryPerKWhMax: f(450, '$/kWh', 'Battery, installed (slider high)', 'assumption', 'pnnl2022'),
  costFissionPerKWDefault: f(10000, '$/kW', 'Fission, overnight cost (default)', 'assumption', 'paper'),
  costFissionPerKWMin: f(3000, '$/kW', 'Fission, overnight cost (slider low)', 'assumption', 'paper'),
  costFissionPerKWMax: f(14000, '$/kW', 'Fission, overnight cost (slider high)', 'assumption', 'paper'),
  costWaccDefault: f(7, '%', 'Cost of capital (default)', 'assumption', 'paper'),
  costWaccMin: f(3, '%', 'Cost of capital (slider low)', 'assumption', 'paper'),
  costWaccMax: f(12, '%', 'Cost of capital (slider high)', 'assumption', 'paper'),
  surplusPriceMax: f(40, '$/MWh', 'Highest price for spare solar on the slider', 'assumption', 'handmer2025'),
} satisfies FactMap;
