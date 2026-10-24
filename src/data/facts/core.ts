// Core numbers used by the model.
import { f, type FactMap } from './factType';

export const coreFacts = {

  // Abu Dhabi benchmark
  abuDhabiSolarGW: f(5.2, 'GW', 'Solar in the Abu Dhabi round-the-clock project'),
  abuDhabiBatteryGWh: f(19, 'GWh', 'Batteries in the Abu Dhabi project'),
  abuDhabiSteadyGW: f(1, 'GW', 'Steady power delivered by the Abu Dhabi project'),

  // Solar
  solarCFUS: f(0.234, 'fraction', 'US solar capacity factor (share of maximum made over a year)'),
  windCFUS: f(0.343, 'fraction', 'US wind capacity factor'),
  nuclearCFUS: f(0.92, 'fraction', 'US nuclear capacity factor (above 92%)'),

  lcoeSolarLow: f(40, '$/MWh', 'Utility solar, low end'),
  lcoeSolarHigh: f(98, '$/MWh', 'Utility solar, high end'),
  lcoeWindLow: f(37, '$/MWh', 'Onshore wind, low end'),
  lcoeWindHigh: f(99, '$/MWh', 'Onshore wind, high end'),
  lcoeNuclearLow: f(175, '$/MWh', 'New US nuclear, low end'),
  lcoeNuclearHigh: f(255, '$/MWh', 'New US nuclear, high end'),
  lcoeGasLow: f(51, '$/MWh', 'Combined-cycle gas, low end'),
  lcoeGasHigh: f(129, '$/MWh', 'Combined-cycle gas, high end'),
  lcoeFusionLow: f(140, '$/MWh', 'Tokamak fusion estimate, low end'),
  lcoeFusionHigh: f(550, '$/MWh', 'Tokamak fusion estimate, high end'),
  lcoeGeothermalLow: f(66, '$/MWh', 'Geothermal, low end'),
  lcoeGeothermalHigh: f(109, '$/MWh', 'Geothermal, high end'),
  lcoeHydroLow: f(50, '$/MWh', 'Existing hydro, low end'),
  lcoeHydroHigh: f(110, '$/MWh', 'Hydro, high end'),
  lcoeStorageAdderLow: f(60, '$/MWh', 'Battery storage, added cost per MWh shifted, low end'),
  lcoeStorageAdderHigh: f(130, '$/MWh', 'Battery storage, added cost per MWh shifted, high end'),

  // Batteries
  batteryRoundTrip: f(0.85, 'fraction', 'Battery round-trip efficiency (100 in, about 85 out)'),
  liIonWhPerKg: f(200, 'Wh/kg', 'Lithium battery energy per kilogram (pack level)'),

  // Fission
  fissionOM: f(14, '$/MWh', 'Fission operations and maintenance'),
  fissionFuel: f(10, '$/MWh', 'Fission fuel'),
  fissionOutageWeeks: f(3, 'weeks', 'Refuelling outage length'),

  // Fusion
  fusionMinYear: f(2035, 'year', 'Earliest year fusion is available'),

  // Gas
  gasCO2PerMWh: f(0.4, 't/MWh', 'CO2 from a gas plant per MWh'),

  // Demand
  dcFlexShare: f(0.3, 'fraction', 'Share of data center load that can pause'),
  dcFlexHours: f(4, 'hours', 'How long the flexible load can pause'),
  homeMWhPerMonth: f(0.9, 'MWh/month', 'Average US home electricity use per month'),

  // Off Earth
  leoPeriodMin: f(90, 'min', 'Low Earth orbit period'),
  leoShadowMin: f(36, 'min', 'Shadow per low Earth orbit'),
  geoEclipseMaxMin: f(72, 'min', 'Longest daily eclipse in geostationary orbit (eclipse seasons)'),
  lunarNightH: f(350, 'h', 'Lunar night at the equator (about 14.5 Earth days)'),
  lunarCycleDays: f(29.53, 'days', 'Lunar day–night cycle'),
  lunarPeakLit: f(0.8, 'fraction', 'Some lunar south pole peaks are lit more than 80% of the time'),
  lunarMastLit: f(0.9, 'fraction', 'A 10 m mast gives an area lit more than 90%'),
  lunarNightBatteryKg: f(1750, 'kg', 'Battery mass for 1 kW through a 350 h lunar night at 200 Wh/kg'),
  marsSolH: f(24.66, 'h', 'Mars day (sol)'),
  marsDustStormFactor: f(0.1, 'fraction', 'Solar output during a dust storm'),
  marsDustStormSols: f(30, 'sols', 'Dust storm length'),
} satisfies FactMap;
