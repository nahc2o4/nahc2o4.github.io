import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PETALS } from '../lib/game-data.ts';
import { spriteManifest, petalThumbnailSize, petalWorldSize } from '../lib/sprite-loader.ts';
Object.assign(spriteManifest, JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')));
test('all 16 petal thumbnail silhouettes retain their original Wiki frame proportions', () => {
  for (const key of Object.keys(PETALS)) {
    const s = spriteManifest[key];
    const expected = Math.max(s.bbox[2] - s.bbox[0], s.bbox[3] - s.bbox[1]);
    assert.equal(petalThumbnailSize(key, 290), expected, key);
    assert.ok(petalThumbnailSize(key, 44) <= 44, key);
    assert.ok(Math.abs(petalThumbnailSize(key, 88) - petalThumbnailSize(key, 44) * 2) < 1e-10, key);
  }
});
test('world petals shrink 30% without changing thumbnails or explicit display sizes', () => {
  assert.equal(petalWorldSize('Basic'), 15.75);
  assert.equal(petalWorldSize('Basic', 23), 23);
  assert.equal(petalThumbnailSize('Basic', 290), 148);
  for (const key of Object.keys(PETALS)) {
    assert.ok(Math.abs(petalWorldSize(key) - petalWorldSize(key, 22.5) * 0.7) < 1e-10, key);
    assert.ok(Math.abs(petalWorldSize(key) / petalWorldSize('Basic') -
      petalThumbnailSize(key, 1) / petalThumbnailSize('Basic', 1)) < 1e-10, key);
  }
  assert.ok(petalWorldSize('Stinger') < petalWorldSize('Basic'));
  assert.ok(petalWorldSize('Light') < petalWorldSize('Basic'));
  assert.ok(petalWorldSize('Cactus') > petalWorldSize('Basic'));
});
test('thumbnail fallback remains finite before the manifest is available', () => {
  assert.equal(petalThumbnailSize('unknown', 44), 22);
  assert.ok(Number.isFinite(petalWorldSize('unknown')));
});
