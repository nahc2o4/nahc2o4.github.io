import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, freshSave, validSave } from '../lib/game-engine.ts';
import {
  craft,
  stat,
  itemKey,
  RARITIES,
  slotsForLevel,
  earnedTP,
  playerHealth,
} from '../lib/game-data.ts';
const engine = () => {
  const e = new GameEngine(freshSave(), () => 0.4);
  e.start();
  e.mobs = [];
  return e;
};
const step = (e: GameEngine, s: number) => {
  for (let i = 0; i < s * 60; i++) e.update(1 / 60);
};
test('initial 200 HP, 4 Basic + Rose, fifth reserve Basic', () => {
  const e = engine();
  assert.equal(e.maxHp, 200);
  assert.deepEqual(
    e.save.loadout.map((p) => p?.type),
    ['Basic', 'Basic', 'Basic', 'Basic', 'Rose'],
  );
  assert.equal(e.save.reserve[4]?.type, 'Basic');
});
test('known Wiki petal statistics and healing exception', () => {
  assert.deepEqual(
    [
      stat({ type: 'Basic', rarity: 0 }).damage,
      stat({ type: 'Basic', rarity: 0 }).hp,
      stat({ type: 'Basic', rarity: 0 }).reload,
    ],
    [10, 10, 2.5],
  );
  assert.equal(stat({ type: 'Stinger', rarity: 5 }).hp, 1);
  assert.equal(stat({ type: 'Stinger', rarity: 5 }).count, 3);
  assert.equal(stat({ type: 'Light', rarity: 2 }).count, 2);
  assert.equal(stat({ type: 'Leaf', rarity: 1 }).damage, 48);
  assert.equal(stat({ type: 'Rose', rarity: 0 }).heal, 7.5);
  assert.equal(stat({ type: 'Rose', rarity: 7 }).heal, 7.5 * 729);
});
test('all eight crafting probabilities', () => {
  assert.deepEqual(
    RARITIES.slice(0, 8).map((r) => r.chance),
    [0.64, 0.32, 0.16, 0.08, 0.04, 0.02, 0.01, 0.001],
  );
});
test('craft success consumes 5, creates higher-rarity one', () => {
  const i = { 'Rose:0': 8 };
  const r = craft(i, { type: 'Rose', rarity: 0 }, () => 0.1);
  assert.equal(r.success, true);
  assert.deepEqual(i, { 'Rose:0': 3, 'Rose:1': 1 });
});
test('craft failure loses 1–4, returns remainder', () => {
  for (let n = 1; n <= 4; n++) {
    const i = { 'Rose:0': 5 };
    let called = false;
    const r = craft(i, { type: 'Rose', rarity: 0 }, () => {
      if (!called) {
        called = true;
        return 0.99;
      }
      return (n - 0.5) / 4;
    });
    assert.equal(r.success, false);
    assert.equal(r.lost, n);
    assert.equal(i['Rose:0'], 5 - n);
  }
});
test('insufficient petals, Eternal and starter Basic never consume stock', () => {
  for (const [type, rarity, n] of [
    ['Rose', 0, 4],
    ['Rose', 8, 10],
    ['Basic', 0, 10],
  ] as const) {
    const i = { [`${type}:${rarity}`]: n };
    assert.equal(craft(i, { type, rarity }).ok, false);
    assert.equal(i[`${type}:${rarity}`], n);
  }
});
test('locked slots cannot expand either array', () => {
  const e = engine();
  e.swap(9);
  assert.equal(e.save.loadout.length, 5);
  assert.equal(e.save.reserve.length, 5);
  assert.equal(e.equip(9, { type: 'Basic', rarity: 0 }), false);
});
test('equipping conserves item quantity and applies loading time', () => {
  const e = engine();
  e.save.inventory['Rock:1'] = 1;
  assert.equal(e.equip(0, { type: 'Rock', rarity: 1 }), true);
  assert.equal(e.save.inventory['Rock:1'], 0);
  assert.equal(e.save.inventory['Basic:0'], 1);
  assert.equal(e.petals[0]?.cd, 3);
});
test('double-swap cannot bypass cooldown', () => {
  const e = engine();
  e.petals[4]!.cd = 4;
  e.swap(4);
  e.swap(4);
  assert.equal(e.petals[4]?.cd, 5);
});
test('Cactus equip and removal preserve health fraction', () => {
  const e = engine();
  e.hp = 100;
  e.save.inventory['Cactus:0'] = 1;
  e.equip(0, { type: 'Cactus', rarity: 0 });
  assert.equal(e.maxHp, 230);
  assert.equal(e.hp, 115);
  e.unequip(0);
  assert.equal(e.maxHp, 200);
  assert.equal(e.hp, 100);
});
test('restart clears previous session objects and refills HP', () => {
  const e = engine();
  e.drops.push({ id: 1, type: 'Rock', rarity: 4, x: 2, y: 3, life: 40 });
  e.projectiles.push({
    x: 1,
    y: 1,
    vx: 1,
    vy: 1,
    damage: 1,
    life: 1,
    rarity: 0,
  });
  e.hp = 5;
  e.start();
  assert.equal(e.drops.length, 0);
  assert.equal(e.projectiles.length, 0);
  assert.equal(e.hp, e.maxHp);
});
test('movement speed normalizes diagonals, world bounds enforced', () => {
  const a = engine(),
    b = engine();
  const ax = a.x,
    ay = a.y,
    bx = b.x,
    by = b.y;
  a.input = { x: 1, y: 0 };
  b.input = { x: 1, y: 1 };
  step(a, 1);
  step(b, 1);
  assert.ok(
    Math.abs(Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - bx, b.y - by)) <
      0.001,
  );
  a.x = 1;
  a.y = 1;
  a.input = { x: -1, y: -1 };
  step(a, 1);
  assert.ok(a.x >= 35 && a.y >= 35);
});
test('attack expands and defense contracts orbit', () => {
  const e = engine();
  e.mode = 'attack';
  step(e, 1);
  const attack = Math.hypot(e.petals[0]!.x - e.x, e.petals[0]!.y - e.y);
  e.mode = 'defend';
  step(e, 1);
  const defend = Math.hypot(e.petals[0]!.x - e.x, e.petals[0]!.y - e.y);
  assert.ok(attack > 100);
  assert.ok(defend < 45);
});
test('paused simulation does not move or damage player', () => {
  const e = engine();
  e.paused = true;
  e.input = { x: 1, y: 0 };
  const x = e.x;
  step(e, 2);
  assert.equal(e.x, x);
  assert.equal(e.hp, 200);
});
test('Rose heals after activation while attacking', () => {
  const e = engine();
  e.hp = 100;
  e.mode = 'attack';
  step(e, 1);
  assert.equal(e.hp, 100);
  step(e, 0.6);
  assert.equal(e.hp, 107.5);
  assert.ok(e.petals[4]!.cd > 0);
});
test('Peas fire four independent projectiles and reload', () => {
  const e = engine();
  e.save.loadout[0] = { type: 'Peas', rarity: 1 };
  e.rebuildPetals();
  e.mode = 'attack';
  step(e, 0.6);
  assert.equal(e.projectiles.length, 4);
  assert.ok(e.projectiles.every((p) => p.type === 'Peas'));
  assert.ok(e.petals[0]!.cd > 0);
});
test('multi-petal units have independent HP and cooldown', () => {
  const e = engine();
  e.save.loadout[0] = { type: 'Stinger', rarity: 5 };
  e.rebuildPetals();
  const p = e.petals[0]!;
  assert.equal(p.units?.length, 3);
  p.units![0].cd = 10;
  p.units![0].hp = 0;
  step(e, 0.1);
  assert.equal(p.units![1].cd, 0);
  assert.equal(p.units![1].hp, 1);
  assert.ok(p.units![0].cd < 10);
});
test('physical hits respect armor; lethal damage grants XP and loot', () => {
  const e = engine();
  e.addMob('Ladybug', e.x + 100, e.y, 0);
  const m = e.mobs[0];
  const hp = m.hp;
  e.damageMob(m, 10);
  assert.equal(m.hp, hp - 9.2);
  e.damageMob(m, 1000);
  assert.equal(e.save.kills, 1);
  assert.equal(e.save.xp, 1);
  assert.ok(e.save.discovered.includes('Ladybug'));
  assert.equal(e.drops.length, 1);
});
test('pickups update inventory exactly once', () => {
  const e = engine();
  const drop = { id: 1, type: 'Rock', rarity: 1, x: e.x, y: e.y, life: 90 };
  e.drops.push(drop);
  step(e, 0.1);
  assert.equal(e.save.inventory[itemKey(drop)], 1);
  assert.equal(e.drops.length, 0);
  step(e, 0.1);
  assert.equal(e.save.inventory[itemKey(drop)], 1);
});
test('body contact deals mutual damage and death preserves equipment', () => {
  const e = engine();
  e.invuln = 0;
  e.hp = 1;
  e.addMob('Rock', e.x, e.y, 0);
  step(e, 0.1);
  assert.equal(e.state, 'dead');
  assert.equal(e.hp, 0);
  assert.equal(e.save.loadout[0]?.type, 'Basic');
  assert.ok(e.mobs[0].hp < e.mobs[0].maxHp);
});
test('level-up awards talent points; slots use talent instead of level', () => {
  const e = engine();
  e.gainXP(10);
  assert.equal(e.save.level, 2);
  assert.equal(e.save.xp, 0);
  assert.equal(earnedTP(2), 1);
  assert.equal(earnedTP(5), 5);
  assert.equal(slotsForLevel(60), 5);
  assert.equal(slotsForLevel(60, 3), 8);
  assert.ok(playerHealth(75) > 10000);
});
test('valid save roundtrip preserves talents and inventory', () => {
  const s = freshSave();
  s.talents = { loadout: 2, health: 3, rotation: 2 };
  s.inventory = { 'Rock:3': 10 };
  const result = validSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(result.talents, s.talents);
  assert.deepEqual(result.inventory, s.inventory);
});
test('malformed save is sanitized', () => {
  assert.equal(validSave(null).level, 1);
  const s = validSave({
    level: -5,
    name: 5,
    inventory: { 'BAD:0': 5, 'Rose:0': -1, 'Rose:1': 3 },
    loadout: [{ type: 'BAD', rarity: 0 }],
  });
  assert.equal(s.level, 1);
  assert.equal(s.name, 'Guest');
  assert.deepEqual(s.inventory, { 'Rose:1': 3 });
  assert.equal(s.loadout[0], null);
});
test('biome transition resets position, projectiles and drops', () => {
  const e = engine();
  e.x = 2000;
  e.setBiome('Ocean');
  assert.equal(e.save.biome, 'Ocean');
  assert.equal(e.x, 540);
  assert.ok(
    e.mobs.every((m) =>
      ['Jellyfish', 'Starfish', 'Crab', 'Shell'].includes(m.type),
    ),
  );
});

test('talent reset refunds both extra loadouts without losing items or progress', () => {
  const save = freshSave();
  save.level = 80;
  save.xp = 37;
  save.kills = 12;
  save.talents = { loadout: 2, health: 3, rotation: 4 };
  save.inventory['Cactus:2'] = 7;
  const cactus = { type: 'Cactus', rarity: 2 } as const;
  const rose = { type: 'Rose', rarity: 1 } as const;
  save.loadout.push(cactus, rose);
  save.reserve.push(cactus, null);
  const e = new GameEngine(save, () => 0.4);
  const original = structuredClone(e.save);
  const count = () => Object.values(e.save.inventory).reduce((a, b) => a + b, 0)
    + [...e.save.loadout, ...e.save.reserve].filter(Boolean).length;
  const total = count();
  e.hp = e.maxHp * 0.35;
  const retained = e.petals[0]!;
  retained.cd = 1.75;
  retained.hp = 1;
  assert.equal(e.resetTalents(), true);
  assert.deepEqual(e.save.talents, { loadout: 0, health: 0, rotation: 0 });
  assert.equal(e.save.loadout.length, 5);
  assert.equal(e.save.reserve.length, 5);
  assert.equal(e.petals.length, 5);
  assert.equal(e.save.inventory[itemKey(cactus)], (original.inventory[itemKey(cactus)] ?? 0) + 2);
  assert.equal(e.save.inventory[itemKey(rose)], 1);
  assert.equal(count(), total);
  assert.equal(e.maxHp, playerHealth(80));
  assert.ok(Math.abs(e.hp / e.maxHp - 0.35) < 1e-12);
  assert.equal(e.petals[0], retained);
  assert.equal(retained.cd, 1.75);
  assert.equal(retained.hp, 1);
  for (const key of ['level', 'xp', 'kills', 'biome'] as const)
    assert.equal(e.save[key], original[key]);
  const resetSave = structuredClone(e.save);
  assert.equal(e.resetTalents(), false);
  assert.deepEqual(e.save, resetSave);
  assert.deepEqual(validSave(e.save), { ...resetSave, debug: false });
});

test('talent reset preserves death and permits unlocking the sixth slot again', () => {
  const save = freshSave();
  save.talents = { loadout: 1, health: 1, rotation: 0 };
  save.loadout.push(null);
  save.reserve.push(null);
  const e = new GameEngine(save, () => 0.4);
  e.hp = 0;
  e.state = 'dead';
  assert.equal(e.resetTalents(), true);
  assert.equal(e.hp, 0);
  assert.equal(e.state, 'dead');
  e.save.talents.loadout++;
  e.save.loadout.push(null);
  e.save.reserve.push(null);
  e.save.inventory[itemKey({ type: 'Rose', rarity: 1 })] = 1;
  assert.equal(e.equip(5, { type: 'Rose', rarity: 1 }), true);
  assert.equal(e.save.loadout.length, 6);
  assert.equal(e.equip(6, { type: 'Rose', rarity: 1 }), false);
});

test('talent reset without upgrades leaves a fresh save untouched', () => {
  const e = engine();
  const before = structuredClone(e.save);
  assert.equal(e.resetTalents(), false);
  assert.deepEqual(e.save, before);
});
