import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync('app/page.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
void test('reference panels have separate themes and responsive layout', () => {
  for (const c of ['#5b9fd5', '#d95858', '#d89d59']) assert.ok(css.includes(c));
  assert.ok(page.includes('game-panel ${panel}-panel'));
  assert.ok(css.includes('max-width: 800px'));
});
void test('craft keeps shift selection and groups into fixed rarity columns', () => {
  assert.ok(page.includes('event.shiftKey'));
  assert.ok(page.includes('fromKey(key).rarity + 1'));
  assert.ok(page.includes("if (p === 'craft') setRarityFilter(-1)"));
});
void test('talent nodes retain real upgrade action and lock future levels', () => {
  assert.ok(page.includes('onClick={() => upgrade(id)}'));
  assert.ok(page.includes('level !== current'));
  assert.ok(page.includes('current >= max'));
  assert.ok(page.includes('aria-pressed={save.biome === biome}'));
});

void test('craft copy omits group counts and shift mode crafts until blocked', () => {
  assert.ok(page.includes('craftUntilBlocked'));
  assert.ok(page.includes('craftAll ? 100 : 1'));
  assert.ok(page.includes('setCraftAll(all)'));
  assert.equal(page.includes('组合成'), false);
  assert.equal(page.includes('} 组`'), false);
});
