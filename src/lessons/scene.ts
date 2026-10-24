// One-call scene setup for lessons and the presenter script.
// Builds the whole input first and commits it once, so the year is simulated only one time.
import { useApp } from '../store';
import { presetInput, type PresetId } from '../data/presets';
import { PLACES } from '../data/places';
import { dayOfYear, timeOfDay } from '../engine/timeIndex';
import type { BatterySetting, PlantSetting, SimInput } from '../engine/types';
import type { ChartRange, GenId, PlaceId, Speed, StationId, WeatherEventKind } from '../types';

export interface SceneOpts {
  preset?: PresetId;
  place?: PlaceId;
  plants?: Partial<Record<GenId, Partial<PlantSetting>>>;
  battery?: Partial<BatterySetting>;
  input?: Partial<SimInput>;
  /** Weather events inserted on the scene's day. */
  events?: WeatherEventKind[];
  /** Day of year (0-based). Defaults to the place's hardest day when the place changes. */
  day?: number;
  /** Time of day in hours. Defaults to the current time of day. */
  tod?: number;
  chart?: ChartRange;
  speed?: Speed;
  playing?: boolean;
  camera?: StationId;
}

export function scene(o: SceneOpts): void {
  const app = useApp.getState();
  const cur = app.input;
  const wantPlace = o.place ?? cur.place;
  let next: SimInput = o.preset ? presetInput(o.preset, { ...cur, place: wantPlace }) : { ...cur };
  if (o.place) next = { ...next, place: o.place };
  const placeChanged = next.place !== cur.place;

  if (o.plants) {
    const plants = { ...next.plants };
    for (const id of Object.keys(o.plants) as GenId[]) plants[id] = { ...plants[id], ...o.plants[id] };
    next = { ...next, plants };
  }
  if (o.battery) next = { ...next, battery: { ...next.battery, ...o.battery } };
  if (o.input) next = { ...next, ...o.input };

  const day = o.day ?? (placeChanged || o.preset ? PLACES[next.place].hardestDay : dayOfYear(app.hourOfYear));
  const tod = o.tod ?? timeOfDay(app.hourOfYear);
  if (o.events) next = { ...next, events: o.events.map((kind) => ({ kind, startHour: day * 24 })) };
  else if (placeChanged || o.preset) next = { ...next, events: [] };

  app.setInput(next);
  app.setHourOfYear(day * 24 + tod);
  if (o.chart) app.setChartRange(o.chart);
  if (o.speed) app.setSpeed(o.speed);
  if (o.playing !== undefined) app.setPlaying(o.playing);
  if (o.camera) app.flyTo(o.camera);
}

/** Fresh store state (use inside action callbacks so values are never stale). */
export const S = () => useApp.getState();
