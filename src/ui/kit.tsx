// Small shared UI kit used by every module. Keep it tiny and plain.
import type { CSSProperties, ReactNode } from 'react';

export function Panel({ children, className = '', style, pad = true, ...rest }: {
  children: ReactNode; className?: string; style?: CSSProperties; pad?: boolean; [k: string]: unknown;
}) {
  return <div className={`panel ${pad ? 'panel-pad' : ''} ${className}`} style={style} {...rest}>{children}</div>;
}

export function Button({ children, onClick, primary, ghost, active, disabled, title, style, ariaLabel }: {
  children: ReactNode; onClick?: () => void; primary?: boolean; ghost?: boolean; active?: boolean;
  disabled?: boolean; title?: string; style?: CSSProperties; ariaLabel?: string;
}) {
  const cls = ['btn', primary && 'primary', ghost && 'ghost', active && 'active'].filter(Boolean).join(' ');
  return <button className={cls} onClick={onClick} disabled={disabled} title={title} style={style} aria-label={ariaLabel}>{children}</button>;
}

export function IconButton({ children, onClick, label, active, style }: {
  children: ReactNode; onClick?: () => void; label: string; active?: boolean; style?: CSSProperties;
}) {
  return <button className={`icon-btn ${active ? 'active' : ''}`} onClick={onClick} aria-label={label} title={label} style={style}>{children}</button>;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Slider({ value, min, max, step = 0.1, onChange, label, disabled }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; disabled?: boolean;
}) {
  return (
    <input className="slider" type="range" min={min} max={max} step={step} value={value} disabled={disabled}
      aria-label={label} onChange={(e) => onChange(parseFloat(e.target.value))} />
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** "The real term is …" line, shown after a plain explanation. */
export function RealTerm({ children }: { children: ReactNode }) {
  return <div className="real-term">The real term is <em>{children}</em>.</div>;
}

/** Simple stroke icons (1.5px). Add more as needed. */
export function Icon({ name, size = 16 }: { name: 'reset' | 'play' | 'pause' | 'globe' | 'book' | 'help' | 'close' | 'map' | 'chevron' | 'pin' | 'camera' | 'expand'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'reset': return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
    case 'play': return <svg {...p}><path d="M7 5l12 7-12 7z" /></svg>;
    case 'pause': return <svg {...p}><path d="M8 5v14M16 5v14" /></svg>;
    case 'globe': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>;
    case 'book': return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>;
    case 'help': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></svg>;
    case 'close': return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'map': return <svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'chevron': return <svg {...p}><path d="M9 6l6 6-6 6" /></svg>;
    case 'pin': return <svg {...p}><path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></svg>;
    case 'camera': return <svg {...p}><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case 'expand': return <svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
  }
}
