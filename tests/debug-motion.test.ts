import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, freshSave, validSave } from '../lib/game-engine.ts';
import { PETALS } from '../lib/game-data.ts';

void test('debug stocks every Super to 500, preserves inventory and survives save validation', () => {
  const e = new GameEngine(freshSave());
  e.save.inventory['Basic:0'] = 12;
  e.save.inventory['Rose:7'] = 600;
  e.setDebug(true);
  for (const type of Object.keys(PETALS))
    assert.equal(e.save.inventory[`${type}:7`], type === 'Rose' ? 600 : 500);
  e.setDebug(true);
  assert.equal(e.save.inventory['Basic:7'], 500);
  assert.equal(e.save.inventory['Basic:0'], 12);
  assert.equal(validSave(JSON.parse(JSON.stringify(e.save))).debug, true);
  e.setDebug(false);
  assert.equal(e.save.debug, false);
  assert.equal(e.save.inventory['Basic:7'], 500);
});
function scene() {
  const e = new GameEngine(freshSave(), () => 0.5);
  e.start();
  e.mobs = [];
  e.addMob('Baby Ant', e.x + 400, e.y, 0);
  const m = e.mobs[0];
  m.angle = Math.PI - 0.05;
  m.targetAngle = -Math.PI + 0.05;
  m.wander = 100;
  return { e, m };
}
void test('mob takes shortest turn across PI and accelerates without snapping', () => {
  const { e, m } = scene();
  const old = m.angle;
  e.update(1 / 60);
  const delta = Math.atan2(Math.sin(m.angle - old), Math.cos(m.angle - old));
  assert.ok(delta > 0 && delta < 0.02);
  assert.ok(Math.hypot(m.vx, m.vy) > 0);
  assert.ok(Math.hypot(m.vx, m.vy) < 5);
});
void test('movement remains close across 30 and 120 Hz', () => {
  const a = scene(),
    b = scene();
  for (let i = 0; i < 60; i++) a.e.update(1 / 30);
  for (let i = 0; i < 240; i++) b.e.update(1 / 120);
  assert.ok(Math.hypot(a.m.x - b.m.x, a.m.y - b.m.y) < 1);
  assert.ok(Math.abs(a.m.angle - b.m.angle) < 0.001);
});
void test('stationary rocks remain stationary', () => {
  const { e } = scene();
  e.mobs = [];
  e.addMob('Rock', e.x + 400, e.y);
  const m = e.mobs[0],
    x = m.x,
    y = m.y;
  for (let i = 0; i < 60; i++) e.update(1 / 60);
  assert.equal(m.x, x);
  assert.equal(m.y, y);
});
