import {
  PETALS,
  RARITIES,
  BIOMES,
  MOBS,
  itemKey,
  stat,
  playerHealth,
  xpForLevel,
  newLoadout,
  SIMULATION_TUNING,
  slotsForLevel,
} from './game-data.ts';
import type { Equipped, Inventory, Biome } from './game-data.ts';
export type Mob = {
  id: number;
  type: string;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  vx: number;
  vy: number;
  rarity: number;
  hp: number;
  maxHp: number;
  radius: number;
  aggro: boolean;
  hit: number;
  poison: number;
  poisonTime: number;
  cooldown: number;
  wander: number;
};
export type Drop = Equipped & {
  id: number;
  x: number;
  y: number;
  life: number;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
};
export type Petal = Equipped & {
  hp: number;
  cd: number;
  x: number;
  y: number;
  contact: Record<number, number>;
  healTimer?: number;
  activation?: number;
  units?: { hp: number; cd: number; contact: Record<number, number> }[];
};
export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  rarity: number;
  type?: string;
};
export type Save = {
  debug?: boolean;
  version: 1;
  name: string;
  level: number;
  xp: number;
  inventory: Inventory;
  loadout: (Equipped | null)[];
  reserve: (Equipped | null)[];
  kills: number;
  discovered: string[];
  biome: Biome;
  talents: { loadout: number; health: number; rotation: number };
};
export function freshSave(): Save {
  return {
    version: 1,
    name: 'Guest',
    level: 1,
    xp: 0,
    inventory: {},
    loadout: newLoadout(),
    reserve: [null, null, null, null, { type: 'Basic', rarity: 0 }],
    kills: 0,
    discovered: [],
    biome: 'Garden',
    talents: { loadout: 0, health: 0, rotation: 0 },
  };
}
export function validSave(input: unknown): Save {
  if (!input || typeof input !== 'object') return freshSave();
  const a = input as Save;
  const valid = (p: Equipped | null) =>
    p &&
    PETALS[p.type] &&
    Number.isInteger(p.rarity) &&
    p.rarity >= 0 &&
    p.rarity <= 8
      ? { type: p.type, rarity: p.rarity }
      : null;
  const base = freshSave();
  return {
    ...base,
    debug: a.debug === true,
    name: typeof a.name === 'string' ? a.name.slice(0, 20) : 'Guest',
    level: Math.min(200, Math.max(1, Math.floor(Number(a.level) || 1))),
    xp: Math.max(0, Number(a.xp) || 0),
    kills: Math.max(0, Number(a.kills) || 0),
    inventory: Object.fromEntries(
      Object.entries(a.inventory ?? {}).filter(([key, n]) => {
        const [type, r] = key.split(':');
        return (
          PETALS[type] &&
          Number(r) >= 0 &&
          Number(r) <= 8 &&
          Number.isInteger(n) &&
          n >= 0 &&
          n < 1e8
        );
      }),
    ),
    loadout: Array.isArray(a.loadout)
      ? a.loadout.slice(0, 10).map(valid)
      : base.loadout,
    reserve: Array.isArray(a.reserve)
      ? a.reserve.slice(0, 10).map(valid)
      : base.reserve,
    discovered: Array.isArray(a.discovered)
      ? a.discovered.filter((t) => !!MOBS[t])
      : [],
    talents: {
      loadout: Math.max(
        0,
        Math.min(5, Math.floor(Number(a.talents?.loadout) || 0)),
      ),
      health: Math.max(
        0,
        Math.min(10, Math.floor(Number(a.talents?.health) || 0)),
      ),
      rotation: Math.max(
        0,
        Math.min(10, Math.floor(Number(a.talents?.rotation) || 0)),
      ),
    },
    biome: a.biome in BIOMES ? a.biome : 'Garden',
  };
}
export class GameEngine {
  save: Save;
  x = 540;
  y = 700;
  hp = 100;
  maxHp = 100;
  radius = 20;
  angle = 0;
  time = 0;
  state: 'lobby' | 'playing' | 'dead' = 'lobby';
  mode: 'normal' | 'attack' | 'defend' = 'normal';
  mobs: Mob[] = [];
  drops: Drop[] = [];
  particles: Particle[] = [];
  petals: (Petal | null)[] = [];
  projectiles: Projectile[] = [];
  width = 7200;
  height = 5400;
  input = { x: 0, y: 0 };
  id = 1;
  spawnTimer = 0;
  invuln = 0;
  onEvent: (event: string) => void = () => {};
  rng: () => number;
  hitFlash = 0;
  distance = 0;
  sessionKills = 0;
  chainKills = 0;
  lastChainKill = -Infinity;
  chainComplete = false;
  sessionXP = 0;
  lastHurt = 0;
  paused = false;
  constructor(save = freshSave(), rng = Math.random) {
    this.save = save;
    this.rng = rng;
    this.rebuildPetals();
    this.hp = this.maxHp;
    this.seedMobs();
  }
  rebuildPetals() {
    const old = this.petals;
    this.petals = this.save.loadout.map((p, i) =>
      p
        ? old[i] && itemKey(old[i]!) === itemKey(p)
          ? old[i]
          : {
              ...p,
              hp: stat(p).hp,
              cd: 0,
              x: this.x,
              y: this.y,
              contact: {},
              units: ['Light', 'Stinger'].includes(p.type)
                ? Array.from({ length: stat(p).count ?? 1 }, () => ({
                    hp:
                      p.type === 'Stinger'
                        ? 1
                        : stat(p).hp / (stat(p).count ?? 1),
                    cd: 0,
                    contact: {},
                  }))
                : undefined,
            }
        : null,
    );
    this.maxHp =
      playerHealth(this.save.level) * 1.3 ** this.save.talents.health +
      this.save.loadout.reduce(
        (s, p) =>
          s + (p && p.type === 'Cactus' ? 30 * RARITIES[p.rarity].mult : 0),
        0,
      );
    this.hp = Math.min(this.hp, this.maxHp);
  }
  start() {
    this.state = 'playing';
    this.hp = this.maxHp;
    this.x = 540;
    this.y = 700;
    this.invuln = 3;
    this.sessionKills = 0;
    this.chainKills = 0;
    this.lastChainKill = -Infinity;
    this.chainComplete = false;
    this.sessionXP = 0;
    this.drops = [];
    this.projectiles = [];
    this.particles = [];
    this.lastHurt = 0;
    this.hitFlash = 0;
    this.spawnTimer = 0;
    this.input = { x: 0, y: 0 };
    this.paused = false;
    this.seedMobs();
    this.rebuildPetals();
    for (const p of this.petals)
      if (p) {
        p.cd = 0;
        p.hp = stat(p).hp;
        p.healTimer = 0;
        p.activation = 0;
        p.units?.forEach((u) => {
          u.cd = 0;
          u.hp = p.type === 'Stinger' ? 1 : stat(p).hp / (stat(p).count ?? 1);
          u.contact = {};
        });
      }
  }
  setBiome(b: Biome) {
    this.save.biome = b;
    this.x = 540;
    this.y = 700;
    this.projectiles = [];
    this.drops = [];
    this.seedMobs();
    this.invuln = 3;
  }
  setDebug(enabled: boolean) {
    this.save.debug = enabled;
    if (enabled) this.refillSuperPetals();
  }
  refillSuperPetals() {
    for (const type of Object.keys(PETALS)) {
      const key = itemKey({ type, rarity: 7 });
      this.save.inventory[key] = Math.max(500, this.save.inventory[key] ?? 0);
    }
  }
  addMob(type: string, x: number, y: number, rarity = 0) {
    const d = MOBS[type],
      mult = SIMULATION_TUNING.mobHP[rarity];
    const angle = this.rng() * Math.PI * 2;
    this.mobs.push({
      id: this.id++,
      type,
      x,
      y,
      angle,
      targetAngle: angle,
      vx: 0,
      vy: 0,
      rarity,
      hp: d.hp * mult,
      maxHp: d.hp * mult,
      radius: d.radius * (1 + rarity * 0.28),
      aggro: false,
      hit: 0,
      poison: 0,
      poisonTime: 0,
      cooldown: 0,
      wander: this.rng() * 4,
    });
  }
  seedMobs() {
    this.mobs = [];
    const types = BIOMES[this.save.biome].types;
    for (let i = 0; i < 170; i++) {
      const x = 180 + this.rng() * (this.width - 360),
        y = 160 + this.rng() * (this.height - 320);
      const rarity = Math.min(
        6,
        Math.max(0, Math.floor(x / 1200) + (this.rng() > 0.8 ? 1 : 0)),
      );
      if (Math.hypot(x - this.x, y - this.y) > 200)
        this.addMob(types[Math.floor(this.rng() * types.length)], x, y, rarity);
    }
    this.addMob(types[0], this.x + 200, this.y - 20);
    this.addMob(types[1], this.x - 170, this.y + 60);
    this.addMob(types[0], this.x + 290, this.y + 160);
  }
  resetTalents() {
    if (!Object.values(this.save.talents).some((level) => level > 0))
      return false;
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    const slots = slotsForLevel(this.save.level, 0);
    for (const target of [this.save.loadout, this.save.reserve]) {
      for (const item of target.slice(slots)) {
        if (!item) continue;
        const key = itemKey(item);
        this.save.inventory[key] = (this.save.inventory[key] ?? 0) + 1;
      }
      target.length = slots;
    }
    this.save.talents = { loadout: 0, health: 0, rotation: 0 };
    this.rebuildPetals();
    this.hp = this.maxHp * ratio;
    return true;
  }
  equip(slot: number, item: Equipped, reserve = false) {
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= slotsForLevel(this.save.level, this.save.talents.loadout) ||
      !PETALS[item.type] ||
      !RARITIES[item.rarity]
    )
      return false;
    const ratio = this.hp / this.maxHp;
    const key = itemKey(item);
    if (!(this.save.inventory[key] > 0)) return false;
    const target = reserve ? this.save.reserve : this.save.loadout;
    const old = target[slot];
    if (old)
      this.save.inventory[itemKey(old)] =
        (this.save.inventory[itemKey(old)] ?? 0) + 1;
    this.save.inventory[key]--;
    target[slot] = { ...item };
    this.rebuildPetals();
    this.hp = this.maxHp * ratio;
    if (!reserve && this.petals[slot])
      this.petals[slot]!.cd = Math.max(2.5, stat(item).reload);
    return true;
  }
  unequip(slot: number, reserve = false) {
    const ratio = this.hp / this.maxHp;
    const target = reserve ? this.save.reserve : this.save.loadout;
    const p = target[slot];
    if (!p) return;
    this.save.inventory[itemKey(p)] =
      (this.save.inventory[itemKey(p)] ?? 0) + 1;
    target[slot] = null;
    this.rebuildPetals();
    this.hp = this.maxHp * ratio;
  }
  swap(slot: number) {
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= slotsForLevel(this.save.level, this.save.talents.loadout)
    )
      return;
    const ratio = this.hp / this.maxHp;
    const a = this.save.loadout[slot] ?? null;
    this.save.loadout[slot] = this.save.reserve[slot] ?? null;
    this.save.reserve[slot] = a;
    this.rebuildPetals();
    this.hp = this.maxHp * ratio;
    const p = this.petals[slot];
    if (p) p.cd = Math.max(2.5, stat(p).reload);
  }
  gainXP(xp: number) {
    this.save.xp += xp;
    this.sessionXP += xp;
    let levels = 0;
    while (
      this.save.xp >= xpForLevel(this.save.level) &&
      this.save.level < 200
    ) {
      this.save.xp -= xpForLevel(this.save.level);
      this.save.level++;
      levels++;
    }
    if (levels) {
      this.rebuildPetals();
      this.hp = this.maxHp;
      this.onEvent(`等级提升！Level ${this.save.level}`);
      this.burst(this.x, this.y, '#fff46a', 30);
    }
  }
  burst(x: number, y: number, color: string, n = 8) {
    n = Math.min(n, Math.max(0, 256 - this.particles.length));
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2,
        s = 30 + this.rng() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.3 + this.rng() * 0.4,
        max: 0.7,
        color,
        size: 2 + this.rng() * 4,
      });
    }
  }
  float(x: number, y: number, text: string, color = '#fff') {
    if (this.particles.length >= 256) return;
    this.particles.push({
      x,
      y,
      vx: (this.rng() - 0.5) * 20,
      vy: -35,
      life: 0.8,
      max: 0.8,
      color,
      size: 16,
      text,
    });
  }
  damageMob(m: Mob, damage: number, poison = 0) {
    if (m.hp <= 0) return;
    damage = Math.max(0, damage - 0.8 * 3 ** m.rarity);
    m.hp -= damage;
    m.hit = 0.12;
    m.aggro = true;
    this.float(m.x, m.y - m.radius, `${Math.ceil(damage)}`);
    if (poison) {
      m.poison = Math.max(m.poison, poison);
      m.poisonTime = 3;
    }
    if (m.hp <= 0) this.kill(m);
  }
  kill(m: Mob) {
    this.save.kills++;
    this.sessionKills++;
    if (!this.chainComplete) {
      this.chainKills =
        this.time - this.lastChainKill <= 2 ? this.chainKills + 1 : 1;
      this.lastChainKill = this.time;
      this.chainComplete = this.chainKills >= 500;
    }
    if (!this.save.discovered.includes(m.type))
      this.save.discovered.push(m.type);
    this.gainXP(MOBS[m.type].xp * 5 ** m.rarity);
    this.burst(m.x, m.y, RARITIES[m.rarity].color, 15);
    const options = MOBS[m.type].drops;
    const type = options[Math.floor(this.rng() * options.length)];
    if (this.rng() < 0.8) {
      const rarity = Math.max(0, m.rarity - (this.rng() < 0.65 ? 1 : 0));
      this.drops.push({
        id: this.id++,
        x: m.x,
        y: m.y,
        type,
        rarity,
        life: 90,
      });
    }
    this.onEvent('save');
  }
  update(dt: number) {
    dt = Math.min(dt, 0.035);
    this.time += dt;
    this.angle +=
      (2.5 +
        this.save.talents.rotation * 0.25 +
        this.petals.reduce(
          (n, p) => n + (p?.type === 'Faster' ? 0.5 + p.rarity * 0.2 : 0),
          0,
        )) *
      dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.state !== 'playing' || this.paused) {
      this.orbit(dt);
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.lastHurt += dt;
    const len = Math.hypot(this.input.x, this.input.y);
    const speed = 185;
    const dx = len > 1 ? this.input.x / len : this.input.x,
      dy = len > 1 ? this.input.y / len : this.input.y;
    this.x = Math.max(35, Math.min(this.width - 35, this.x + dx * speed * dt));
    this.y = Math.max(35, Math.min(this.height - 35, this.y + dy * speed * dt));
    this.distance += Math.hypot(dx, dy) * speed * dt;
    if (this.lastHurt > 8)
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.01 * dt);
    this.orbit(dt);
    for (const p of this.petals) {
      if (!p) continue;
      const d = stat(p);
      if (p.units)
        for (const u of p.units) {
          if (u.cd > 0) {
            u.cd -= dt;
            if (u.cd <= 0) {
              u.hp = p.type === 'Stinger' ? 1 : d.hp / (d.count ?? 1);
              u.contact = {};
            }
          }
        }
      if (p.cd > 0) {
        p.cd -= dt;
        if (p.cd <= 0) {
          p.hp = d.hp;
          p.contact = {};
        }
        continue;
      }
      if (p.type === 'Rose') {
        p.healTimer = this.hp < this.maxHp ? (p.healTimer ?? 0) + dt : 0;
      }
      if (
        p.type === 'Rose' &&
        this.hp < this.maxHp &&
        (p.healTimer ?? 0) >= 1.5
      ) {
        this.hp = Math.min(this.maxHp, this.hp + d.heal);
        this.float(this.x, this.y - 35, `+${Math.round(d.heal)}`, '#a6ff98');
        p.cd = 3.5;
        p.healTimer = 0;
      }
      if (p.type === 'Leaf')
        this.hp = Math.min(this.maxHp, this.hp + d.heal * dt);
      if (p.type === 'Bubble' && this.mode === 'defend' && len > 0.1) {
        this.x = Math.max(35, Math.min(this.width - 35, this.x + dx * 150));
        this.y = Math.max(35, Math.min(this.height - 35, this.y + dy * 150));
        p.cd = d.reload;
        this.burst(p.x, p.y, '#d0f7ff', 12);
      }
      if (p.type === 'Peas' && this.mode !== 'normal') {
        p.activation = (p.activation ?? 0) + dt;
        if (p.activation >= 0.5) {
          const start = this.rng() * Math.PI * 2;
          for (let n = 0; n < 4; n++) {
            const a = start + (n * Math.PI) / 2;
            this.projectiles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * 420,
              vy: Math.sin(a) * 420,
              life: 1.6,
              damage: d.damage,
              rarity: p.rarity,
              type: 'Peas',
            });
          }
          p.cd = 1.5;
          p.activation = 0;
        }
      }
      if (p.type === 'Missile' && this.mode === 'attack') {
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        this.projectiles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 500,
          vy: Math.sin(a) * 500,
          life: 1.5,
          damage: d.damage,
          rarity: p.rarity,
        });
        p.cd = d.reload;
      }
    }
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const distance = Math.hypot(m.x - this.x, m.y - this.y);
      if (distance > 1800) continue;
      const d = MOBS[m.type];
      m.hit = Math.max(0, m.hit - dt);
      m.cooldown -= dt;
      if (m.poisonTime > 0) {
        m.poisonTime -= dt;
        m.hp -= m.poison * dt;
        if (m.hp <= 0) {
          this.kill(m);
          continue;
        }
      }
      if (d.aggro && distance < 290) m.aggro = true;
      if (distance > 650) m.aggro = false;
      m.wander -= dt;
      if (m.wander < 0) {
        m.targetAngle += (this.rng() - 0.5) * 2;
        m.wander = 1 + this.rng() * 3;
      }
      if ((m.type === 'Ladybug' || m.type === 'Bee') && m.rarity < 2)
        m.aggro = false;
      if (m.type === 'Baby Ant') m.aggro = false;
      if (m.aggro) m.targetAngle = Math.atan2(this.y - m.y, this.x - m.x);
      // Anticipate edges rather than repeatedly walking into a clamped wall.
      const margin = m.radius + 65;
      if (
        m.x < margin ||
        m.x > this.width - margin ||
        m.y < margin ||
        m.y > this.height - margin
      ) {
        m.targetAngle = Math.atan2(this.height / 2 - m.y, this.width / 2 - m.x);
      }
      const turn = Math.atan2(
        Math.sin(m.targetAngle - m.angle),
        Math.cos(m.targetAngle - m.angle),
      );
      m.angle += turn * -Math.expm1(-5 * dt);
      m.angle = Math.atan2(Math.sin(m.angle), Math.cos(m.angle));
      const v = d.speed * (m.aggro ? 1 : 0.35);
      const acceleration = -Math.expm1(-7 * dt);
      m.vx += (Math.cos(m.angle) * v - m.vx) * acceleration;
      m.vy += (Math.sin(m.angle) * v - m.vy) * acceleration;
      m.x = Math.max(
        m.radius,
        Math.min(this.width - m.radius, m.x + m.vx * dt),
      );
      m.y = Math.max(
        m.radius,
        Math.min(this.height - m.radius, m.y + m.vy * dt),
      );
      if (distance < m.radius + this.radius) {
        const a = Math.atan2(this.y - m.y, this.x - m.x);
        const overlap = m.radius + this.radius - distance;
        this.x += Math.cos(a) * overlap * 0.55;
        this.y += Math.sin(a) * overlap * 0.55;
        if (this.invuln === 0 && m.cooldown <= 0) {
          const damage = d.damage * 3 ** m.rarity;
          this.hp -= damage;
          this.damageMob(m, 25 * 1.02 ** (this.save.level - 1));
          this.lastHurt = 0;
          this.hitFlash = 0.2;
          m.cooldown = 0.4;
          m.aggro = true;
          this.float(this.x, this.y - 25, `−${Math.ceil(damage)}`, '#ff9292');
          this.burst(this.x, this.y, '#ffcf4d', 6);
        }
      }
      for (const p of this.petals) {
        if (!p || p.cd > 0) continue;
        const pd = stat(p);
        if (!pd.damage && !pd.poison) continue;
        const count = pd.count ?? 1;
        for (let k = 0; k < count; k++) {
          const unit = p.units?.[k];
          if (unit && unit.cd > 0) continue;
          const contacts = unit?.contact ?? p.contact;
          const a = this.angle * 2 + (k * Math.PI * 2) / count;
          const px = p.x + (count > 1 ? Math.cos(a) * 10 : 0),
            py = p.y + (count > 1 ? Math.sin(a) * 10 : 0);
          if (
            Math.hypot(px - m.x, py - m.y) < m.radius + pd.size &&
            (contacts[m.id] ?? 0) < this.time
          ) {
            contacts[m.id] = this.time + 0.25;
            this.damageMob(
              m,
              pd.damage / (['Light', 'Stinger'].includes(p.type) ? count : 1),
              pd.poison,
            );
            if (unit) {
              unit.hp -= d.damage * 3 ** m.rarity;
              if (unit.hp <= 0) {
                unit.cd = pd.reload;
                this.burst(px, py, '#fff', 4);
              }
            } else {
              p.hp -= d.damage * 3 ** m.rarity;
              if (p.hp <= 0) {
                p.cd = pd.reload;
                this.burst(p.x, p.y, '#fff', 4);
                break;
              }
            }
          }
        }
      }
    }
    for (const b of this.projectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const m of this.mobs)
        if (m.hp > 0 && Math.hypot(b.x - m.x, b.y - m.y) < m.radius + 8) {
          this.damageMob(m, b.damage);
          b.life = 0;
          break;
        }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    this.mobs = this.mobs.filter((m) => m.hp > 0);
    for (const drop of this.drops) {
      drop.life -= dt;
      const dist = Math.hypot(drop.x - this.x, drop.y - this.y);
      if (dist < 120) {
        drop.x += (this.x - drop.x) * dt * 8;
        drop.y += (this.y - drop.y) * dt * 8;
      }
      if (dist < 28) {
        this.save.inventory[itemKey(drop)] =
          (this.save.inventory[itemKey(drop)] ?? 0) + 1;
        drop.life = 0;
        this.onEvent(`获得 ${RARITIES[drop.rarity].name} ${drop.type}`);
      }
    }
    this.drops = this.drops.filter((d) => d.life > 0);
    this.spawnTimer += dt;
    if (this.spawnTimer > 4 && this.mobs.length < 180) {
      this.spawnTimer = 0;
      const types = BIOMES[this.save.biome].types;
      const a = this.rng() * Math.PI * 2,
        x = Math.max(
          100,
          Math.min(this.width - 100, this.x + Math.cos(a) * 800),
        ),
        y = Math.max(
          100,
          Math.min(this.height - 100, this.y + Math.sin(a) * 800),
        );
      this.addMob(
        types[Math.floor(this.rng() * types.length)],
        x,
        y,
        Math.min(6, Math.floor(x / 1200)),
      );
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.onEvent('dead');
    }
  }
  orbit(dt: number) {
    const r =
      this.mode === 'attack'
        ? SIMULATION_TUNING.attackRadius
        : this.mode === 'defend'
          ? SIMULATION_TUNING.defendRadius
          : SIMULATION_TUNING.normalRadius;
    this.petals.forEach((p, i) => {
      if (!p) return;
      const a =
        this.angle + (i * Math.PI * 2) / Math.max(1, this.petals.length);
      p.x +=
        (this.x +
          Math.cos(a) *
            (p.type === 'Rose'
              ? 70
              : p.type === 'Rock'
                ? r * 0.85
                : p.type === 'Wing' && this.mode === 'attack'
                  ? r + Math.sin(this.time * 5) * 35
                  : r) -
          p.x) *
        Math.min(1, dt * 18);
      p.y +=
        (this.y +
          Math.sin(a) *
            (p.type === 'Rose'
              ? 70
              : p.type === 'Rock'
                ? r * 0.85
                : p.type === 'Wing' && this.mode === 'attack'
                  ? r + Math.sin(this.time * 5) * 35
                  : r) -
          p.y) *
        Math.min(1, dt * 18);
    });
  }
}
