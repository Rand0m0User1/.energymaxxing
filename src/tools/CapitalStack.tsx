// Capital stack tower (SPEC §10.3): who pays at each stage, and how that changes as more reactors are built.
import type { ReactNode } from 'react';
import { useApp } from '../store';
import { fv } from '../data/facts';
import { SOURCE_COLORS } from '../data/colors';
import { RealTerm, Slider } from '../ui/kit';
import { AssumptionTag, Fact } from '../ui/Fact';
import { capitalStack, money, pct, reactorCostPerMWh, reactorPads, reactorPricePerKW, type StackBlock } from './model';
import { setReactorsBuilt } from './actions';
import { Section } from './parts';

const OPACITY: Record<StackBlock['id'], number> = { vc: 0.95, gov: 0.72, fuel: 0.52, ppa: 0.36, debt: 0.2 };

function blockNote(id: StackBlock['id']): ReactNode {
  switch (id) {
    case 'vc':
      return 'Highest risk, so it wants the biggest return.';
    case 'gov':
      return 'For example US Department of Energy programs, plus strategic investors.';
    case 'fuel':
      return <>Such as the <Fact k="haleuAward" format={(v) => `$${v} million`} /> awarded to General Matter and American Centrifuge Operating to make HALEU fuel.</>;
    case 'ppa':
      return (
        <>
          Google with Kairos Power <AssumptionTag text="verify" /> and with CFS, Microsoft with Helion and the Three Mile Island restart <AssumptionTag text="verify" />,
          Amazon with X-energy <AssumptionTag text="verify" />.
        </>
      );
    case 'debt':
      return 'Low risk, low return. Once the price is proven, cheap loans pay for most of each reactor.';
  }
}

export default function CapitalStack() {
  const built = useApp((s) => s.tools.reactorsBuilt);
  const path = useApp((s) => s.tools.reactorPath);
  const custom = useApp((s) => s.tools.customLearningRate);
  const waccPct = useApp((s) => s.input.costs.waccPct);

  const pads = reactorPads();
  const n = Math.max(1, Math.min(pads, Math.round(built || 0)));
  const mw = fv('vogtleReactorMW');
  const totalFor = (k: number) => reactorPricePerKW(path, custom, k) * mw * 1000;
  const total = totalFor(n);
  const { blocks, blendedRate } = capitalStack(n, total);
  const first = capitalStack(1, totalFor(1)).blendedRate;
  const last = capitalStack(pads, totalFor(pads)).blendedRate;

  // Tower height is proportional to dollars, scaled to the most expensive reactor on this path.
  let maxTotal = 0;
  for (let k = 1; k <= pads; k++) maxTotal = Math.max(maxTotal, totalFor(k));
  const TW = 120, TH = 220;
  const scale = maxTotal > 0 ? TH / maxTotal : 0;
  let yCursor = TH - total * scale;
  const rects = blocks.map((b) => {
    const h = b.dollars * scale;
    const r = { b, y: yCursor, h };
    yCursor += h;
    return r;
  });

  const price = reactorPricePerKW(path, custom, n);
  return (
    <Section title="Who pays? The capital stack">
      <p className="tool-lead">Who pays for the first ones decides who wins.</p>
      <p className="tool-p">
        Each block is money for reactor {n}, stacked by who puts it in. Block height shows dollars. Risky money sits on top and costs the most.
      </p>
      <div className="tool-row between small">
        <span>How many reactors built</span>
        <b className="num">{Math.min(pads, built)}</b>
      </div>
      <Slider value={Math.min(pads, built)} min={0} max={pads} step={1} label="How many reactors built" onChange={(v) => setReactorsBuilt(v)} />

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        <svg width={TW} height={TH + 18} viewBox={`0 0 ${TW} ${TH + 18}`} role="img" aria-label="Capital stack tower" style={{ flex: 'none' }}>
          <line x1={0} x2={TW} y1={TH + 0.5} y2={TH + 0.5} stroke="var(--line-strong)" />
          {rects.map(({ b, y, h }) => (
            <rect key={b.id} x={14} y={y} width={TW - 28} height={Math.max(0, h - 1)} rx={3}
              fill={SOURCE_COLORS.fission} fillOpacity={OPACITY[b.id]} style={{ transition: 'all 400ms ease' }} />
          ))}
          <text x={TW / 2} y={TH + 14} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{money(total)}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
          {blocks.map((b) => (
            <div key={b.id} style={{ display: 'flex', gap: 8 }}>
              <span className="dot" style={{ background: SOURCE_COLORS.fission, opacity: OPACITY[b.id], marginTop: 4, borderRadius: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-row between" style={{ gap: 6 }}>
                  <b className="small">{b.stage}</b>
                  <span className="xsmall num">{money(b.dollars)} &middot; {pct(b.share)}</span>
                </div>
                <div className="xsmall muted">{b.who}. {blockNote(b.id)}</div>
                <div className="xsmall faint">Expects about <Fact k={b.ret} percent digits={0} /> a year</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tool-card">
        <div className="tool-row between">
          <span className="small">Blended cost of money for reactor {n}</span>
          <span className="tool-big">{pct(blendedRate, 1)}</span>
        </div>
        <div className="xsmall muted num">
          First reactor: {pct(first, 1)}. Reactor {pads}: {pct(last, 1)}. As the risky blocks shrink, money gets cheaper.
        </div>
        <div className="xsmall muted num">
          At {pct(blendedRate, 1)}, reactor {n}&rsquo;s power would cost about {money(reactorCostPerMWh(price, blendedRate * 100))} per MWh
          (at the City Lab rate of {waccPct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%: {money(reactorCostPerMWh(price, waccPct))}).
        </div>
        <div className="xsmall faint">
          Money shares, returns and the shift from first to tenth reactor are our assumptions. The reactor is a <Fact k="vogtleReactorMW" unit /> unit like Vogtle&rsquo;s.
        </div>
        <RealTerm>weighted average cost of capital (WACC)</RealTerm>
      </div>
    </Section>
  );
}
