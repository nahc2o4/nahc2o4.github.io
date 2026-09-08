import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSprites, preparedSprites } from '../lib/sprite-loader.ts';
const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8'));
test('five SVG trial sprites are layered vectors and retain original size metadata', () => {
  const keys = ['Basic', 'Rose', 'Wing', 'ladybug', 'bee'];
  for (const key of keys) {
    const info = manifest[key];
    const svg = fs.readFileSync('public' + info.vector.src, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /<g id="(?:body|wing|head|stinger)"/);
    assert.doesNotMatch(svg, /<image\b|data:image|<script\b|<foreignObject\b/);
    assert.ok(fs.existsSync('public' + info.src));
  }
  assert.deepEqual(manifest.Basic.bbox, [75, 64, 223, 211]);
  assert.deepEqual(manifest.Wing.bbox, [59, 75, 254, 242]);
  assert.deepEqual(manifest.ladybug.vector.bbox, [147, 147, 457, 457]);
  assert.equal(manifest.Flower.vector, undefined);
});
test('loader uses SVG when decoded and falls back to original on SVG decode failure', async () => {
  const originals = Object.fromEntries(['fetch', 'Image', 'document'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const drawn: string[] = [];
  const fixture = {
    good: { src: 'good.webp', vector: { src: 'good.svg' }, bbox: [0, 0, 20, 20], width: 20, height: 20 },
    bad: { src: 'bad.webp', vector: { src: 'bad.svg' }, bbox: [0, 0, 20, 20], width: 20, height: 20 },
  };
  class ImageStub {
    src = '';
    async decode() { if (this.src === 'bad.svg') throw Error('decode failed'); }
  }
  const values = {
    fetch: async () => ({ ok: true, json: async () => fixture }),
    Image: ImageStub,
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (img: ImageStub) => drawn.push(img.src) }) }) },
  };
  try {
    for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    await loadSprites();
    assert.deepEqual(drawn.sort(), ['bad.webp', 'good.svg']);
    assert.equal(preparedSprites.good.width, 20);
    assert.equal(preparedSprites.bad.width, 20);
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
