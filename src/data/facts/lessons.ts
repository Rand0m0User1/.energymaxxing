// Facts added by the lessons module. Owned by that module's builder.
// Mostly lesson settings (model choices); cited numbers live in core.ts and are reused from there.
import { f, type FactMap } from './factType';

export const lessonsFacts = {
  // Lesson 1
  lessonCompareGW: f(1, 'GW', 'Size of each plant compared in lesson 1 (solar vs reactor)', 'assumption', 'assumption'),
  // Lesson 2
  lessonSmallBatteryGWh: f(6, 'GWh', 'A battery too small to last one night in the model city', 'assumption', 'assumption'),
  // Lesson 3
  lessonStartSolarGW: f(2, 'GW', 'Starting solar size in the Abu Dhabi lesson', 'assumption', 'assumption'),
  lessonStartBatteryGWh: f(4, 'GWh', 'Starting battery size in the Abu Dhabi lesson', 'assumption', 'assumption'),
  // Lesson 5
  lessonBerlinWindGW: f(1.5, 'GW', 'Wind added to the Berlin city in the dark doldrums lesson', 'assumption', 'assumption'),
  firmFissionGW: f(0.6, 'GW', 'Reactor added as always-on power in the lessons and demo', 'assumption', 'assumption'),
  // Lesson 6
  handmerSolarMultiple: f(10, '× average use', "Handmer test: solar sized to ten times the city's average use", 'assumption', 'handmer2025'),
  surplusPriceTest: f(20, '$/MWh', 'Price paid for wasted sun in the Handmer lesson', 'assumption', 'assumption'),
  // Lesson 8
  kSteady: f(1, 'k', 'Multiplication factor of a steady chain reaction', 'textbook', 'textbook'),
  softCostShare: f(0.5, 'fraction', 'Share of the 1976–1987 US reactor cost rise from factors outside the hardware (more than half)', 'cited', 'eashgates2020'),
  lessonReactors: f(5, 'reactors', 'Reactors to build on each path in lesson 8', 'assumption', 'assumption'),
  // Lesson 9
  lessonDoublings: f(3, 'doublings', 'Production doublings to try in lesson 9', 'assumption', 'assumption'),
  // Lesson 10
  industryDialHigh: f(100, '$/MWh', 'Top of the Industry Quarter price dial', 'assumption', 'assumption'),
  industryTargetPrice: f(10, '$/MWh', 'Price the viewer dials to in lesson 10', 'assumption', 'assumption'),
  industryDialLow: f(1, '$/MWh', 'Bottom of the Industry Quarter price dial', 'assumption', 'assumption'),
  h2CompetitivePrice: f(20, '$/MWh', 'Power price below which hydrogen from water competes with hydrogen from gas', 'assumption', 'assumption'),
  // Demo script
  demoDoublings: f(4, 'doublings', 'Production doublings in the presenter demo', 'assumption', 'assumption'),
  demoReactors: f(10, 'reactors', 'Reactors built in the presenter demo', 'assumption', 'assumption'),
} satisfies FactMap;
