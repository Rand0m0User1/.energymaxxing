// Purely visual constants for the plant models. None of these numbers are shown to users;
// they only decide how many boxes to draw and how fast things turn.

/** Grey that switched-off accents fade toward. */
export const OFF_GREY = '#a3a7aa';

/** Solar farm: installed GW at which all 8 rows are visible. */
export const SOLAR_FULL_GW = 12;
export const SOLAR_ROWS = 8;
export const SOLAR_MIN_ROWS = 2;
/** Largest tracker tilt, degrees. */
export const TRACKER_MAX_DEG = 55;

/** Battery yard: GWh at which all containers are visible. */
export const BATTERY_FULL_GWH = 32;
export const BATTERY_MAX_CONTAINERS = 24;

/** Wind ridge: rotor speed at full wind, radians per second. */
export const ROTOR_MAX_RAD_S = 2.4;
