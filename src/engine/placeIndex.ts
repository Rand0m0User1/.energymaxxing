// Stable small integer per place, used to give each place its own weather from the same seed.
import type { PlaceId } from '../types';

export const PLACE_INDEX: Record<PlaceId, number> = {
  abuDhabi: 1, phoenix: 2, stanford: 3, madrid: 4, tokyo: 5, berlin: 6, london: 7, helsinki: 8,
  leo: 9, geo: 10, lunarSouthPole: 11, lunarEquator: 12, marsEquator: 13, marsMidLat: 14,
};
