export const RARITIES = [
  { name: 'Common', zh: '普通', color: '#7eef6d', mult: 1, chance: 0.64 },
  { name: 'Unusual', zh: '罕见', color: '#ffe65d', mult: 3, chance: 0.32 },
  { name: 'Rare', zh: '稀有', color: '#4e9fff', mult: 9, chance: 0.16 },
  { name: 'Epic', zh: '史诗', color: '#b864ef', mult: 27, chance: 0.08 },
  { name: 'Legendary', zh: '传说', color: '#ed4747', mult: 81, chance: 0.04 },
  { name: 'Mythic', zh: '神话', color: '#61dbdf', mult: 243, chance: 0.02 },
  { name: 'Ultra', zh: '究极', color: '#ed67be', mult: 729, chance: 0.01 },
  { name: 'Super', zh: '超级', color: '#2bffa3', mult: 2187, chance: 0.001 },
  { name: 'Eternal', zh: '永恒', color: '#fff', mult: 6561, chance: 0 },
];
export type PetalDef = {
  name: string;
  zh: string;
  damage: number;
  hp: number;
  reload: number;
  size: number;
  description: string;
  heal?: number;
  count?: number;
  poison?: number;
  passive?: string;
};
export const PETALS: Record<string, PetalDef> = {
  Basic: {
    name: 'Basic',
    zh: '基础',
    damage: 10,
    hp: 10,
    reload: 2.5,
    size: 9,
    description: '一片普通的花瓣。可靠的开始。',
  },
  Rose: {
    name: 'Rose',
    zh: '玫瑰',
    damage: 5,
    hp: 5,
    reload: 5,
    size: 9,
    heal: 7.5,
    description: '受伤时收回花瓣，为花朵恢复生命。',
  },
  Light: {
    name: 'Light',
    zh: '轻',
    damage: 13,
    hp: 5,
    reload: 0.75,
    size: 6,
    description: '轻巧的花瓣，恢复得非常快。',
  },
  Rock: {
    name: 'Rock',
    zh: '岩石',
    damage: 22,
    hp: 30,
    reload: 3,
    size: 12,
    description: '坚硬的岩石。高耐久，重击敌人。',
  },
  Stinger: {
    name: 'Stinger',
    zh: '毒刺',
    damage: 100,
    hp: 1,
    reload: 10,
    size: 9,
    description: '极高的伤害，但也十分脆弱。',
  },
  Leaf: {
    name: 'Leaf',
    zh: '叶子',
    damage: 16,
    hp: 12,
    reload: 1.8,
    size: 10,
    heal: 1,
    description: '缓慢持续恢复花朵的生命。',
  },
  Iris: {
    name: 'Iris',
    zh: '鸢尾',
    damage: 5,
    hp: 5,
    reload: 4,
    size: 10,
    poison: 70 / 3,
    description: '使敌人中毒，伤害会在数秒内持续生效。',
  },
  Wing: {
    name: 'Wing',
    zh: '翅膀',
    damage: 20,
    hp: 10,
    reload: 3,
    size: 11,
    description: '轻轻扇动，在花朵周围灵活环绕。',
  },
  Faster: {
    name: 'Faster',
    zh: '加速',
    damage: 12,
    hp: 5,
    reload: 2.5,
    size: 8,
    passive: 'faster',
    description: '提高所有花瓣的旋转速度。',
  },
  Cactus: {
    name: 'Cactus',
    zh: '仙人掌',
    damage: 7,
    hp: 15,
    reload: 1,
    size: 11,
    passive: 'health',
    description: '装备后提高花朵的最大生命值。',
  },
  Bubble: {
    name: 'Bubble',
    zh: '气泡',
    damage: 0,
    hp: 1,
    reload: 5,
    size: 13,
    passive: 'bubble',
    description: '防御时破裂，将花朵向移动方向弹射。',
  },
  Missile: {
    name: 'Missile',
    zh: '导弹',
    damage: 35,
    hp: 2,
    reload: 2,
    size: 10,
    passive: 'missile',
    description: '进攻时沿径向发射。',
  },
  Peas: {
    name: 'Peas',
    zh: '豌豆',
    damage: 15,
    hp: 5,
    reload: 2,
    size: 5,
    count: 4,
    description: '四颗小豌豆，占用一格花瓣槽。',
  },
  Pollen: {
    name: 'Pollen',
    zh: '花粉',
    damage: 8,
    hp: 1,
    reload: 1,
    size: 5,
    count: 3,
    description: '细小的花粉，组成紧密的花瓣簇。',
  },
  Sand: {
    name: 'Sand',
    zh: '沙子',
    damage: 6,
    hp: 5,
    reload: 1,
    size: 5,
    count: 4,
    description: '多颗砂砾，适合近距离持续攻击。',
  },
  Antennae: {
    name: 'Antennae',
    zh: '触角',
    damage: 0,
    hp: 10,
    reload: 1,
    size: 9,
    passive: 'vision',
    description: '扩大视野，更早发现远处的生物。',
  },
};
export type Equipped = { type: string; rarity: number };
export type Inventory = Record<string, number>;
export const itemKey = (p: Equipped) => `${p.type}:${p.rarity}`;
export const fromKey = (k: string): Equipped => {
  const [type, r] = k.split(':');
  return { type, rarity: Number(r) };
};
const computeStat = (p: Equipped) => {
  const d = PETALS[p.type];
  const m = RARITIES[p.rarity]?.mult ?? 1;
  return {
    ...d,
    damage: d.damage * m,
    hp: p.type === 'Stinger' ? 1 : d.hp * m,
    heal:
      (d.heal ?? 0) *
      [1, 3, 9, 27, 81, 243, 243 * Math.sqrt(3), 729, 729 * Math.sqrt(3)][
        p.rarity
      ],
    poison: (d.poison ?? 0) * m,
    count:
      p.type === 'Light'
        ? [1, 2, 2, 3, 3, 5, 5, 5, 5][p.rarity]
        : p.type === 'Stinger'
          ? p.rarity < 5
            ? 1
            : p.rarity === 5
              ? 3
              : 5
          : d.count,
  };
};
const statCache = new Map<string, ReturnType<typeof computeStat>>();
export const stat = (p: Equipped) => {
  const key = itemKey(p);
  let value = statCache.get(key);
  if (!value) {
    value = Object.freeze(computeStat(p));
    statCache.set(key, value);
  }
  return value;
};
export const earnedTP = (level: number) =>
  Array.from({ length: Math.max(0, level - 1) }, (_, i) => i + 2).reduce(
    (n, l) => n + (l % 10 === 0 ? 10 : l % 10 === 5 ? 2 : 1),
    0,
  );
export const loadoutCosts = [3, 6, 9, 12, 15];
export const slotsForLevel = (_level: number, loadout = 0) =>
  Math.min(10, 5 + loadout);
export const playerHealth = (level: number) =>
  200 * (243 ** 0.01) ** (Math.min(level, 75) - 1);
export const xpForLevel = (level: number) =>
  Math.round(10 * 1.12 ** (level - 1));
export const BIOMES = {
  Garden: {
    zh: '花园',
    bg: '#1ea660',
    dark: '#16884e',
    light: '#48b877',
    types: [
      'Ladybug',
      'Baby Ant',
      'Worker Ant',
      'Bee',
      'Rock',
      'Spider',
      'Soldier Ant',
      'Centipede',
    ],
  },
  Desert: {
    zh: '沙漠',
    bg: '#d4b86b',
    dark: '#bea15a',
    light: '#e6ce88',
    types: ['Rock', 'Beetle', 'Scorpion', 'Soldier Ant', 'Sandstorm'],
  },
  Ocean: {
    zh: '海洋',
    bg: '#459db4',
    dark: '#35899e',
    light: '#6dafc0',
    types: ['Jellyfish', 'Starfish', 'Crab', 'Shell'],
  },
};
export type Biome = keyof typeof BIOMES;
export const MOBS: Record<
  string,
  {
    hp: number;
    damage: number;
    speed: number;
    radius: number;
    xp: number;
    drops: string[];
    aggro: boolean;
    asset?: string;
  }
> = {
  Ladybug: {
    hp: 62.5,
    damage: 10,
    speed: 42,
    radius: 23,
    xp: 1,
    drops: ['Rose', 'Light', 'Basic'],
    aggro: false,
    asset: 'ladybug',
  },
  'Baby Ant': {
    hp: 25,
    damage: 10,
    speed: 40,
    radius: 13,
    xp: 1,
    drops: ['Light', 'Leaf'],
    aggro: false,
    asset: 'baby-ant',
  },
  'Worker Ant': {
    hp: 25,
    damage: 10,
    speed: 55,
    radius: 20,
    xp: 2,
    drops: ['Leaf', 'Peas'],
    aggro: false,
    asset: 'worker-ant',
  },
  'Soldier Ant': {
    hp: 50,
    damage: 10,
    speed: 90,
    radius: 25,
    xp: 3,
    drops: ['Stinger', 'Antennae'],
    aggro: true,
    asset: 'soldier-ant',
  },
  Bee: {
    hp: 37.5,
    damage: 50,
    speed: 75,
    radius: 24,
    xp: 2,
    drops: ['Stinger', 'Pollen', 'Wing'],
    aggro: false,
    asset: 'bee',
  },
  Rock: {
    hp: 100,
    damage: 10,
    speed: 0,
    radius: 35,
    xp: 2,
    drops: ['Rock', 'Sand'],
    aggro: false,
    asset: 'mob-rock',
  },
  Spider: {
    hp: 62.5,
    damage: 15,
    speed: 205,
    radius: 28,
    xp: 3,
    drops: ['Iris', 'Faster'],
    aggro: true,
    asset: 'spider',
  },
  Centipede: {
    hp: 250,
    damage: 10,
    speed: 65,
    radius: 25,
    xp: 5,
    drops: ['Faster', 'Peas', 'Cactus'],
    aggro: true,
    asset: 'centipede',
  },
  Beetle: {
    hp: 75,
    damage: 15,
    speed: 60,
    radius: 29,
    xp: 3,
    drops: ['Cactus', 'Rock'],
    aggro: true,
    asset: 'beetle',
  },
  Scorpion: {
    hp: 100,
    damage: 20,
    speed: 75,
    radius: 33,
    xp: 5,
    drops: ['Iris', 'Stinger'],
    aggro: true,
    asset: 'scorpion',
  },
  Sandstorm: {
    hp: 40,
    damage: 10,
    speed: 55,
    radius: 27,
    xp: 3,
    drops: ['Sand', 'Light'],
    aggro: false,
    asset: 'sandstorm',
  },
  Jellyfish: {
    hp: 50,
    damage: 10,
    speed: 35,
    radius: 29,
    xp: 3,
    drops: ['Bubble', 'Iris'],
    aggro: false,
    asset: 'jellyfish',
  },
  Starfish: {
    hp: 50,
    damage: 10,
    speed: 20,
    radius: 28,
    xp: 3,
    drops: ['Rose', 'Leaf'],
    aggro: false,
    asset: 'starfish',
  },
  Crab: {
    hp: 80,
    damage: 20,
    speed: 55,
    radius: 28,
    xp: 4,
    drops: ['Rock', 'Missile'],
    aggro: true,
    asset: 'crab',
  },
  Shell: {
    hp: 80,
    damage: 10,
    speed: 10,
    radius: 25,
    xp: 3,
    drops: ['Bubble', 'Peas'],
    aggro: false,
    asset: 'shell',
  },
};
export function craft(
  inventory: Inventory,
  item: Equipped,
  random = Math.random,
) {
  const key = itemKey(item);
  if (
    (inventory[key] ?? 0) < 5 ||
    item.rarity >= 8 ||
    (item.type === 'Basic' && item.rarity === 0)
  )
    return { ok: false, success: false, lost: 0 };
  const success = random() < RARITIES[item.rarity].chance;
  const lost = success ? 5 : 1 + Math.min(3, Math.floor(random() * 4));
  inventory[key] -= lost;
  if (success) {
    const next = itemKey({ ...item, rarity: item.rarity + 1 });
    inventory[next] = (inventory[next] ?? 0) + 1;
  }
  return { ok: true, success, lost };
}
export const newLoadout = (): Equipped[] => [
  ...Array.from({ length: 4 }, () => ({ type: 'Basic', rarity: 0 })),
  { type: 'Rose', rarity: 0 },
];
export const assetPath = (type: string) =>
  `/assets/${type.toLowerCase().replaceAll(' ', '-')}.png`;

// 未公开/存在版本冲突的参数集中在这里；不代表官方服务端值。
export const SIMULATION_TUNING = {
  speed: 185,
  attackRadius: 115,
  normalRadius: 70,
  defendRadius: 37,
  contactInterval: 0.25,
  dropChance: 0.8,
  mobHP: [1, 3.75, 13.5, 54, 405, 2430, 29160, 1312200, 3936600],
  xpBase: 10,
  xpGrowth: 1.12,
};
