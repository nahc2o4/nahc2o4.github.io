// Copy an explicit source allowlist, never private hosting metadata or Git history.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const source = resolve(import.meta.dirname, '..');
const target = resolve(process.argv[2] ?? '../florr.io-github');
if (target === source) throw new Error('Choose a separate GitHub checkout');
mkdirSync(target, { recursive: true });
const entries = ['app', 'components', 'hooks', 'lib', 'public', 'tests', 'scripts', '.github',
  'package.json', 'package-lock.json', 'next.config.ts', 'vite.config.ts', 'tsconfig.json',
  'components.json', '.gitignore', '.oxfmtrc.json', '.oxlintrc.json', 'README.md'];
for (const entry of entries) {
  if (existsSync(resolve(source, entry))) cpSync(resolve(source, entry), resolve(target, entry), { recursive: true });
}
const assetPath = resolve(target, 'public/ASSETS.json');
const assets = JSON.parse(readFileSync(assetPath, 'utf8'));
for (const asset of assets) if (asset.file) asset.file = '/assets/' + basename(asset.file);
writeFileSync(assetPath, JSON.stringify(assets, null, 2) + '\n');
console.log(`Prepared source snapshot: ${target}`);
console.log('Review git diff in that checkout, then commit and push main to update Pages.');
