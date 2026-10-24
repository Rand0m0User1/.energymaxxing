// Sources drawer: every source, the focused number (if any), and every number grouped by source.
import { useEffect, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { IconButton } from './kit';
import { UIIcon } from './icons';
import { FACTS, type Fact } from '../data/facts';
import { SOURCES, type Source, type SourceKey } from '../data/sources';
import { STATUS_WORDS, formatFactValue } from './live';
import './ui.css';

const SOURCE_KEYS = Object.keys(SOURCES) as SourceKey[];
const FACT_ENTRIES = Object.entries(FACTS) as [string, Fact][];

function SourceBlock({ k, focus }: { k: SourceKey; focus: boolean }) {
  const s = SOURCES[k] as Source;
  return (
    <div id={`src-${k}`} className={`src-item ${focus ? 'focus' : ''}`}>
      <div className="src-title">{s.title}</div>
      <div className="src-meta">{s.who} · {s.year}</div>
      {s.note && <div className="src-meta">{s.note}</div>}
      {s.url && <a href={s.url} target="_blank" rel="noreferrer noopener">{s.url}</a>}
    </div>
  );
}

function Drawer() {
  const focus = useApp((s) => s.sourcesFocus);
  const close = useApp((s) => s.closeSources);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  const focusFact: Fact | null = focus && focus in FACTS ? (FACTS as Record<string, Fact>)[focus] : null;
  const focusSource: SourceKey | null = focusFact ? focusFact.source : focus && focus in SOURCES ? (focus as SourceKey) : null;

  const grouped = useMemo(() => {
    const m = new Map<SourceKey, [string, Fact][]>();
    for (const e of FACT_ENTRIES) {
      const list = m.get(e[1].source) ?? [];
      list.push(e);
      m.set(e[1].source, list);
    }
    return m;
  }, []);

  useEffect(() => {
    headRef.current?.focus();
    if (!focusSource) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(`src-${focusSource}`);
      const body = bodyRef.current;
      if (el && body) body.scrollTo({ top: Math.max(0, el.offsetTop - body.offsetTop - (focusFact ? 0 : 12)), behavior: 'smooth' });
    }, 30);
    return () => window.clearTimeout(id);
  }, [focusSource, focusFact]);

  return (
    <aside className="panel drawer" role="dialog" aria-modal="false" aria-labelledby="sources-title">
      <div className="drawer-head" ref={headRef} tabIndex={-1}>
        <h2 id="sources-title">Sources</h2>
        <span className="grow" />
        <IconButton label="Close sources" onClick={close}><UIIcon name="close" /></IconButton>
      </div>
      <div className="drawer-body" ref={bodyRef}>
        {focusFact && (
          <div className="focus-fact" aria-live="polite">
            <div className="label-sm">{focusFact.label}</div>
            <div className="ff-value">{formatFactValue(focusFact)}</div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className={`status-pill ${focusFact.status}`}>{STATUS_WORDS[focusFact.status]}</span>
              <span className="label-sm">from {(SOURCES[focusFact.source] as Source).who}</span>
            </div>
            {(focusFact.status === 'assumption' || focusFact.status === 'verify') && (
              <div className="note" style={{ marginTop: 6 }}>
                {focusFact.status === 'assumption'
                  ? 'This is a simplifying choice in our model, not a measured fact.'
                  : 'We have not fully checked this number yet. Treat it as a rough guide.'}
              </div>
            )}
          </div>
        )}
        <p className="note" style={{ marginTop: 0 }}>
          Every number in the app comes from one list. Each one is marked as a cited source, textbook physics, a model assumption, or a number that still needs checking.
        </p>

        <div className="section-title">Where the numbers come from</div>
        {SOURCE_KEYS.map((k) => <SourceBlock key={k} k={k} focus={k === focusSource} />)}

        <div className="section-title">All numbers</div>
        {SOURCE_KEYS.filter((k) => grouped.has(k)).map((k) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <div className="src-title small" style={{ fontWeight: 600, marginTop: 8 }}>{(SOURCES[k] as Source).title}</div>
            {(grouped.get(k) ?? []).map(([key, fa]) => (
              <div key={key} className={`fact-row ${key === focus ? 'focus' : ''}`}>
                <span>{fa.label}</span>
                <span className="fr-val">{formatFactValue(fa)}</span>
                <span className="fr-status">{STATUS_WORDS[fa.status]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function SourcesDrawer() {
  const open = useApp((s) => s.sourcesOpen);
  return open ? <Drawer /> : null;
}
