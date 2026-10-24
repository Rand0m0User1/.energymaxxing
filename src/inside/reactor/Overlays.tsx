// HTML overlays on top of the canvas: the k gauge, counters and short messages.
// They poll the simulation a few times a second (never per frame) so the big tree does not re-render.
import { useEffect, useState } from 'react';
import { Panel, RealTerm } from '../../ui/kit';
import { Fact } from '../../ui/Fact';
import { fv } from '../../data/facts';
import type { ChainSim } from './chainSim';
import { coreK, formatEnergy, KGauge, PAL, zoneColor, zoneOf, type CoreState } from './shared';

function usePoll<T>(read: () => T, ms = 125): T {
  const [v, setV] = useState<T>(read);
  useEffect(() => {
    const id = window.setInterval(() => setV(read()), ms);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return v;
}

const SAFETY = 'Real reactors are designed so that if they get hotter, the reaction slows down on its own. Control rods also drop in automatically.';
const HELD = 'A power reactor is held at exactly 1, so the same amount of heat comes out every second.';

function Meter({ k, active, note, safety }: { k: number; active: boolean; note?: string; safety: boolean }) {
  const z = zoneOf(k);
  return (
    <div className="rx-over rx-meter">
      <Panel>
        <p className="rx-meter-title">New splits caused by each split</p>
        <RealTerm>multiplication factor, k</RealTerm>
        <KGauge k={k} active={active} />
        <div className="rx-row" style={{ marginTop: 0 }}>
          <span className="rx-meter-zone" style={{ color: active ? zoneColor(z) : 'var(--ink-3)' }}>
            {active ? (z === 'shrinking' ? 'Shrinking' : z === 'steady' ? 'Steady' : 'Growing') : 'No reaction'}
          </span>
          <span className="num small muted">k ≈ {k.toFixed(2)}</span>
        </div>
        <p className="rx-meter-note">{note ?? HELD}</p>
        {safety && <div className="rx-safety" role="status">{SAFETY}</div>}
      </Panel>
    </div>
  );
}

/** Level 2 gauge, driven by the simple rod formula, plus a heat bar that grows or shrinks over time. */
export function CoreOverlay({ core }: { core: CoreState }) {
  const snap = usePoll(() => ({ k: coreK(core.shown), power: core.power }));
  const growing = snap.k > 1.03 && snap.power > 0.85;
  return (
    <>
      <Meter k={snap.k} active safety={growing} />
      <div className="rx-over rx-counter">
        <Panel>
          <div className="rx-row" style={{ margin: 0 }}><strong>Heat coming out</strong><span className="num muted">{Math.round(snap.power * 100)}% of full</span></div>
          <div className="rx-bar" aria-hidden><div style={{ width: `${Math.round(snap.power * 100)}%` }} /></div>
        </Panel>
      </div>
    </>
  );
}

/** Level 5 gauge, counters and messages, read from the chain reaction model. */
export function AtomsOverlay({ sim }: { sim: ChainSim }) {
  const snap = usePoll(() => {
    const st = sim.stats;
    return {
      k: st.kSmooth,
      active: st.neutrons > 0 || st.pending > 0,
      hasData: st.hasData,
      splits: st.splits,
      neutrons: st.neutrons,
      pending: st.pending,
      capped: st.time - st.lastCapTime < 2,
      growing: st.growingFor > 3,
      water: sim.params.water,
    };
  });
  const energy = snap.splits * fv('joulesPerFission');
  let note: string | undefined;
  if (!snap.water) note = 'Without water the neutrons stay fast. Fast neutrons mostly miss the U-235, so the reaction fades.';
  else if (!snap.active && snap.splits > 0) note = 'The chain reaction has stopped. Fire another neutron to start it again.';
  return (
    <>
      <Meter k={snap.k} active={snap.active || snap.hasData} note={note} safety={snap.growing} />
      {!snap.active && snap.splits === 0 && (
        <div className="rx-over rx-hint"><Panel>Click the atoms or press <span className="rx-key">N</span> to fire a neutron.</Panel></div>
      )}
      <div className="rx-over rx-counter">
        <Panel>
          <div className="num">
            <strong>Splits so far:</strong> {snap.splits.toLocaleString('en-US')} · <strong>Energy released:</strong> ~{formatEnergy(energy)}
          </div>
          <div className="num muted">
            Neutrons flying now: {snap.neutrons}{snap.capped ? ' and many more' : ''}
            {snap.pending > 0 ? ` · ${snap.pending} waiting to come out` : ''}
          </div>
          <div className="muted">
            Each split releases about <Fact k="mevPerFission" unit /> (<Fact k="joulesPerFission" format={(v) => `${(v / 1e-11).toFixed(1)} × 10⁻¹¹ J`} />).
          </div>
        </Panel>
      </div>
      <div className="rx-over rx-keybox">
        <Panel>
          <div className="rx-legend">
            <span><i className="dot" style={{ background: PAL.u235 }} />Uranium-235: splits easily</span>
            <span><i className="dot" style={{ background: PAL.u238 }} />Uranium-238: rarely splits</span>
            <span><i className="dot" style={{ background: PAL.u236 }} />Uranium-236, for a split second</span>
            <span><i className="dot" style={{ background: PAL.barium }} />Barium piece</span>
            <span><i className="dot" style={{ background: PAL.krypton }} />Krypton piece</span>
            <span><i className="dot" style={{ background: '#ffffff', border: '1px solid var(--line-strong)' }} />Neutron (long = fast)</span>
            <span><i className="dot" style={{ background: PAL.water }} />Water</span>
            <span><i className="dot" style={{ background: PAL.pu239 }} />Plutonium-239</span>
            <span><i className="rx-swatch" style={{ background: PAL.rodDark, height: 8, width: 8 }} />Control rod</span>
          </div>
        </Panel>
      </div>
    </>
  );
}
