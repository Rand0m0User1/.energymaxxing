// Builds one self-contained HTML file (JS, CSS and fonts inline) for publishing as a shareable page.
// Usage: node scripts/make-artifact.mjs   ->  dist-artifact/the-length-of-the-night.html
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, ARTIFACT: '1' } });

const dir = 'dist-artifact/build';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const jsFile = html.match(/src="\.\/(assets\/[^"]+\.js)"/)[1];
const cssFile = html.match(/href="\.\/(assets\/[^"]+\.css)"/)[1];
const js = fs.readFileSync(path.join(dir, jsFile), 'utf8').replace(/<\/script/gi, '<\/script');
const css = fs.readFileSync(path.join(dir, cssFile), 'utf8').replace(/<\/style/gi, '<\/style');
const leftover = css.match(/url\((?!data:)[^)]+\)/g);
if (leftover) console.warn('CSS still references external files:', leftover.slice(0, 5));

// The publish step wraps this in its own doctype/head/body, so only page content goes here.
const out = `<title>The Length of the Night</title>
<meta name="description" content="How much darkness can a city survive? An interactive 3D energy city simulation.">
<style>
html, body { height: 100%; }
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;
fs.writeFileSync('dist-artifact/the-length-of-the-night.html', out);
console.log('wrote dist-artifact/the-length-of-the-night.html', (out.length / 1e6).toFixed(2), 'MB');
