// "Why?" button and its small explanation box (two plain sentences and a source link).
import type { ReactNode } from 'react';
import { useApp } from '../../store';

export function WhyButton({ open, onClick, topic }: { open: boolean; onClick: () => void; topic: string }) {
  return (
    <button className={`dash-why-btn ${open ? 'open' : ''}`} aria-expanded={open} aria-label={`Why? ${topic}`} onClick={onClick}>
      Why?
    </button>
  );
}

export function WhyBox({ title, children, sourceKey, onClose }: {
  title: string; children: ReactNode; sourceKey: string; onClose: () => void;
}) {
  const openSources = useApp((s) => s.openSources);
  return (
    <div className="dash-why" role="note" aria-label={title}>
      <div className="dash-why-title">{title}</div>
      <div className="dash-why-body">{children}</div>
      <div className="dash-why-actions">
        <button className="dash-link" onClick={() => openSources(sourceKey)}>See the source</button>
        <button className="dash-link" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
