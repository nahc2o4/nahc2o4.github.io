import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameEngine, freshSave } from '../lib/game-engine.ts';
void test('reference UI uses one 2048x1136 coordinate surface and measured panels', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8');
  for (const size of [
    'width: 2048px',
    'height: 1136px',
    'width: 432px',
    'height: 644px',
    'width: 655px',
    'height: 750px',
    'width: 698px',
    'height: 698px',
  ])
    assert.ok(css.includes(size), size);
});
void test('serial killer progress reflects actual timed kills and resets on a gap', () => {
  const e = new GameEngine(freshSave());
  e.start();
  e.mobs = [];
  const kill = () => {
    e.addMob('Baby Ant', 100, 100);
    e.kill(e.mobs[e.mobs.length - 1]);
  };
  kill();
  e.time += 1;
  kill();
  assert.equal(e.chainKills, 2);
  e.time += 3;
  kill();
  assert.equal(e.chainKills, 1);
  for (let i = 0; i < 499; i++) {
    e.time += 0.1;
    kill();
  }
  assert.equal(e.chainComplete, true);
  e.start();
  assert.equal(e.chainKills, 0);
  assert.equal(e.chainComplete, false);
});
