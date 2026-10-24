// Loads a URL headless, optionally runs store actions, saves one screenshot and prints errors.
// Usage: node scripts/quickshot.mjs <url> <out.png> ["js using s = store state"]
import { chromium } from 'playwright-core';
const [url, out, action] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
if (action) await page.evaluate((src) => new Function('s', src)(window.__app.getState()), action);
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
console.log('saved', out, '\nerrors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
