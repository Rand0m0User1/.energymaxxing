// Hosts the special tools panels (SPEC §2.8): Reactor Row, Battery Factory, Industry Quarter, Beyond Earth.
// A large floating panel on the left so the matching 3D buildings stay visible on the right.
import { useEffect } from 'react';
import { useApp } from '../store';
import { Icon, IconButton } from '../ui/kit';
import type { StationId, ToolId } from '../types';
import ReactorRow from './ReactorRow';
import BatteryFactory from './BatteryFactory';
import IndustryQuarter from './IndustryQuarter';
import BeyondEarthPanel from './BeyondEarthPanel';
import './tools.css';

const TOOL_INFO: Record<ToolId, { title: string; question: string; station: StationId | null }> = {
  reactorRow: { title: 'Reactor Row', question: 'Can fission or fusion get cheap by building many copies? Who pays for the first ones?', station: 'reactor' },
  batteryFactory: { title: 'Battery Factory', question: 'How fast do batteries get cheaper, and what holds grid batteries back?', station: 'batteryFactory' },
  industry: { title: 'Industry Quarter', question: 'What happens to industry when power gets very cheap?', station: 'industry' },
  beyond: { title: 'Beyond Earth', question: 'Does the answer change in orbit, on the Moon or on Mars?', station: null },
};

export default function ToolHost() {
  const tool = useApp((s) => s.tool);
  const openTool = useApp((s) => s.openTool);
  const flyTo = useApp((s) => s.flyTo);

  useEffect(() => {
    if (!tool) return;
    const st = TOOL_INFO[tool]?.station;
    if (st) flyTo(st);
  }, [tool, flyTo]);

  if (!tool || !TOOL_INFO[tool]) return null;
  const info = TOOL_INFO[tool];

  return (
    <div className="panel tool-panel" role="dialog" aria-label={info.title}>
      <div className="tool-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{info.title}</h2>
          <div className="tool-q">{info.question}</div>
        </div>
        <IconButton label="Close" onClick={() => openTool(null)}>
          <Icon name="close" />
        </IconButton>
      </div>
      <div className="tool-body" key={tool}>
        {tool === 'reactorRow' && <ReactorRow />}
        {tool === 'batteryFactory' && <BatteryFactory />}
        {tool === 'industry' && <IndustryQuarter />}
        {tool === 'beyond' && <BeyondEarthPanel />}
      </div>
    </div>
  );
}
