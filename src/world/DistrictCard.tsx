// Small card shown over a clicked city district (SPEC §6.4).
import { useApp } from '../store';
import { Button, IconButton, Icon } from '../ui/kit';
import { Fact, fmtNumber } from '../ui/Fact';
import { stepsPerDay } from '../engine/timeIndex';
import { CITY_DISTRICTS, type CityDistrict } from './cityLayout';
import { districtServed } from './districtState';
import { at, safeStep } from './worldFrame';
import { stopCanvasEvents } from './cursor';

export function DistrictCardBody({ d, label }: { d: CityDistrict; label: string }) {
  const close = () => useApp.getState().selectDistrict(null);
  // Narrow string selector: re-renders only when the shown numbers change.
  const nums = useApp((s) => {
    const i = safeStep(s.result, s.hourOfYear);
    const mine = districtServed(s, d, i);
    let total = 0;
    for (const k of CITY_DISTRICTS) total += districtServed(s, k, i).mw;
    const pct = total > 0 ? (mine.mw / total) * 100 : 0;
    return `${mine.on ? 1 : 0}|${fmtNumber(mine.mw, 0)}|${fmtNumber(pct, 0)}|${mine.frac}`;
  });
  const [onStr, mw, pct, fracStr] = nums.split('|');
  const on = onStr === '1';
  const frac = parseFloat(fracStr);

  return (
    <div style={{ transform: 'translate(-50%, calc(-100% - 10px))' }} {...stopCanvasEvents}>
      <div className="panel" style={{ width: 268, padding: '12px 14px', pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{label}</div>
            <div className="small muted num">
              {on ? (
                <>
                  using {mw} MW now · {pct}% of the city
                </>
              ) : (
                <>switched off</>
              )}
            </div>
          </div>
          <IconButton label="Close" onClick={close} style={{ width: 26, height: 26 }}>
            <Icon name="close" size={14} />
          </IconButton>
        </div>
        {on && frac < 0.995 && (
          <div className="xsmall" style={{ color: 'var(--bad)', marginTop: 4 }}>
            {frac <= 0.02 ? 'No power right now.' : 'Short of power right now. Lights are dimmed.'}
          </div>
        )}
        <Sparkline d={d} />
        <DistrictFact d={d} />
      </div>
    </div>
  );
}

function Sparkline({ d }: { d: CityDistrict }) {
  const result = useApp((s) => s.result);
  const day = useApp((s) => Math.floor(s.hourOfYear / 24));
  const nowFrac = useApp((s) => Math.round(((s.hourOfYear % 24) / 24) * 96) / 96);
  const arr = result.demandByDistrict?.[d];
  const W = 240;
  const H = 34;
  const N = 48;
  const vals: number[] = [];
  if (arr && result.steps > 0) {
    const spd = Math.max(1, stepsPerDay(result));
    const start = safeStep(result, day * 24);
    for (let k = 0; k < N; k++) vals.push(at(arr, Math.min(result.steps - 1, start + Math.floor((k / N) * spd))));
  }
  const max = Math.max(1e-6, ...vals);
  const hasData = vals.some((v) => v > 1e-6);
  const pts = vals.map((v, k) => `${((k / (N - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 6)).toFixed(1)}`).join(' ');
  return (
    <div style={{ marginTop: 8 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Power use through today">
        <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="var(--line-strong)" strokeWidth={1} />
        {hasData && <polyline points={pts} fill="none" stroke="var(--ink-2)" strokeWidth={1.5} strokeLinejoin="round" />}
        <line x1={nowFrac * W} y1={2} x2={nowFrac * W} y2={H - 1} stroke="var(--accent)" strokeWidth={1} />
      </svg>
      <div className="xsmall faint" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Midnight</span>
        <span>Today</span>
        <span>Midnight</span>
      </div>
    </div>
  );
}

function DistrictFact({ d }: { d: CityDistrict }) {
  const openTool = useApp((s) => s.openTool);
  const box = { marginTop: 8, fontSize: 'var(--fs-sm)', color: 'var(--ink)' } as const;
  switch (d) {
    case 'homes':
      return <div style={box}>Most of a home's evening power is lights, cooking and heating or cooling.</div>;
    case 'commercial':
      return <div style={box}>Shops and offices use most of their power in working hours. At night they use little.</div>;
    case 'transport':
      return <div style={box}>Electric cars charge overnight at home, and around midday at work.</div>;
    case 'factory':
      return (
        <div style={box}>
          The factories here run three shifts, so they use power around the clock.
          <div style={{ marginTop: 6 }}>
            <Button onClick={() => openTool('industry')}>Open the Industry Quarter</Button>
          </div>
        </div>
      );
    case 'datacenter':
      return (
        <div style={box}>
          In a typical <Fact k="dcReferenceGW" unit noMarker /> data center, power costs about{' '}
          <Fact k="dcPowerCostPerYearB" format={(v) => `$${fmtNumber(v)} billion`} /> a year, but the servers cost about{' '}
          <Fact k="dcServerCostB" format={(v) => `$${fmtNumber(v)} billion`} />. Cheaper power matters less to it than getting connected fast.
        </div>
      );
  }
}
