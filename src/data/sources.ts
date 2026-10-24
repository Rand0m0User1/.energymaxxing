// Source list. Every fact references one of these keys. Shown in the Sources drawer.

export interface Source {
  title: string;
  who: string;
  year: string;
  url?: string;
  note?: string;
}

export const SOURCES = {
  paper: { title: 'The Length of the Night (team paper)', who: 'Energymaxxing team', year: '2026', note: 'Our Six Hour Challenge paper; cites the primary sources listed here.' },
  handmer2025: { title: 'Energy predictions 2025', who: 'Casey Handmer', year: '2025', url: 'https://caseyhandmer.wordpress.com/' },
  ember2025: { title: 'Global Electricity Review', who: 'Ember', year: '2026', url: 'https://ember-energy.org/' },
  wna2025: { title: 'World Nuclear Performance Report', who: 'World Nuclear Association', year: '2025', url: 'https://world-nuclear.org/' },
  doeCF: { title: 'Electric Power Monthly, capacity factors', who: 'US DOE / EIA', year: '2025', url: 'https://www.eia.gov/electricity/monthly/' },
  lazard2026: { title: 'Levelized Cost of Energy+', who: 'Lazard', year: '2026', url: 'https://www.lazard.com/research-insights/levelized-cost-of-energyplus/' },
  way2022: { title: 'Empirically grounded technology forecasts and the energy transition', who: 'Way, Ives, Mealy, Farmer (Joule)', year: '2022' },
  irena: { title: 'Renewable Power Generation Costs', who: 'IRENA', year: '2024', url: 'https://www.irena.org/' },
  bnef2025: { title: 'Lithium-ion Battery Price Survey', who: 'BloombergNEF', year: '2025' },
  pnnl2022: { title: 'Energy Storage Cost and Performance Database', who: 'Pacific Northwest National Laboratory', year: '2022', url: 'https://www.pnnl.gov/ESGC-cost-performance' },
  iea2025: { title: 'Energy and AI', who: 'International Energy Agency', year: '2025', url: 'https://www.iea.org/reports/energy-and-ai' },
  lbnl2024: { title: 'United States Data Center Energy Usage Report', who: 'DOE / Lawrence Berkeley National Laboratory', year: '2024' },
  epoch2026: { title: 'Data center cost breakdown', who: 'Epoch AI', year: '2026', url: 'https://epoch.ai/' },
  sepulveda2018: { title: 'The role of firm low-carbon electricity resources in deep decarbonization', who: 'Sepulveda et al. (Joule)', year: '2018' },
  eashgates2020: { title: 'Sources of cost overrun in nuclear power plant construction', who: 'Eash-Gates et al. (Joule)', year: '2020' },
  grubler2010: { title: 'The costs of the French nuclear scale-up: a case of negative learning by doing', who: 'Grubler (Energy Policy)', year: '2010' },
  lovering2016: { title: 'Historical construction costs of global nuclear power reactors', who: 'Lovering, Yip, Nordhaus (Energy Policy)', year: '2016' },
  eia2017: { title: 'Electricity prices and the cost of delivery', who: 'US Energy Information Administration', year: '2017', url: 'https://www.eia.gov/' },
  nasaKilopower: { title: 'Kilopower / KRUSTY demonstration', who: 'NASA', year: '2018', url: 'https://www.nasa.gov/' },
  nasaFSP: { title: 'Fission Surface Power', who: 'NASA', year: '2025', url: 'https://www.nasa.gov/' },
  noaaGoes: { title: 'GOES eclipse seasons', who: 'NOAA', year: '2024', url: 'https://www.goes.noaa.gov/' },
  nasaInsight: { title: 'InSight mission ends', who: 'NASA JPL', year: '2022', url: 'https://mars.nasa.gov/insight/' },
  nif2022: { title: 'Ignition at the National Ignition Facility', who: 'Lawrence Livermore National Laboratory', year: '2022', url: 'https://lasers.llnl.gov/' },
  fia2023: { title: 'Fusion Industry Association remarks', who: 'Fusion Industry Association', year: '2023' },
  norris2025: { title: 'Rethinking Load Growth: flexible data center demand', who: 'Norris et al. (Duke Nicholas Institute)', year: '2025' },
  doeHaleu: { title: 'HALEU availability program awards', who: 'US DOE', year: '2025', url: 'https://www.energy.gov/' },
  phet: { title: 'PhET Interactive Simulations', who: 'University of Colorado Boulder', year: '2002–', url: 'https://phet.colorado.edu/' },
  textbook: { title: 'Standard physics (textbook value)', who: 'e.g. Lamarsh, Introduction to Nuclear Engineering', year: '—' },
  assumption: { title: 'Model assumption', who: 'Energymaxxing team', year: '2026', note: 'A simplifying choice made for the model, not a measured fact.' },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;
