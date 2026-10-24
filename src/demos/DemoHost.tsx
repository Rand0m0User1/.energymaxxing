// Overlay that shows the demo a tour opened. Demos teach one idea each and sit apart from the city.
import { useEffect } from 'react';
import './demos.css';
import { useApp, type DemoId } from '../store';
import { Icon } from '../ui/kit';
import BatteryFuture from './BatteryFuture';
import NuclearNth from './NuclearNth';
import Industry from './Industry';

const TITLES: Record<DemoId, string> = {
  batteryFuture: 'The future of batteries',
  nuclear: 'Fission and the nth reactor',
  industry: 'Cheap power and industry',
};

export default function DemoHost() {
  const demo = useApp((s) => s.demo);
  const tour = useApp((s) => s.tour);
  const openDemo = useApp((s) => s.openDemo);

  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openDemo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demo, openDemo]);

  if (!demo) return null;
  const close = () => openDemo(null);
  return (
    <>
      <div className="demo-dim" onClick={close} aria-hidden="true" />
      <section className={`panel demo ${tour ? 'with-tour' : ''}`} role="dialog" aria-label={TITLES[demo]}>
        <header className="demo-head">
          <h2>{TITLES[demo]}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close" title="Close"><Icon name="close" /></button>
        </header>
        <div className="demo-body">
          {demo === 'batteryFuture' && <BatteryFuture />}
          {demo === 'nuclear' && <NuclearNth />}
          {demo === 'industry' && <Industry />}
        </div>
      </section>
    </>
  );
}
