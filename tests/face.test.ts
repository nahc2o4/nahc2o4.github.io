import test from 'node:test';
import assert from 'node:assert/strict';
import { createFace, updateFace } from '../lib/flower-face.ts';
void test('attack and defend smoothly change expression then recover', () => {
  const f = createFace();
  updateFace(f, 'attack', { x: 1, y: 0 }, 1 / 60);
  assert.ok(f.attack > 0 && f.attack < 1);
  assert.ok(f.gazeX > 0);
  for (let i = 0; i < 60; i++) updateFace(f, 'defend', { x: 0, y: -1 }, 1 / 60);
  assert.ok(f.defend > 0.99 && f.attack < 0.001 && f.gazeY < -0.99);
  for (let i = 0; i < 60; i++) updateFace(f, 'normal', { x: 0, y: 0 }, 1 / 60);
  assert.ok(f.defend < 0.001 && Math.abs(f.gazeY) < 0.001);
});
void test('facial smoothing is frame-rate independent and gaze bounded', () => {
  const a = createFace(),
    b = createFace();
  for (let i = 0; i < 30; i++)
    updateFace(a, 'attack', { x: 100, y: 100 }, 1 / 30);
  for (let i = 0; i < 120; i++)
    updateFace(b, 'attack', { x: 100, y: 100 }, 1 / 120);
  assert.ok(Math.abs(a.attack - b.attack) < 1e-10);
  assert.ok(Math.hypot(a.gazeX, a.gazeY) <= 1);
});

void test('combat changes mouth curvature but preserves mouth width and eye drawing', async () => {
  const { drawFlowerFace } = await import('../lib/flower-face.ts');
  const capture = (mode: string) => {
    const calls: unknown[] = [];
    const ctx = new Proxy(
      {},
      {
        get:
          (_, name) =>
          (...args: unknown[]) =>
            calls.push([name, ...args]),
        set: () => true,
      },
    );
    const face = createFace();
    face.attack = mode === 'attack' ? 1 : 0;
    face.defend = mode === 'defend' ? 1 : 0;
    drawFlowerFace(ctx as CanvasRenderingContext2D, 0, 0, 20, face, 1);
    return calls;
  };
  const normal = capture('normal');
  for (const mode of ['attack', 'defend']) {
    const active = capture(mode);
    const eyes = (calls: unknown[]) =>
      calls.filter((c) =>
        ['ellipse', 'rotate', 'translate'].includes((c as string[])[0]),
      );
    assert.deepEqual(eyes(active), eyes(normal));
    assert.notDeepEqual(active, normal);
    const mouth = (calls: unknown[]) => calls.filter((c) =>
      ['moveTo', 'quadraticCurveTo'].includes((c as string[])[0])) as (string | number)[][];
    const before = mouth(normal), after = mouth(active);
    assert.deepEqual(after[0], before[0]);
    assert.deepEqual(after[1].slice(3), before[1].slice(3));
    assert.notEqual(after[1][2], before[1][2]);
  }
});

void test('left gaze reaches the outer side while neutral and right pupils stay unchanged', async () => {
  const { drawFlowerFace } = await import('../lib/flower-face.ts');
  const pupils = (gazeX: number) => {
    const ellipses: number[][] = [];
    const ctx = new Proxy({}, {
      get: (_, name) => (...args: number[]) => { if (name === 'ellipse') ellipses.push(args); },
      set: () => true,
    });
    drawFlowerFace(ctx as CanvasRenderingContext2D, 0, 0, 20,
      { ...createFace(), gazeX }, 1);
    return ellipses.filter((args) => args[2] === 0.06).map((args) => args[0]);
  };
  assert.deepEqual(pupils(0), [0.045, 0.045]);
  assert.deepEqual(pupils(1), [0.093, 0.093]);
  for (const x of pupils(-1)) assert.ok(Math.abs(x + 0.093) < 1e-12);
  for (const x of pupils(-0.5)) assert.ok(x < 0);
  assert.ok(Math.abs(pupils(-1e-6)[0] - pupils(0)[0]) < 1e-6);
});
