// Horizontal 00:00–24:00 scrubber with day/night shading and a sun or moon marker.
import { useMemo, useRef, type KeyboardEvent } from 'react';
import { useApp, useControlVisible } from '../store';
import { formatClock, timeOfDay } from '../engine/timeIndex';
import { sunriseSunset } from '../engine/sun';
import { PLACES } from '../data/places';
import { SOURCE_COLORS } from '../data/colors';
import type { SimResult } from '../engine/types';
import type { PlaceId } from '../types';
import { at, dayRange, useDay } from './live';
import { UIIcon } from './icons';
import './ui.css';

type Seg = [number, number]; // night segment in hours [from, to)

/** Night segments for one day: from sunrise/sunset on Earth, else from the sim's sunlight series. */
export function nightSegments(place: PlaceId, day: number, result: SimResult): Seg[] {
  const body = PLACES[place]?.body;
  if (body === 'earth') {
    let ss: ReturnType<typeof sunriseSunset> = null;
    try { ss = sunriseSunset(place, day); } catch { ss = null; }
    if (ss && Number.isFinite(ss.sunrise) && Number.isFinite(ss.sunset)) {
      const rise = Math.max(0, Math.min(24, ss.sunrise));
      const set = Math.max(0, Math.min(24, ss.sunset));
      if (rise < set) return [[0, rise], [set, 24]].filter(([a, b]) => b - a > 0.01) as Seg[];
      return [[set, rise]];
    }
  }
  // Fallback: use the sim's sunlight factor for this day.
  if (!result || !result.steps) return [];
  const [a, b] = dayRange(result, day * 24 + 12);
  const n = b - a;
  if (n <= 0) return [];
  let anySun = false;
  for (let k = a; k < b; k++) if (at(result.sun, k) > 0.02) { anySun = true; break; }
  if (!anySun) {
    // Either a real polar/lunar night or an empty sim. Only shade if the sim has data at all.
    const hasData = at(result.served, a) > 0 || at(result.demand, a) > 0;
    return hasData ? [[0, 24]] : [];
  }
  const bins = Math.min(n, 192);
  const segs: Seg[] = [];
  let start = -1;
  for (let j = 0; j < bins; j++) {
    const k0 = a + Math.floor((j / bins) * n);
    const k1 = Math.max(k0 + 1, a + Math.floor(((j + 1) / bins) * n));
    let sum = 0;
    for (let k = k0; k < k1; k++) sum += at(result.sun, k);
    const dark = sum / (k1 - k0) <= 0.02;
    const h = (j / bins) * 24;
    if (dark && start < 0) start = h;
    if (!dark && start >= 0) { segs.push([start, h]); start = -1; }
  }
  if (start >= 0) segs.push([start, 24]);
  return segs;
}

export default function TimeDial() {
  const visible = useControlVisible('time');
  const t = useApp((s) => Math.round(timeOfDay(s.hourOfYear) * 12) / 12);
  const day = useDay();
  const place = useApp((s) => s.input.place);
  const result = useApp((s) => s.result);
  const setTimeOfDay = useApp((s) => s.setTimeOfDay);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const night = useMemo(() => nightSegments(place, day, result), [place, day, result]);
  if (!visible) return null;

  const isNight = night.some(([a, b]) => t >= a && t < b);
  const fromX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    const v = Math.max(0, Math.min(23.99, ((clientX - r.left) / r.width) * 24));
    setTimeOfDay(Math.round(v * 12) / 12);
  };
  const onKey = (e: KeyboardEvent) => {
    let v: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = t - (e.shiftKey ? 0.25 : 1);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = t + (e.shiftKey ? 0.25 : 1);
    if (e.key === 'PageDown') v = t - 6;
    if (e.key === 'PageUp') v = t + 6;
    if (e.key === 'Home') v = 0;
    if (e.key === 'End') v = 23.99;
    if (v == null) return;
    e.preventDefault();
    e.stopPropagation();
    setTimeOfDay(((v % 24) + 24) % 24);
  };
  const clock = formatClock(t);
  const pct = (h: number) => `${(h / 24) * 100}%`;

  return (
    <>
      <span className="dial-clock" aria-hidden="true">{clock}</span>
      <div
        ref={ref}
        className="dial"
        role="slider"
        tabIndex={0}
        aria-label="Time of day"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={Math.round(t * 100) / 100}
        aria-valuetext={`${clock}, ${isNight ? 'night' : 'day'}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus();
          fromX(e.clientX);
        }}
        onPointerMove={(e) => { if (dragging.current) fromX(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div className="dial-track">
          <svg viewBox="0 0 240 10" preserveAspectRatio="none" aria-hidden="true">
            {night.map(([a, b], i) => (
              <rect key={i} x={a * 10} y={0} width={Math.max(0, (b - a) * 10)} height={10} fill="#2b3440" opacity={0.2} />
            ))}
            {[6, 12, 18].map((h) => <line key={h} x1={h * 10} x2={h * 10} y1={0} y2={10} stroke="#1d2227" strokeOpacity={0.12} strokeWidth={0.4} />)}
          </svg>
        </div>
        <div className="dial-ticks" aria-hidden="true">
          {[0, 6, 12, 18, 24].map((h) => <span key={h} style={{ left: pct(h) }}>{String(h).padStart(2, '0')}:00</span>)}
        </div>
        <div className="dial-marker" style={{ left: pct(t), color: isNight ? 'var(--ink-2)' : SOURCE_COLORS.solar }} aria-hidden="true">
          <UIIcon name={isNight ? 'moon' : 'sun'} size={13} />
        </div>
      </div>
    </>
  );
}
