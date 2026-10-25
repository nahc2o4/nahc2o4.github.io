import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('dist/client');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.match(html, /Petal Garden/);
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)[^\"]*"/g)) {
  assert.ok(existsSync(resolve(root, '.' + match[1])), `Missing HTML asset: ${match[1]}`);
}
const manifest = JSON.parse(readFileSync(resolve(root, 'assets/manifest.json'), 'utf8'));
for (const [name, info] of Object.entries(manifest)) {
  assert.ok(existsSync(resolve(root, '.' + info.src)), `Missing sprite: ${name}`);
  if (info.vector) assert.ok(existsSync(resolve(root, '.' + info.vector.src)), `Missing vector: ${name}`);
}
assert.ok(existsSync(resolve(root, 'fonts/ubuntu-bold.ttf')));
assert.ok(existsSync(resolve(root, 'index.rsc')));
assert.ok(!existsSync(resolve(root, '.openai')));
writeFileSync(resolve(root, '.nojekyll'), '');
console.log(`PAGES: HTML, RSC, font and ${Object.keys(manifest).length} sprites verified`);

// Keep the standalone calculator available alongside the existing game.
for (const file of ['index.html', 'style.css', 'app.mjs', 'calc.mjs', 'plan.mjs', 'plan-ui.mjs']) {
  assert.ok(existsSync(resolve(root, 'arcaea-ptt', file)), `Missing calculator asset: ${file}`);
}
assert.match(readFileSync(resolve(root, 'arcaea-ptt/index.html'), 'utf8'), /Arcaea/);
console.log('PAGES: Arcaea PTT calculator verified at /arcaea-ptt/');
