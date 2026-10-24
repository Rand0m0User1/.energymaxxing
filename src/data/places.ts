// Place presets. Visual fields are used by the 3D world; climate fields by the engine.
// Owned by the engine module; world/UI modules read it.
import type { Body, PlaceId } from '../types';

export interface Place {
  id: PlaceId;
  name: string;
  short: string;
  body: Body;
  /** Latitude in degrees (+N). null for orbits. */
  lat: number | null;
  /** Longitude in degrees (+E), for the globe picker pin. */
  lon: number;
  /** Ground and sky colors for the 3D world. */
  ground: string;
  groundAccent: string;
  skyDay: string;
  skyNight: string;
  /** Day of year (0-based) of the default "hardest case". */
  hardestDay: number;
  /** One plain line about the longest dark period. */
  darkness: string;
  /** Monthly clearness factor 0..1 (Jan..Dec). Calibrated so yearly solar output matches
   *  (it also covers haze, dust and heat losses, so hot hazy summers sit lower than clear desert winters). */
  clearness: number[];
  /** Monthly mean wind capacity factor 0..1 (Jan..Dec). */
  windMonthly: number[];
  /** Maximum hydro and geothermal size available at this place (GW). */
  hydroMaxGW: number;
  geothermalMaxGW: number;
  /** Heating share of winter home demand (0..1). */
  heatingShare: number;
  /** Cooling share of summer home demand (0..1). */
  coolingShare: number;
}

const flat = (v: number) => Array.from({ length: 12 }, () => v);

export const PLACES: Record<PlaceId, Place> = {
  abuDhabi: {
    id: 'abuDhabi', name: 'Abu Dhabi, UAE', short: 'Abu Dhabi', body: 'earth', lat: 24.5, lon: 54.4,
    ground: '#E6D7B8', groundAccent: '#D9C69E', skyDay: '#BFD9EE', skyNight: '#1B2433',
    hardestDay: 350, darkness: 'One night, about 13 hours in December.',
    clearness: [0.89, 0.88, 0.84, 0.8, 0.76, 0.69, 0.68, 0.69, 0.76, 0.83, 0.88, 0.89],
    windMonthly: [0.22, 0.24, 0.26, 0.26, 0.24, 0.26, 0.24, 0.22, 0.2, 0.2, 0.2, 0.22],
    hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0.35,
  },
  phoenix: {
    id: 'phoenix', name: 'Phoenix, USA', short: 'Phoenix', body: 'earth', lat: 33.4, lon: -112.1,
    ground: '#DCC7A1', groundAccent: '#B9A47C', skyDay: '#BCD7EE', skyNight: '#1A2232',
    hardestDay: 350, darkness: 'One night.',
    clearness: [0.74, 0.76, 0.79, 0.81, 0.83, 0.83, 0.74, 0.76, 0.8, 0.8, 0.76, 0.72],
    windMonthly: [0.24, 0.26, 0.3, 0.32, 0.3, 0.28, 0.24, 0.22, 0.22, 0.22, 0.22, 0.22],
    hydroMaxGW: 0.05, geothermalMaxGW: 0, heatingShare: 0.05, coolingShare: 0.35,
  },
  stanford: {
    id: 'stanford', name: 'Stanford, California', short: 'Stanford', body: 'earth', lat: 37.4, lon: -122.2,
    ground: '#D8C48A', groundAccent: '#7E8F5A', skyDay: '#C3DAEE', skyNight: '#1A2232',
    hardestDay: 10, darkness: 'One night, and some cloudy winter days.',
    clearness: [0.52, 0.56, 0.62, 0.68, 0.71, 0.74, 0.74, 0.73, 0.71, 0.66, 0.56, 0.51],
    windMonthly: [0.22, 0.26, 0.32, 0.38, 0.42, 0.44, 0.44, 0.4, 0.32, 0.26, 0.22, 0.2],
    hydroMaxGW: 0.15, geothermalMaxGW: 0.1, heatingShare: 0.1, coolingShare: 0.08,
  },
  madrid: {
    id: 'madrid', name: 'Madrid, Spain', short: 'Madrid', body: 'earth', lat: 40.4, lon: -3.7,
    ground: '#CDBE95', groundAccent: '#8F9466', skyDay: '#C0D8EE', skyNight: '#1A2232',
    hardestDay: 15, darkness: 'One night, some cloudy days.',
    clearness: [0.53, 0.56, 0.62, 0.63, 0.67, 0.74, 0.78, 0.76, 0.69, 0.6, 0.53, 0.49],
    windMonthly: [0.3, 0.32, 0.32, 0.3, 0.26, 0.24, 0.24, 0.22, 0.24, 0.26, 0.3, 0.3],
    hydroMaxGW: 0.2, geothermalMaxGW: 0, heatingShare: 0.15, coolingShare: 0.15,
  },
  tokyo: {
    id: 'tokyo', name: 'Tokyo, Japan', short: 'Tokyo', body: 'earth', lat: 35.7, lon: 139.7,
    ground: '#A9BE8C', groundAccent: '#7D9970', skyDay: '#C6D9E8', skyNight: '#1A2232',
    hardestDay: 170, darkness: 'Rainy weeks in June.',
    clearness: [0.56, 0.53, 0.49, 0.49, 0.47, 0.36, 0.42, 0.49, 0.41, 0.42, 0.49, 0.54],
    windMonthly: [0.28, 0.3, 0.3, 0.28, 0.24, 0.2, 0.2, 0.2, 0.22, 0.24, 0.26, 0.28],
    hydroMaxGW: 0.1, geothermalMaxGW: 0.05, heatingShare: 0.15, coolingShare: 0.15,
  },
  berlin: {
    id: 'berlin', name: 'Berlin, Germany', short: 'Berlin', body: 'earth', lat: 52.5, lon: 13.4,
    ground: '#A3B18E', groundAccent: '#7F8D72', skyDay: '#C9D5DE', skyNight: '#171E2A',
    hardestDay: 350, darkness: 'Long dark winters and windless weeks ("dark doldrums").',
    clearness: [0.28, 0.33, 0.37, 0.44, 0.45, 0.45, 0.45, 0.44, 0.41, 0.34, 0.27, 0.23],
    windMonthly: [0.42, 0.4, 0.38, 0.3, 0.26, 0.22, 0.22, 0.22, 0.28, 0.34, 0.38, 0.42],
    hydroMaxGW: 0.02, geothermalMaxGW: 0, heatingShare: 0.35, coolingShare: 0.02,
  },
  london: {
    id: 'london', name: 'London, UK', short: 'London', body: 'earth', lat: 51.5, lon: -0.1,
    ground: '#9DB38A', groundAccent: '#7C946E', skyDay: '#C8D3DB', skyNight: '#171E2A',
    hardestDay: 350, darkness: 'Long dark winters, often overcast.',
    clearness: [0.26, 0.3, 0.35, 0.39, 0.41, 0.41, 0.41, 0.39, 0.38, 0.32, 0.26, 0.23],
    windMonthly: [0.46, 0.44, 0.42, 0.34, 0.3, 0.26, 0.26, 0.28, 0.32, 0.38, 0.42, 0.46],
    hydroMaxGW: 0.02, geothermalMaxGW: 0, heatingShare: 0.35, coolingShare: 0.01,
  },
  helsinki: {
    id: 'helsinki', name: 'Helsinki, Finland', short: 'Helsinki', body: 'earth', lat: 60.2, lon: 24.9,
    ground: '#E9EDEF', groundAccent: '#B9C4C9', skyDay: '#CFDAE2', skyNight: '#141B26',
    hardestDay: 355, darkness: 'Very long winter nights, about 18 hours of darkness in late December.',
    clearness: [0.22, 0.28, 0.35, 0.41, 0.44, 0.44, 0.44, 0.4, 0.34, 0.26, 0.21, 0.19],
    windMonthly: [0.4, 0.38, 0.36, 0.3, 0.26, 0.24, 0.24, 0.26, 0.3, 0.36, 0.38, 0.4],
    hydroMaxGW: 0.15, geothermalMaxGW: 0, heatingShare: 0.45, coolingShare: 0,
  },
  leo: {
    id: 'leo', name: 'Low Earth orbit', short: 'Low orbit', body: 'orbit', lat: null, lon: 0,
    ground: '#C9CDD2', groundAccent: '#9DA3AA', skyDay: '#05070B', skyNight: '#05070B',
    hardestDay: 0, darkness: 'About 36 minutes of shadow every 90-minute orbit.',
    clearness: flat(1), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
  geo: {
    id: 'geo', name: 'Geostationary orbit', short: 'Geostationary', body: 'orbit', lat: null, lon: 0,
    ground: '#C9CDD2', groundAccent: '#9DA3AA', skyDay: '#05070B', skyNight: '#05070B',
    hardestDay: 79, darkness: 'Up to 72 minutes of shadow a day, in two eclipse seasons.',
    clearness: flat(1), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
  lunarSouthPole: {
    id: 'lunarSouthPole', name: 'Lunar south pole peak', short: 'Moon pole', body: 'moon', lat: -89.5, lon: 0,
    ground: '#9A9A98', groundAccent: '#6E6E6C', skyDay: '#07080B', skyNight: '#07080B',
    hardestDay: 280, darkness: 'Some peaks are lit more than 80% of the time.',
    clearness: flat(1), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
  lunarEquator: {
    id: 'lunarEquator', name: 'Lunar equator', short: 'Moon equator', body: 'moon', lat: 0, lon: 0,
    ground: '#A2A19D', groundAccent: '#73726E', skyDay: '#07080B', skyNight: '#07080B',
    hardestDay: 15, darkness: 'A night of about 14.5 Earth days (about 350 hours).',
    clearness: flat(1), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
  marsEquator: {
    id: 'marsEquator', name: 'Mars equator', short: 'Mars equator', body: 'mars', lat: 0, lon: 0,
    ground: '#B9714A', groundAccent: '#8E5236', skyDay: '#D9B98E', skyNight: '#1E1612',
    hardestDay: 0, darkness: 'One night of about 12 hours, or a dust storm lasting weeks.',
    clearness: flat(0.9), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
  marsMidLat: {
    id: 'marsMidLat', name: 'Mars mid-latitude', short: 'Mars mid-lat', body: 'mars', lat: 45, lon: 0,
    ground: '#B07052', groundAccent: '#E6DED6', skyDay: '#D6B48A', skyNight: '#1E1612',
    hardestDay: 340, darkness: 'Long winters plus dust storms.',
    clearness: flat(0.85), windMonthly: flat(0), hydroMaxGW: 0, geothermalMaxGW: 0, heatingShare: 0, coolingShare: 0,
  },
};
