// Facts added by the ui module. Owned by that module's builder.
import { f, type FactMap } from './factType';

export const uiFacts = {
  uiHandmerSolarMultiple: f(10, '×', "Build like Casey Handmer: solar about 10 times the city's average use, plus a big battery", 'verify', 'handmer2025'),
  uiAiCampusGW: f(1, 'GW', 'Size of the largest AI data center campuses now being planned', 'verify', 'epoch2026'),
  uiBatteryExampleGW: f(1, 'GW', 'Example battery power (how fast)', 'textbook', 'textbook'),
  uiBatteryExampleGWh: f(4, 'GWh', 'Example battery energy (how much)', 'textbook', 'textbook'),
  uiYearMin: f(2026, 'year', 'First year you can pick in the City Lab', 'assumption', 'assumption'),
  uiYearMax: f(2050, 'year', 'Last year you can pick in the City Lab', 'assumption', 'assumption'),
} satisfies FactMap;
