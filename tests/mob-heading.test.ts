import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOBS } from '../lib/game-data.ts';
import { GameEngine, freshSave } from '../lib/game-engine.ts';
import { spriteManifest, mobSpriteAngle } from '../lib/sprite-loader.ts';
Object.assign(spriteManifest, JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')));

test('every mob sprite is calibrated so its drawn front equals its movement heading', () => {
  for (const def of Object.values(MOBS)) {
    const key = def.asset!;
    const info = spriteManifest[key];
    assert.ok(Number.isFinite(info.headAngle), key);
    for (const heading of [-Math.PI, -1, 0, 1, Math.PI]) {
      const drawnFront = mobSpriteAngle(key, heading) + (info.rotation ?? 0) + info.headAngle!;
      assert.ok(Math.abs(drawnFront - heading) < 1e-12, key);
    }
  }
  assert.equal(spriteManifest.crab.headAngle, -Math.PI / 4);
  assert.equal(spriteManifest.ladybug.headAngle, -3 * Math.PI / 4);
  assert.equal(spriteManifest.bee.headAngle, -Math.PI / 4);
});

test('all moving mobs follow their current head even through turns, never side-slip', () => {
  for (const [type, def] of Object.entries(MOBS)) {
    const e = new GameEngine(freshSave(), () => 0.5);
    e.start(); e.mobs = [];
    e.addMob(type, 1400, 1400);
    const m = e.mobs[0];
    m.angle = 0; m.targetAngle = Math.PI * 0.8; m.wander = 100;
    m.vx = 0; m.vy = 40;
    for (let n = 0; n < 90; n++) {
      const x = m.x, y = m.y;
      e.update(1 / 60);
      const dx = m.x - x, dy = m.y - y;
      assert.ok(Math.abs(dx * Math.sin(m.angle) - dy * Math.cos(m.angle)) < 1e-10, type);
      assert.ok(dx * Math.cos(m.angle) + dy * Math.sin(m.angle) >= -1e-10, type);
      assert.ok(Math.abs(m.vx * Math.sin(m.angle) - m.vy * Math.cos(m.angle)) < 1e-10, type);
      if (def.speed === 0) { assert.equal(dx, 0); assert.equal(dy, 0); }
    }
  }
});

test('wall clipping shortens a forward step without causing sideways sliding', () => {
  const e = new GameEngine(freshSave(), () => 0.5);
  e.start(); e.mobs = [];
  e.addMob('Spider', 1000, 2000);
  e.x = e.width - 700; e.y = 2000;
  const m = e.mobs[0];
  m.x = e.width - m.radius - 0.001;
  m.angle = Math.PI / 4; m.targetAngle = m.angle; m.wander = 100;
  m.vx = 100; m.vy = 100;
  const x = m.x, y = m.y;
  e.update(1 / 60);
  assert.ok(m.x > x);
  assert.ok(m.x <= e.width - m.radius + 1e-10);
  assert.ok(Math.abs((m.x - x) * Math.sin(m.angle) - (m.y - y) * Math.cos(m.angle)) < 1e-10);
});

test('reseeding mobs clears old instances without resetting player progress', () => {
  const e = new GameEngine(freshSave(), () => 0.5);
  e.save.inventory['Rose:2'] = 9;
  const save = structuredClone(e.save);
  const previous = new Set(e.mobs.map(m => m.id));
  e.seedMobs();
  assert.ok(e.mobs.length > 0);
  assert.ok(e.mobs.every(m => !previous.has(m.id) && m.vx === 0 && m.vy === 0));
  assert.deepEqual(e.save, save);
});
