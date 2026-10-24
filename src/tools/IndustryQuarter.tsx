// Industry Quarter (SPEC §13): a big price dial from $100 to $1 per MWh, and four industries that react.
import { useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useApp } from '../store';
import { fv } from '../data/facts';
import { Slider, RealTerm } from '../ui/kit';
import { Fact } from '../ui/Fact';
import {
  dialToPrice, hydrogenTonnesFromTWh, industryNumbers, industryState, industryThreshold, money, pct, priceToDial, tidyPrice,
  type IndustryKind,
} from './model';
import { KV, LabeledSwitch, Section, StatePill } from './parts';

const usd = (v: number) => `$${v.toLocaleString('en-US')}`;
const priceText = (p: number) => `$${p >= 10 ? Math.round(p) : p.toFixed(1)}`;

// ---------------- The dial ----------------

const CX = 110, CY = 108, R = 80, A0 = -135, SWEEP = 270;

function polar(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function arc(a0: number, a1: number, r: number): string {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

function PriceDial({ price, onChange }: { price: number; onChange: (p: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const t = priceToDial(price);
  const ang = A0 + SWEEP * t;
  const [kx, ky] = polar(ang, R);

  const tFromEvent = (e: PointerEvent<SVGSVGElement>): number | null => {
    const el = ref.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const sx = ((e.clientX - rect.left) / rect.width) * 220;
    const sy = ((e.clientY - rect.top) / rect.height) * 200;
    let a = (Math.atan2(sx - CX, -(sy - CY)) * 180) / Math.PI;
    if (a > -A0) a = -A0;
    if (a < A0) a = A0;
    return (a - A0) / SWEEP;
  };
  const apply = (nt: number | null) => {
    if (nt == null) return;
    // Ignore jumps across the gap at the bottom of the dial.
    if (dragging.current && Math.abs(nt - t) > 0.5) return;
    onChange(tidyPrice(dialToPrice(nt)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const k = e.key;
    let p = price;
    if (k === 'ArrowUp' || k === 'ArrowLeft') p = price * 1.12;
    else if (k === 'ArrowDown' || k === 'ArrowRight') p = price / 1.12;
    else if (k === 'PageUp') p = price * 2;
    else if (k === 'PageDown') p = price / 2;
    else if (k === 'Home') p = fv('iqPriceMin');
    else if (k === 'End') p = fv('iqPriceMax');
    else return;
    e.preventDefault();
    onChange(tidyPrice(Math.min(fv('iqPriceMax'), Math.max(fv('iqPriceMin'), p))));
  };

  const ticks = [fv('iqPriceMax'), 30, 10, 3, fv('iqPriceMin')];
  const marks: { kind: IndustryKind; label: string }[] = [
    { kind: 'smelter', label: 'Aluminium smelter break-even' },
    { kind: 'hydrogen', label: 'Hydrogen break-even' },
    { kind: 'desal', label: 'Desalination and air capture break-even' },
  ];

  return (
    <svg
      ref={ref} className="iq-dial" viewBox="0 0 220 200" tabIndex={0} role="slider"
      aria-label="Electricity price dial" aria-valuemin={fv('iqPriceMin')} aria-valuemax={fv('iqPriceMax')} aria-valuenow={price}
      aria-valuetext={`${priceText(price)} per MWh`}
      onPointerDown={(e) => { dragging.current = false; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } apply(tFromEvent(e)); dragging.current = true; }}
      onPointerMove={(e) => { if (dragging.current) apply(tFromEvent(e)); }}
      onPointerUp={(e) => { dragging.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* not captured */ } }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={onKey}
    >
      <path d={arc(A0, A0 + SWEEP, R)} fill="none" stroke="var(--line-strong)" strokeWidth={10} strokeLinecap="round" />
      {t > 0.002 && <path d={arc(A0, ang, R)} fill="none" stroke="var(--accent)" strokeWidth={10} strokeLinecap="round" opacity={0.85} />}
      {ticks.map((v) => {
        const a = A0 + SWEEP * priceToDial(v);
        const [x1, y1] = polar(a, R + 8);
        const [x2, y2] = polar(a, R + 13);
        const [tx, ty] = polar(a, R + 24);
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-3)" />
            <text x={tx} y={ty + 4} fontSize="10" textAnchor="middle" fill="var(--ink-3)">${v}</text>
          </g>
        );
      })}
      {marks.map((m) => {
        const th = industryThreshold(m.kind) ?? 0;
        const [mx, my] = polar(A0 + SWEEP * priceToDial(th), R - 16);
        return (
          <circle key={m.kind} cx={mx} cy={my} r={3.5} fill={price <= th ? 'var(--accent)' : 'var(--panel-solid)'} stroke="var(--ink-3)">
            <title>{`${m.label}: ${priceText(th)} per MWh`}</title>
          </circle>
        );
      })}
      <circle cx={kx} cy={ky} r={11} fill="var(--panel-solid)" stroke="var(--accent)" strokeWidth={2} />
      <text x={CX} y={CY + 2} fontSize="34" fontWeight={600} textAnchor="middle" fill="var(--ink)">{priceText(price)}</text>
      <text x={CX} y={CY + 22} fontSize="11" textAnchor="middle" fill="var(--ink-2)">per MWh</text>
    </svg>
  );
}

// ---------------- Cards ----------------

function ShareBar({ share }: { share: number }) {
  const s = Math.max(0, Math.min(1, share));
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }} aria-hidden>
      <div style={{ width: `${s * 100}%`, height: '100%', background: 'var(--ink-2)', transition: 'width 200ms' }} />
    </div>
  );
}

function IndustryCard({ kind, title, plain, price, share, canStore, product, breakEven, real }: {
  kind: IndustryKind; title: string; plain: ReactNode; price: number; share: number;
  canStore: ReactNode; product: ReactNode; breakEven: ReactNode; real?: string;
}) {
  return (
    <div className="tool-card">
      <div className="tool-row between" style={{ gap: 6 }}>
        <h4>{title}</h4>
        <StatePill state={industryState(kind, price)} />
      </div>
      <p className="tool-p">{plain}</p>
      <KV k="Energy share of cost">{pct(share)}</KV>
      <ShareBar share={share} />
      <KV k="Can it store its product and run only when power is cheap?">{canStore}</KV>
      <KV k="Product cost at this price">{product}</KV>
      <div className="xsmall faint">{breakEven}</div>
      {real && <RealTerm>{real}</RealTerm>}
    </div>
  );
}

function tonnes(t: number): string {
  if (!isFinite(t) || t <= 0) return '0 tonnes';
  if (t >= 1e6) return `${(t / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })} million tonnes`;
  return `${Math.round(t).toLocaleString('en-US')} tonnes`;
}

function WastedSun() {
  const flex = useApp((s) => s.input.industryFlex);
  const setInput = useApp((s) => s.setInput);
  const result = useApp((s) => s.result);
  const curtailed = Math.max(0, result.totals.curtailedTWh || 0);
  const absorbed = useMemo(() => {
    const a = result.industryAbsorbed;
    if (!a) return 0;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i];
    const v = (sum * (result.stepHours || 0)) / 1000;
    return isFinite(v) ? Math.max(0, v) : 0;
  }, [result]);
  const twh = (v: number) => `${v.toLocaleString('en-US', { maximumFractionDigits: v < 1 ? 2 : 1 })} TWh`;

  return (
    <Section title="Use the city's wasted sun">
      <LabeledSwitch checked={flex} onChange={(v) => setInput({ industryFlex: v })} label="Use the city's wasted sun">
        Let flexible industry use the solar power the city would otherwise throw away
      </LabeledSwitch>
      <div className="tool-card">
        <KV k="Wasted sun in this run (how much)">{twh(curtailed)}</KV>
        {flex && <KV k="Used by industry instead">{twh(absorbed)}</KV>}
        <p className="tool-p num">
          {curtailed + absorbed <= 0
            ? 'No wasted sun in this run yet. Add more solar in the City Lab, or try "Build like Casey Handmer".'
            : flex
              ? `That is enough electricity to make about ${tonnes(hydrogenTonnesFromTWh(absorbed))} of hydrogen.`
              : `That could make about ${tonnes(hydrogenTonnesFromTWh(curtailed))} of hydrogen.`}
        </p>
        <RealTerm>curtailment, absorbed by flexible load</RealTerm>
      </div>
    </Section>
  );
}

export default function IndustryQuarter() {
  const price = useApp((s) => s.tools.industryPrice);
  const setTools = useApp((s) => s.setTools);
  const p = Math.min(fv('iqPriceMax'), Math.max(fv('iqPriceMin'), price || fv('iqPriceMax')));
  const n = industryNumbers(p);
  const set = (v: number) => setTools({ industryPrice: v });
  const perMWh = (v: number) => `${usd(v)} per MWh`;

  return (
    <>
      <Section>
        <p className="tool-lead">Turn the dial to make electricity cheaper. Watch which industries grow.</p>
        <div className="tool-row" style={{ alignItems: 'center', gap: 16 }}>
          <PriceDial price={p} onChange={set} />
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="tool-p">Drag the knob, or use the arrow keys. Today, new solar costs about <Fact k="lcoeSolarLow" format={(v) => `$${v}`} /> to <Fact k="lcoeSolarHigh" format={(v) => `$${v}`} /> per MWh.</p>
            <Slider value={priceToDial(p)} min={0} max={1} step={0.005} label="Electricity price" onChange={(t) => set(tidyPrice(dialToPrice(t)))} />
            <div className="tool-row between xsmall faint">
              <span><Fact k="iqPriceMax" format={usd} /></span>
              <span><Fact k="iqPriceMin" format={usd} /></span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Four industries">
        <div className="tool-grid2">
          <IndustryCard
            kind="smelter" title="Aluminium smelter" price={p} share={n.smelter.share}
            plain={<>Pulls aluminium out of its ore with huge electric currents. Each tonne takes about <Fact k="iqSmelterMWhPerT" format={(v) => `${v} MWh`} />.</>}
            canStore="No. The pots must run all the time or the metal freezes."
            product={`${money(n.smelter.perT)} per tonne`}
            breakEven={<>Worth building at <Fact k="iqSmelterThreshold" format={perMWh} /> or less.</>}
            real="electrolysis (Hall–Héroult process)"
          />
          <IndustryCard
            kind="datacenter" title="Data center" price={p} share={n.datacenter.share}
            plain={<>Runs computers day and night. Power is small next to the servers: about <Fact k="dcPowerCostPerYearB" format={(v) => `$${v} billion`} /> a year against <Fact k="dcServerCostB" format={(v) => `$${v} billion`} /> of servers for 1 GW.</>}
            canStore="Mostly no. Some batch jobs can wait a few hours."
            product={`${money(n.datacenter.powerB * 1e9)} a year of power for 1 GW`}
            breakEven="Runs at any price. A fast grid connection matters more than cheap power."
          />
          <IndustryCard
            kind="hydrogen" title="Hydrogen and ammonia plant" price={p} share={n.hydrogen.share}
            plain={<>Splits water into hydrogen with electricity, about <Fact k="iqH2KWhPerKg" format={(v) => `${v} kWh`} /> per kg. Much of it becomes ammonia for fertiliser.</>}
            canStore="Yes. Hydrogen and ammonia keep in tanks, so the plant can run only in cheap hours."
            product={<>{money(n.hydrogen.perKg)} per kg (from gas: <Fact k="iqGreyH2PerKg" format={(v) => `$${v.toFixed(2)}`} />)</>}
            breakEven={<>Matches hydrogen made from gas at <Fact k="iqH2Threshold" format={perMWh} /> or less.</>}
            real="green hydrogen, made by electrolysis"
          />
          <IndustryCard
            kind="desal" title="Desalination and carbon capture" price={p} share={n.desal.share}
            plain={<>Turns seawater into fresh water, about <Fact k="iqDesalKWhPerM3" format={(v) => `${v} kWh`} /> per m³. Or pulls CO2 out of the air, about <Fact k="iqDacMWhPerT" format={(v) => `${v} MWh`} /> per tonne.</>}
            canStore="Yes. Water goes into reservoirs and CO2 into storage."
            product={<>{money(n.desal.waterPerM3)} per m³ of water; {money(n.desal.co2PerT)} per tonne of CO2</>}
            breakEven={<>Becomes possible at large scale at <Fact k="iqDesalThreshold" format={perMWh} /> or less. Energy share shown is for carbon capture.</>}
            real="reverse osmosis and direct air capture"
          />
        </div>
        <div className="tool-caption">
          States: not worth it above the break-even price, competitive at or below it, booming at <Fact k="iqBoomFactor" format={() => 'half'} /> of it or less.
          Other costs per unit are our assumptions.
        </div>
      </Section>

      <p className="tool-aha">
        Cheaper power does not help every industry the same way. Industries that can store their product and run when power is cheap win the most.
      </p>

      <WastedSun />

      <Section title="What becomes possible as power gets far cheaper">
        <ul className="tool-list">
          <li><b>Manufacturing.</b> Metals made with electricity, like aluminium and green steel, get much cheaper, because power is a big part of their cost.</li>
          <li><b>Data centers.</b> Cheaper power helps a little. Getting connected quickly helps more.</li>
          <li><b>Chemical processing.</b> Hydrogen, fertiliser and fuels can be made from water and air, timed to the cheapest hours.</li>
          <li><b>Desalination.</b> Fresh water from the sea becomes cheap enough to grow food in dry places, and pulling CO2 from the air starts to make sense.</li>
        </ul>
      </Section>
    </>
  );
}
