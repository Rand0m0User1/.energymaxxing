// Title screen (SPEC §4.1): plain, left-aligned, over the dusk island. The island stays visible on the right.
import { useEffect, useRef } from 'react';
import { useApp } from '../store';
import '../lessons/lessons.css';

function Arrow() {
  return (
    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function TitleScreen() {
  const setScreen = useApp((s) => s.setScreen);
  const openSources = useApp((s) => s.openSources);
  const setPresenter = useApp((s) => s.setPresenter);
  const presenter = useApp((s) => s.presenter);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="title-screen">
      <div className="title-scrim" aria-hidden="true" />
      <main className="title-content">
        <h1 className="title-name">The Length of the Night</h1>
        <p className="title-sub">How much darkness can a city survive?</p>
        <p className="title-line">Solar is cheap. Night is long. How do we keep the lights on?</p>

        <nav className="title-menu" aria-label="Start">
          <button ref={startRef} className="title-btn primary" onClick={() => setScreen('tour')}>
            Start the tour <Arrow />
          </button>
          <button className="title-btn" onClick={() => setScreen('world')}>
            Explore the world <Arrow />
          </button>
          <button className="title-btn" onClick={() => setScreen('lab')}>
            Open the City Lab <Arrow />
          </button>
          <button className="title-btn" onClick={() => setScreen('beyond')}>
            Go beyond Earth <Arrow />
          </button>
        </nav>

        <footer className="title-foot">
          <div>Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat</div>
          <div className="title-foot-row">
            <span>Stanford BASES Six Hour Challenge · Energy</span>
            <button className="title-link" onClick={() => openSources()}>Sources</button>
            <button className="title-link" onClick={() => setPresenter(!presenter)}>
              {presenter ? 'Leave presenter mode' : 'Presenter mode (P)'}
            </button>
          </div>
          <div className="faint">Inspired by PhET Interactive Simulations, University of Colorado Boulder.</div>
        </footer>
      </main>
    </div>
  );
}
