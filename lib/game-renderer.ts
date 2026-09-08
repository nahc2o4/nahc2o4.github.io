import { GameEngine } from './game-engine.ts';
import { BIOMES, RARITIES, MOBS, PETALS, stat } from './game-data.ts';
import { drawSprite, petalWorldSize, mobSpriteAngle } from './sprite-loader.ts';
export { drawSprite, loadSprites } from './sprite-loader.ts';
import { createFace, updateFace, drawFlowerFace } from './flower-face.ts';
export function flower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  mode = 'normal',
  time = 0,
) {
  const face = createFace();
  face.attack = mode === 'attack' ? 1 : 0;
  face.defend = mode === 'defend' ? 1 : 0;
  drawFlowerFace(ctx, x, y, r, face, time);
}

const labelCache = new Map<
  string,
  { canvas: HTMLCanvasElement; w: number; h: number }
>();
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 13,
  color = '#fff',
) {
  const key = `${text}|${size}|${color}`;
  let cached = labelCache.get(key);
  if (!cached) {
    const canvas = document.createElement('canvas'),
      c = canvas.getContext('2d')!;
    c.font = `700 ${size}px Ubuntu, sans-serif`;
    const w = Math.ceil(c.measureText(text).width + 8),
      h = size + 10;
    canvas.width = w * 2;
    canvas.height = h * 2;
    c.scale(2, 2);
    c.font = `700 ${size}px Ubuntu, sans-serif`;
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.lineWidth = 3;
    c.strokeStyle = '#263326';
    c.fillStyle = color;
    c.strokeText(text, w / 2, size + 2);
    c.fillText(text, w / 2, size + 2);
    cached = { canvas, w, h };
    if (labelCache.size >= 256)
      labelCache.delete(labelCache.keys().next().value!);
    labelCache.set(key, cached);
  }
  ctx.drawImage(
    cached.canvas,
    x - cached.w / 2,
    y - size - 2,
    cached.w,
    cached.h,
  );
}
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export class GameRenderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  engine: GameEngine;
  camera = { x: 540, y: 700 };
  zoom = 1;
  showNames = true;
  showDamage = true;
  particles = true;
  w = 0;
  h = 0;
  screenShake = false;
  private face = createFace();
  private faceTime = 0;
  private terrainCache = new Map<string, HTMLCanvasElement>();
  private dpr = 1;
  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
  }
  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const dpr = Math.min(devicePixelRatio, 1.5);
    this.dpr = dpr;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }
  render() {
    const { ctx: c, engine: e, w, h } = this,
      dpr = this.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const biome = BIOMES[e.save.biome];
    c.fillStyle = biome.bg;
    c.fillRect(0, 0, w, h);
    if (e.state === 'lobby') {
      this.drawLobby();
      return;
    }
    this.camera.x += (e.x - this.camera.x) * 0.12;
    this.camera.y += (e.y - this.camera.y) * 0.12;
    const vision = e.save.loadout.some((p) => p?.type === 'Antennae')
      ? 0.85
      : 1;
    const zoom = this.zoom * vision;
    const ox = w / 2 - this.camera.x * zoom,
      oy = h / 2 - this.camera.y * zoom;
    c.save();
    c.translate(
      ox + (e.hitFlash && this.screenShake ? Math.sin(e.time * 90) * 3 : 0),
      oy,
    );
    c.scale(zoom, zoom);
    const left = this.camera.x - w / 2 / zoom,
      top = this.camera.y - h / 2 / zoom,
      right = left + w / zoom,
      bottom = top + h / zoom;
    this.ground(left, top, right, bottom, biome.dark, biome.light);
    c.strokeStyle = biome.dark;
    c.lineWidth = 14;
    c.strokeRect(0, 0, e.width, e.height);
    for (const drop of e.drops) {
      if (
        drop.x < left - 50 ||
        drop.x > right + 50 ||
        drop.y < top - 50 ||
        drop.y > bottom + 50
      )
        continue;
      const bounce = Math.sin(e.time * 3 + drop.id) * 3;
      c.save();
      c.translate(drop.x, drop.y + bounce);
      c.fillStyle = RARITIES[drop.rarity].color;
      c.strokeStyle = '#36523288';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(-16, -16, 32, 32, 3);
      c.fill();
      c.stroke();
      drawSprite(c, drop.type, 0, 0, petalWorldSize(drop.type, 23));
      c.restore();
    }
    for (const m of e.mobs) {
      if (
        m.x < left - 150 ||
        m.x > right + 150 ||
        m.y < top - 150 ||
        m.y > bottom + 150
      )
        continue;
      c.save();
      if (m.hit) c.globalAlpha = 0.7;
      const key = MOBS[m.type].asset ?? m.type.toLowerCase();
      if (m.type === 'Centipede') {
        for (let n = 7; n >= 1; n--) {
          const a = m.angle + Math.sin(e.time * 2 - n * 0.4) * 0.35;
          drawSprite(
            c,
            'centipede-body',
            m.x - Math.cos(a) * n * m.radius * 1.35,
            m.y - Math.sin(a) * n * m.radius * 1.35,
            m.radius * 2.2,
            mobSpriteAngle('centipede-body', m.angle),
          );
        }
      }
      const found = drawSprite(
        c,
        key,
        m.x,
        m.y,
        m.radius * 2.15,
        mobSpriteAngle(key, m.angle),
      );
      if (!found) {
        drawSprite(c, 'mob-rock', m.x, m.y, m.radius * 2.15, mobSpriteAngle('mob-rock', m.angle));
      }
      c.restore();
      if (this.showNames) {
        label(c, m.type, m.x, m.y + m.radius + 19, 13);
        label(
          c,
          RARITIES[m.rarity].name,
          m.x,
          m.y + m.radius + 33,
          11,
          RARITIES[m.rarity].color,
        );
      }
      if (m.hp < m.maxHp) {
        c.fillStyle = '#263c2b';
        c.beginPath();
        c.roundRect(m.x - 24, m.y + m.radius + 39, 48, 5, 3);
        c.fill();
        c.fillStyle = m.poisonTime > 0 ? '#ce82f0' : '#80e16a';
        c.beginPath();
        c.roundRect(
          m.x - 23,
          m.y + m.radius + 40,
          46 * Math.max(0, m.hp / m.maxHp),
          3,
          2,
        );
        c.fill();
      }
    }
    for (const b of e.projectiles) {
      if (b.type === 'Peas') {
        c.fillStyle = '#78c844';
        c.strokeStyle = '#538e30';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(b.x, b.y, 6, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      } else
        drawSprite(
          c,
          'Missile',
          b.x,
          b.y,
          petalWorldSize('Missile'),
          Math.atan2(b.vy, b.vx) + Math.PI / 2,
        );
    }
    for (const p of e.petals) {
      if (!p || p.cd > 0) continue;
      const d = stat(p);
      const count = ['Peas', 'Sand', 'Pollen'].includes(p.type)
        ? 1
        : (d.count ?? 1);
      for (let k = 0; k < count; k++) {
        if (p.units?.[k] && p.units[k].cd > 0) continue;
        const a = e.angle * 2 + (k * Math.PI * 2) / count;
        drawSprite(
          c,
          p.type,
          p.x + (count > 1 ? Math.cos(a) * 10 : 0),
          p.y + (count > 1 ? Math.sin(a) * 10 : 0),
          petalWorldSize(p.type),
          p.type === 'Wing'
            ? e.angle * 3
            : Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2,
        );
      }
    }
    if (e.invuln > 0) {
      c.strokeStyle = '#fff6';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(e.x, e.y, 31, 0, Math.PI * 2);
      c.stroke();
    }
    updateFace(this.face, e.mode, e.input, Math.max(0, e.time - this.faceTime));
    this.faceTime = e.time;
    drawFlowerFace(c, e.x, e.y, e.radius, this.face, e.time);
    label(c, e.save.name, e.x, e.y + 40, 13);
    if (e.hp < e.maxHp) {
      c.fillStyle = '#334e35';
      c.beginPath();
      c.roundRect(e.x - 24, e.y + 47, 48, 6, 3);
      c.fill();
      c.fillStyle = '#77e368';
      c.beginPath();
      c.roundRect(e.x - 23, e.y + 48, (46 * e.hp) / e.maxHp, 4, 2);
      c.fill();
    }
    if (this.particles)
      for (const p of e.particles) {
        c.globalAlpha = Math.max(0, p.life / p.max);
        if (p.text) {
          if (this.showDamage) label(c, p.text, p.x, p.y, p.size, p.color);
        } else {
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
    c.globalAlpha = 1;
    c.restore();
    if (e.hitFlash) {
      c.fillStyle = `rgba(220,40,25,${e.hitFlash * 0.5})`;
      c.fillRect(0, 0, w, h);
    }
  }
  ground(
    left: number,
    top: number,
    right: number,
    bottom: number,
    dark: string,
    light: string,
  ) {
    const c = this.ctx,
      key = `${dark}|${light}`,
      tileSize = 660;
    let tile = this.terrainCache.get(key);
    if (!tile) {
      tile = document.createElement('canvas');
      tile.width = tileSize;
      tile.height = tileSize;
      const t = tile.getContext('2d')!;
      for (let gx = 0; gx < 6; gx++)
        for (let gy = 0; gy < 6; gy++) {
          const seed = hash(gx, gy),
            x = gx * 110 + 20 + seed * 60,
            y = gy * 110 + 20 + hash(gy, gx) * 60,
            s = 5 + seed * 22;
          t.fillStyle = seed > 0.5 ? dark : light;
          t.globalAlpha = seed > 0.5 ? 0.2 : 0.12;
          t.save();
          t.translate(x, y);
          t.rotate(seed * 6);
          t.beginPath();
          t.moveTo(-s, -s * 0.6);
          t.quadraticCurveTo(-s, -s, s * 0.2, -s);
          t.quadraticCurveTo(s, -s, s * 0.7, s * 0.3);
          t.quadraticCurveTo(s * 0.6, s, -s * 0.3, s * 0.5);
          t.quadraticCurveTo(-s, s * 0.4, -s, -s * 0.6);
          t.fill();
          t.restore();
        }
      this.terrainCache.set(key, tile);
    }
    for (
      let tx = Math.floor(left / tileSize);
      tx <= Math.floor(right / tileSize);
      tx++
    )
      for (
        let ty = Math.floor(top / tileSize);
        ty <= Math.floor(bottom / tileSize);
        ty++
      )
        c.drawImage(tile, tx * tileSize, ty * tileSize);
  }

  drawLobby() {
    const c = this.ctx,
      e = this.engine;
    this.ground(0, 0, this.w, this.h, '#138950', '#50bb7b');
    for (let i = 0; i < 23; i++) {
      const x =
          (hash(i, 9) * this.w + Math.sin(e.time * 0.14 + i) * 80 + this.w) %
          this.w,
        y =
          ((hash(i, 15) * this.h + e.time * (3 + hash(i, 5) * 6)) %
            (this.h + 70)) -
          35;
      drawSprite(
        c,
        Object.keys(PETALS)[i % Object.keys(PETALS).length],
        x,
        y,
        petalWorldSize(Object.keys(PETALS)[i % Object.keys(PETALS).length], 18 + hash(i, 3) * 35),
      );
    }
  }
  drawMap(canvas: HTMLCanvasElement, large = false) {
    const c = canvas.getContext('2d')!,
      e = this.engine,
      w = canvas.width,
      h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = BIOMES[e.save.biome].dark;
    c.fillRect(0, 0, w, h);
    for (let r = 0; r < 6; r++) {
      c.fillStyle = RARITIES[r].color;
      c.globalAlpha = 0.09 + r * 0.015;
      c.fillRect((r * w) / 6, 0, w / 6, h);
    }
    c.globalAlpha = 0.2;
    c.strokeStyle = '#fff';
    c.lineWidth = 1;
    for (let x = 0; x < 6; x++) {
      c.beginPath();
      c.moveTo((x * w) / 6, 0);
      c.lineTo((x * w) / 6, h);
      c.stroke();
    }
    for (let y = 0; y < 4; y++) {
      c.beginPath();
      c.moveTo(0, (y * h) / 4);
      c.lineTo(w, (y * h) / 4);
      c.stroke();
    }
    c.globalAlpha = 1;
    for (const m of e.mobs) {
      c.fillStyle = RARITIES[m.rarity].color;
      c.globalAlpha = large ? 0.65 : 0.35;
      c.beginPath();
      c.arc(
        (m.x / e.width) * w,
        (m.y / e.height) * h,
        large ? 2 : 1,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#ffe666';
    c.strokeStyle = '#3f542d';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(
      (e.x / e.width) * w,
      (e.y / e.height) * h,
      large ? 6 : 3.5,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.stroke();
  }
}
