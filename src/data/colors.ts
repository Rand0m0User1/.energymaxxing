// Source and district colors, used everywhere (particles, charts, cards). See SPEC §14.
import type { DistrictId, SourceId } from '../types';

export const SOURCE_COLORS: Record<SourceId, string> = {
  solar: '#E0A526',
  wind: '#5FA8A0',
  fission: '#7B61C9',
  fusion: '#D46FA0',
  gas: '#8A8178',
  hydro: '#3D7DCA',
  geothermal: '#C2643A',
  battery: '#3BA272',
};

export const UNSERVED_COLOR = '#2B2F33';
export const CURTAILED_COLOR = '#F2D58A';
export const DEMAND_COLOR = '#1d2227';

export const SOURCE_LABELS: Record<SourceId, string> = {
  solar: 'Solar',
  wind: 'Wind',
  fission: 'Reactor (fission)',
  fusion: 'Fusion',
  gas: 'Gas',
  hydro: 'Hydro',
  geothermal: 'Geothermal',
  battery: 'Batteries',
};

export const DISTRICT_LABELS: Record<DistrictId, string> = {
  homes: 'Homes',
  commercial: 'Shops and offices',
  transport: 'Transport (car charging)',
  factory: 'Factory district',
  datacenter: 'Data center campus',
  hydrogen: 'Hydrogen and ammonia plant',
};

/** Soft tints for city districts seen from above. */
export const DISTRICT_TINTS: Record<DistrictId, string> = {
  homes: '#E8DCCB',
  commercial: '#D5DCE4',
  transport: '#D9E3D5',
  factory: '#DCD3CC',
  datacenter: '#CFD3DA',
  hydrogen: '#D6E2E6',
};
