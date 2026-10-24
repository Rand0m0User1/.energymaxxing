// Presenter strip (SPEC §2.9, §23): steps through the three-minute demo with Page Up / Page Down.
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../store';
import { DEMO_SCRIPT, runDemoStep } from './demoScript';
import './lessons.css';

export default function PresenterOverlay() {
  const presenter = useApp((s) => s.presenter);
  const step = useApp((s) => s.presenterStep);
  const setPresenter = useApp((s) => s.setPresenter);
  // Nothing has run yet when presenter mode turns on; the first Page Down runs the current step.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!presenter) setStarted(false);
  }, [presenter]);

  const total = DEMO_SCRIPT.length;
  const cur = Math.max(0, Math.min(total - 1, step));

  const next = useCallback(() => {
    const s = useApp.getState().presenterStep;
    if (!started) {
      setStarted(true);
      runDemoStep(s);
    } else if (s < total - 1) {
      runDemoStep(s + 1);
    }
  }, [started, total]);

  const prev = useCallback(() => {
    const s = useApp.getState().presenterStep;
    setStarted(true);
    runDemoStep(Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    if (!presenter) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'PageUp') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenter, next, prev]);

  if (!presenter) return null;
  const d = DEMO_SCRIPT[cur];

  return (
    <div className="panel presenter-strip" role="region" aria-label="Presenter controls">
      <div className="presenter-text">
        <div className="presenter-label">
          <span className="muted">Presenter · </span>
          {started ? (
            <>step <span className="num">{cur + 1}</span> of <span className="num">{total}</span> · <strong>{d.title}</strong></>
          ) : (
            <>ready · next: <strong>{d.title}</strong> · press Page Down</>
          )}
        </div>
        {started && <div className="presenter-say">{d.say}</div>}
      </div>
      <div className="presenter-btns">
        <button className="icon-btn" onClick={prev} disabled={started && cur === 0} aria-label="Previous demo step (Page Up)" title="Previous (Page Up)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button className="icon-btn" onClick={next} disabled={started && cur === total - 1} aria-label="Next demo step (Page Down)" title="Next (Page Down)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <button className="icon-btn" onClick={() => setPresenter(false)} aria-label="Leave presenter mode" title="Leave presenter mode (P)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
