// 24-cell "paint the hours" strip. Click a cell to cycle its state; drag to paint that state across cells.
import { useRef } from 'react';
import './ui.css';

export interface PaintState { color: string; label: string }

export function PaintStrip({ values, states, onChange, label, auto }: {
  /** State index per hour (0..states.length-1). */
  values: number[];
  states: PaintState[];
  onChange: (v: number[]) => void;
  label: string;
  /** Draw the cells faded (schedule is automatic until the first paint). */
  auto?: boolean;
}) {
  const painting = useRef<number | null>(null);
  const cur = useRef(values);
  cur.current = values;
  const n = values.length || 24;

  const setCell = (i: number, s: number) => {
    if (i < 0 || i >= n || cur.current[i] === s) return;
    const v = cur.current.slice();
    v[i] = s;
    cur.current = v;
    onChange(v);
  };
  const cellAt = (el: HTMLElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return -1;
    return Math.max(0, Math.min(n - 1, Math.floor(((clientX - r.left) / r.width) * n)));
  };

  return (
    <div className="paint">
      <div
        className={`paint-cells ${auto ? 'auto' : ''}`}
        role="group"
        aria-label={label}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const i = cellAt(e.currentTarget, e.clientX);
          if (i < 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const next = ((cur.current[i] ?? 0) + 1) % states.length;
          painting.current = next;
          setCell(i, next);
        }}
        onPointerMove={(e) => {
          if (painting.current == null) return;
          setCell(cellAt(e.currentTarget, e.clientX), painting.current);
        }}
        onPointerUp={() => { painting.current = null; }}
        onPointerCancel={() => { painting.current = null; }}
      >
        {values.map((s, i) => (
          <button
            key={i}
            type="button"
            className="paint-cell"
            style={{ background: states[s]?.color ?? 'transparent' }}
            aria-label={`${String(i).padStart(2, '0')}:00, ${states[s]?.label ?? ''}. Press Enter to change.`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setCell(i, ((cur.current[i] ?? 0) + 1) % states.length);
              }
            }}
          />
        ))}
      </div>
      <div className="paint-axis" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

export function Legend({ states }: { states: PaintState[] }) {
  return (
    <div className="legend">
      {states.map((s) => (
        <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
      ))}
    </div>
  );
}
