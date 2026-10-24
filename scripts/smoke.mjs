// Headless walkthrough in Edge: screenshots of each state and any console errors.
// Usage: node scripts/smoke.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'shots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const run = (src) => page.evaluate((s) => new Function('s', s)(window.__app.getState()), src);
let n = 0;
async function shot(name, src) {
  try {
    if (src) await run(src);
    await page.waitForTimeout(900);
    const file = path.join(out, `${String(++n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file });
    console.log('shot', file);
  } catch (e) { errors.push(`${name}: ${e.message}`); }
}

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await shot('title');
await shot('earth-summer-noon', `s.setScreen('explore');`);
await shot('earth-summer-night', `s.setTimeOfDay(23);`);
await shot('earth-summer-night-battery', `s.setOn('battery', true);`);
await shot('earth-winter-night-battery', `s.setSeason('winter'); s.setTimeOfDay(6);`);
await shot('earth-winter-nuclear', `s.setOn('nuclear', true);`);
await shot('inspect-solar', `s.setTimeOfDay(12); s.selectStation('solar');`);
await shot('moon-day', `s.selectStation(null); s.setEnv('moon'); s.setOnly(['solar', 'battery']); s.setTimeOfDay(12);`);
await shot('moon-night', `s.setTimeOfDay(21);`);
await shot('moon-night-nuclear', `s.setOn('nuclear', true);`);
await shot('back-to-earth', `s.setEnv('earth');`);
await shot('battery-lead', `s.setPlace('earth'); s.setSeason('spring'); s.setOnly(['solar', 'battery']); s.setBatteryType('lead'); s.setTimeOfDay(5);`);
await shot('moon-pole', `s.setPlace('moonPole'); s.setOnly(['solar', 'battery']); s.setTimeOfDay(17);`);
for (const d of ['batteryFuture', 'nuclear', 'industry']) await shot('demo-' + d, `s.setPlace('earth'); s.openDemo('${d}');`);
await shot('demo-closed', `s.openDemo(null);`);
const tours = await page.evaluate(() => null);
for (const [id, n] of [['earth', 7], ['batteries', 7], ['nuclear', 4], ['industry', 6], ['moon', 6]]) {
  for (let i = 0; i < n; i++) await shot(`tour-${id}-${i + 1}`, i === 0 ? `s.startTour('${id}');` : `s.setTourStep(${i});`);
}
await shot('end', `s.endTour();`);

console.log(`\nERRORS (${errors.length}):`);
for (const e of [...new Set(errors)]) console.log(' -', e.slice(0, 300));
await browser.close();
