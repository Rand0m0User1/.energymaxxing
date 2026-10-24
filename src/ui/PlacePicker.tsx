// Place picker: a small rotating globe with pins, plus a plain list of Earth and off-Earth places.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { IconButton, RealTerm } from './kit';
import { UIIcon } from './icons';
import { PLACES } from '../data/places';
import { EARTH_PLACES, OFFWORLD_PLACES, type PlaceId } from '../types';
import './ui.css';

const R = 120;
const C = 130;
const D2R = Math.PI / 180;

/** Orthographic projection. Returns [x, y, visible]. */
function project(lat: number, lon: number, lat0: number, lon0: number): [number, number, boolean] {
  const p = lat * D2R, l = (lon - lon0) * D2R, p0 = lat0 * D2R;
  const x = R * Math.cos(p) * Math.sin(l);
  const y = R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [C + x, C - y, cosc > 0];
}

function linePath(pts: [number, number][], lat0: number, lon0: number): string {
  let d = '';
  let pen = false;
  for (const [la, lo] of pts) {
    const [x, y, v] = project(la, lo, lat0, lon0);
    if (v) { d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; pen = true; } else pen = false;
  }
  return d;
}

function Globe({ current, onPick }: { current: PlaceId; onPick: (id: PlaceId) => void }) {
  const reduced = useApp((s) => s.reducedMotion);
  const startLon = PLACES[current]?.body === 'earth' ? PLACES[current].lon : 10;
  const [rot, setRot] = useState({ lat: 25, lon: startLon });
  const drag = useRef<{ x: number; y: number; lat: number; lon: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += (now - last) / 1000;
      last = now;
      if (acc > 1 / 24) {
        const dt = acc;
        acc = 0;
        if (!drag.current) setRot((r) => ({ ...r, lon: r.lon + 5 * dt }));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const grat = useMemo(() => {
    const paths: string[] = [];
    for (let lo = -180; lo < 180; lo += 30) {
      const pts: [number, number][] = [];
      for (let la = -90; la <= 90; la += 5) pts.push([la, lo]);
      paths.push(linePath(pts, rot.lat, rot.lon));
    }
    for (let la = -60; la <= 60; la += 30) {
      const pts: [number, number][] = [];
      for (let lo = -180; lo <= 180; lo += 5) pts.push([la, lo]);
      paths.push(linePath(pts, rot.lat, rot.lon));
    }
    return paths;
  }, [rot.lat, rot.lon]);

  return (
    <svg viewBox="0 0 260 260" role="img" aria-label="Globe with pins for each Earth place. Drag to turn it."
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, lat: rot.lat, lon: rot.lon, moved: false }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) > 3) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
        if (d.moved) setRot({ lon: d.lon - dx * 0.5, lat: Math.max(-70, Math.min(70, d.lat + dy * 0.5)) });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <circle cx={C} cy={C} r={R} fill="#e4ecf0" stroke="var(--line-strong)" strokeWidth={1} />
      {grat.map((d, i) => d && <path key={i} d={d} fill="none" stroke="#1d2227" strokeOpacity={0.12} strokeWidth={0.8} />)}
      {EARTH_PLACES.map((id) => {
        const p = PLACES[id];
        if (!p || p.lat == null) return null;
        const [x, y, v] = project(p.lat, p.lon, rot.lat, rot.lon);
        if (!v) return null;
        const on = id === current;
        return (
          <g key={id} style={{ cursor: 'pointer' }} onClick={() => onPick(id)}>
            <circle cx={x} cy={y} r={on ? 6 : 4.5} fill={on ? 'var(--accent)' : '#fff'} stroke="var(--accent)" strokeWidth={1.5} />
            <text x={x + 8} y={y + 3.5} fontSize={10} fill="#1d2227">{p.short}</text>
          </g>
        );
      })}
    </svg>
  );
}

let dunkelflauteShown = false;

function PickerModal() {
  const current = useApp((s) => s.input.place);
  const setPlace = useApp((s) => s.setPlace);
  const close = useApp((s) => s.setPlacePickerOpen);
  const [showNote] = useState(() => !dunkelflauteShown);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dunkelflauteShown = true;
    dialogRef.current?.focus();
  }, []);
  const pick = (id: PlaceId) => { if (id !== current) setPlace(id); close(false); };

  const item = (id: PlaceId) => {
    const p = PLACES[id];
    if (!p) return null;
    return (
      <button key={id} className="place-item" aria-current={id === current} onClick={() => pick(id)}>
        <span className="pi-name">{p.name}</span>
        <span className="pi-dark">{p.darkness}</span>
      </button>
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div className="panel panel-pad modal" role="dialog" aria-modal="true" aria-labelledby="place-picker-title" tabIndex={-1} ref={dialogRef}>
        <div className="modal-head">
          <h2 id="place-picker-title">Move the city</h2>
          <span className="grow" />
          <IconButton label="Close" onClick={() => close(false)}><UIIcon name="close" /></IconButton>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>Same city, same power plants. Only the sun, the weather and the length of the night change.</p>
        {showNote && (
          <div className="callout">
            A long, dark, windless winter spell is the hardest test for a solar city. Engineers call it the dark doldrums.
            <RealTerm>Dunkelflaute (German for "dark doldrums")</RealTerm>
          </div>
        )}
        <div className="picker-grid">
          <div className="picker-globe">
            <Globe current={current} onPick={pick} />
          </div>
          <div>
            <div className="section-title" style={{ marginTop: 0 }}>On Earth</div>
            <div className="place-list">{EARTH_PLACES.map(item)}</div>
            <div className="section-title">Off Earth</div>
            <div className="place-list">{OFFWORLD_PLACES.map(item)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlacePicker() {
  const open = useApp((s) => s.placePickerOpen);
  return open ? <PickerModal /> : null;
}
