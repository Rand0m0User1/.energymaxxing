// Numbers used by the engine.
// These are the knobs of the simulation.
import { f, type FactMap } from './factType';

export const engineFacts = {
  // Solar model
  solarDerate: f(0.85, 'fraction', 'Solar losses from wiring, heat and dirt (85% gets through)'),
  solarAirMassExp: f(1.15, '', 'How much the air dims low sunlight (exponent on the sun angle)'),
  snowSolarLoss: f(0.6, 'fraction', 'Share of winter solar lost to snow on panels at high latitude'),

  // Weather events
  cloudyDayFactor: f(0.25, 'fraction', 'Sunlight on a cloudy day, compared with a clear day'),
  cloudyDayHours: f(24, 'h', 'Length of a cloudy day event'),
  cloudyWeekFactor: f(0.2, 'fraction', 'Sunlight during a cloudy week, compared with clear weather'),
  cloudyWeekDays: f(5, 'days', 'Length of a cloudy week event'),
  windlessWeekFactor: f(0.03, 'fraction', 'Wind output during a windless week (share of maximum)'),
  windlessWeekDays: f(7, 'days', 'Length of a windless week event'),

  // Battery
  batteryChargeHoursMin: f(4, 'h', 'A battery can be refilled from the solar farm in about 4 hours, even if its output to the city is capped lower'),

  // Firm and dispatchable plants
  hydroCF: f(0.45, 'fraction', 'Hydro yearly water budget, as a share of running flat out all year'),
  fissionUnplannedOutage: f(0.04, 'fraction', 'Share of time a reactor is down for small repairs, besides refuelling'),
  fissionFlexMin: f(0.5, 'fraction', 'Lowest output a flexible reactor turns down to when solar floods the grid'),
  industryFlexCapMW: f(300, 'MW', 'Flexible industry that soaks up spare power, when no hydrogen district is set'),
  heatStorageTrim: f(0.5, 'fraction', 'Share of winter home heating covered by stored summer heat (sand pile)'),
  dcFlexRecoveryPerHour: f(0.5, 'h/h', 'How fast the data center earns back pause time after a pause'),

  // Off Earth
  marsSunShare: f(0.431, 'fraction', 'Sunlight at Mars compared with sunlight near Earth'),
  geoEclipseSeasonDays: f(22, 'days', 'Eclipse season half-length around each equinox in geostationary orbit'),
  lunarPoleDarkSwing: f(1, '×', 'Darkness at the lunar pole peak changes with the season, from none to twice the average'),

  // Advanced cost model
  solarLifeYears: f(25, 'years', 'Solar plant life'),
  batteryLifeYears: f(15, 'years', 'Battery life'),
  fissionLifeYears: f(40, 'years', 'Fission plant life'),
  solarFixedOMPerKWYr: f(15, '$/kW-yr', 'Solar upkeep per year'),
  batteryFixedOMPerKWhYr: f(5, '$/kWh-yr', 'Battery upkeep per year'),
} satisfies FactMap;
