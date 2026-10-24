// Small building blocks shared by the tools panels.
import type { ReactNode } from 'react';
import { Switch } from '../ui/kit';
import type { IndustryState } from './model';

export function Section({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <section className="tool-section">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function LabeledSwitch({ checked, onChange, label, children, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; children?: ReactNode; disabled?: boolean;
}) {
  return (
    <div className="tool-switch" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      <Switch checked={checked} onChange={onChange} label={label} />
      <span>{children ?? label}</span>
    </div>
  );
}

export function KV({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="tool-kv">
      <span>{k}</span>
      <b>{children}</b>
    </div>
  );
}

const STATE_TEXT: Record<IndustryState, string> = {
  off: 'Not worth it',
  competitive: 'Competitive',
  booming: 'Booming',
};

export function StatePill({ state }: { state: IndustryState }) {
  return <span className={`state-pill ${state}`}>{STATE_TEXT[state]}</span>;
}
