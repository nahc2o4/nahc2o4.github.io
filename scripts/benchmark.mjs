import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv[2] || '.');
const { GameEngine, freshSave } = await import(
  pathToFileURL(path.join(root, 'lib/game-engine.ts'))
);
const { GameRenderer } = await import(
  pathToFileURL(path.join(root, 'lib/game-renderer.ts'))
);
let calls = 0;
const ctx = new Proxy(
  {
    measureText: (t) => ({ width: t.length * 8 }),
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    canvas: { width: 1600, height: 900 },
  },
  {
    get: (o, k) =>
      k in o
        ? o[k]
        : (...args) => {
            calls++;
          },
  },
);
globalThis.devicePixelRatio = 1;
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
};
const e = new GameEngine(freshSave(), () => 0.37);
const r = new GameRenderer({ getContext: () => ctx, style: {} }, e);
r.resize(1600, 900);
r.ground(0, 0, 1600, 900, '#16884e', '#48b877');
calls = 0;
for (let i = 0; i < 600; i++)
  r.ground(i, 0, 1600 + i, 900, '#16884e', '#48b877');
console.log('ground_draw_calls_600_frames=' + calls);
e.start();
e.invuln = 1e6;
let t = performance.now();
for (let i = 0; i < 6000; i++) e.update(1 / 60);
console.log('engine_6000_steps_ms=' + (performance.now() - t).toFixed(2));
console.log('mobs=' + e.mobs.length + '; particles=' + e.particles.length);
