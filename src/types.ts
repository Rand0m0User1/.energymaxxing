// Shared app-level types. Contract between all modules — add fields, never rename or remove.

export type GenId = 'solar' | 'wind' | 'fission' | 'geothermal' | 'fusion' | 'hydro' | 'gas';
export type SourceId = GenId | 'battery';
export const GEN_IDS: GenId[] = ['solar', 'wind', 'fission', 'geothermal', 'fusion', 'hydro', 'gas'];
export const SOURCE_IDS: SourceId[] = ['solar', 'wind', 'battery', 'fission', 'geothermal', 'hydro', 'fusion', 'gas'];

export type DistrictId = 'homes' | 'commercial' | 'transport' | 'factory' | 'datacenter' | 'hydrogen';
export const DISTRICT_IDS: DistrictId[] = ['homes', 'commercial', 'transport', 'factory', 'datacenter', 'hydrogen'];

export type PlaceId =
  | 'abuDhabi' | 'phoenix' | 'stanford' | 'madrid' | 'tokyo' | 'berlin' | 'london' | 'helsinki'
  | 'leo' | 'geo' | 'lunarSouthPole' | 'lunarEquator' | 'marsEquator' | 'marsMidLat';
export const EARTH_PLACES: PlaceId[] = ['abuDhabi', 'phoenix', 'stanford', 'madrid', 'tokyo', 'berlin', 'london', 'helsinki'];
export const OFFWORLD_PLACES: PlaceId[] = ['leo', 'geo', 'lunarSouthPole', 'lunarEquator', 'marsEquator', 'marsMidLat'];

export type Body = 'earth' | 'orbit' | 'moon' | 'mars';

export type WeatherEventKind = 'cloudyDay' | 'cloudyWeek' | 'windlessWeek' | 'dustStorm';
export interface WeatherEvent { kind: WeatherEventKind; startHour: number }

export type Screen = 'title' | 'tour' | 'world' | 'lab' | 'beyond';

export type StationId =
  | 'city' | 'solar' | 'battery' | 'reactor' | 'fusion' | 'wind' | 'gas' | 'hydro' | 'batteryFactory' | 'industry';
export const STATION_IDS: StationId[] = ['city', 'solar', 'battery', 'reactor', 'fusion', 'wind', 'gas', 'hydro', 'batteryFactory', 'industry'];

export type InsideViewId = 'solar' | 'battery' | 'reactor' | 'fusion' | 'wind' | 'gas' | 'hydro';
export type ToolId = 'batteryFactory' | 'industry' | 'reactorRow' | 'beyond';

export type Speed = 'hour' | 'day' | 'week'; // 1 hour / 1 day / 1 week of sim time per real second
export type CameraMode = 'orbit' | 'walk' | 'map';
export type ChartRange = 'day' | 'week' | 'year';

export type DemandScenario = 'today' | 'ai2030' | 'electric2040';

/** Keys for controls that lessons can show/hide. `'all'` = everything visible. */
export type ControlKey =
  | 'time' | 'play' | 'season' | 'weather' | 'place'
  | 'solar' | 'wind' | 'battery' | 'fission' | 'geothermal' | 'fusion' | 'hydro' | 'gas'
  | 'demand' | 'scenario' | 'flexLoad' | 'overbuild' | 'dashboard' | 'advancedCosts' | 'tabs' | 'compare';
