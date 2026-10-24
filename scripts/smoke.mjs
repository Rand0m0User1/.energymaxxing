// Headless smoke test: opens the app in Edge, walks through every screen and view,
// records console errors and saves screenshots to ./shots (or the dir given as argv[3]).
// Usage: node scripts/smoke.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'shots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const wait = (ms) => page.waitForTimeout(ms);
const app = (fn, arg) => page.evaluate(([src, a]) => { const s = window.__app.getState(); return new Function('s', 'a', src)(s, a); }, [fn, arg]);
let n = 0;
async function shot(name) {
  await wait(900);
  const file = path.join(out, `${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  console.log('shot', file);
}
async function step(name, fn) {
  try { await fn(); await shot(name); } catch (e) { errors.push(`step ${name}: ${e.message}`); console.log('FAILED step', name, e.message); }
}

await page.goto(url, { waitUntil: 'load' });
await wait(2500);
await shot('title');

const timing = await page.evaluate(() => {
  const s = window.__app.getState();
  const t0 = performance.now();
  s.setPlant('solar', { gw: s.input.plants.solar.gw + 0.1 });
  return performance.now() - t0;
});
console.log(`simulate() on slider change: ${timing.toFixed(1)} ms`);

await step('lab-abudhabi-noon', () => app(`s.setScreen('lab'); s.applyPreset('abuDhabi'); s.setTimeOfDay(12);`));
await step('lab-abudhabi-night', () => app(`s.setTimeOfDay(22);`));
await step('lab-helsinki-dec', () => app(`s.setPlace('helsinki'); s.setTimeOfDay(13);`));
await step('lab-helsinki-fission', () => app(`s.setPlant('fission', { on: true, gw: 0.8 }); s.setTimeOfDay(20);`));
await step('lab-week-chart', () => app(`s.setChartRange('week');`));
await step('map-view', () => app(`s.setCameraMode('map');`));
await step('fly-reactor', () => app(`s.setCameraMode('orbit'); s.flyTo('reactor'); s.selectStation('reactor');`));
await step('walk', () => app(`s.selectStation(null); s.setCameraMode('walk'); s.flyTo('solar');`));
await step('place-picker', () => app(`s.setCameraMode('orbit'); s.setPlacePickerOpen(true);`));
await step('sources', () => app(`s.setPlacePickerOpen(false); s.openSources('solarCFUS');`));
await step('help', () => app(`s.closeSources(); s.setHelpOpen(true);`));
await app(`s.setHelpOpen(false);`);
for (const lvl of [1, 2, 3, 4, 5]) await step(`reactor-l${lvl}`, () => app(`s.openInside('reactor', a);`, lvl));
await step('reactor-l5-fire', async () => { await page.mouse.click(600, 450); await wait(300); await page.keyboard.press('n'); await wait(1500); });
for (const v of ['solar', 'battery', 'fusion', 'wind', 'gas', 'hydro']) await step(`inside-${v}`, () => app(`s.openInside(a, 1);`, v));
await app(`s.closeInside();`);
for (const t of ['reactorRow', 'batteryFactory', 'industry']) await step(`tool-${t}`, () => app(`s.openTool(a);`, t));
await step('reactor-row-built', () => app(`s.openTool('reactorRow'); s.setTools({ reactorsBuilt: 6 });`));
await step('industry-cheap', () => app(`s.openTool('industry'); s.setTools({ industryPrice: 8 });`));
await step('beyond-moon', () => app(`s.openTool(null); s.setScreen('beyond');`));
await step('beyond-mars', () => app(`s.setPlace('marsEquator');`));
await step('beyond-orbit', () => app(`s.setPlace('leo');`));
await step('tour-picker', () => app(`s.setPlace('abuDhabi'); s.setScreen('tour'); s.exitLesson();`));
for (const id of ['gigawatt', 'night', 'north', 'reactor', 'cheapPower']) {
  await step('lesson-' + id, () => app('s.startLesson(a);', id));
  await step('lesson-' + id + '-step2', () => app('s.setLessonStep(1);'));
}
await step('presenter', () => app(`s.exitLesson(); s.setScreen('lab'); s.setPresenter(true);`));
await step('play-week', async () => { await app(`s.setPresenter(false); s.setSpeed('day'); s.setPlaying(true);`); await wait(2500); await app(`s.setPlaying(false);`); });

console.log('\nERRORS (' + errors.length + '):');
for (const e of [...new Set(errors)].slice(0, 60)) console.log(' -', e.slice(0, 400));
await browser.close();
