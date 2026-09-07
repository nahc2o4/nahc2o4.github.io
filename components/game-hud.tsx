'use client';
import { memo, useEffect, useState, useRef } from 'react';
import type { RefObject } from 'react';
import type { GameEngine, Save } from '@/lib/game-engine';
import { createFace, updateFace, drawFlowerFace } from '@/lib/flower-face';
import { loadSprites } from '@/lib/sprite-loader';
import { stat, xpForLevel } from '@/lib/game-data';
export const PlayerHUD = memo(function PlayerHUD({
  engine,
  save,
}: {
  engine: RefObject<GameEngine | null>;
  save: Save;
}) {
  const portrait = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const face = createFace();
    let ready = false;
    let last = performance.now();
    void loadSprites().then(() => {
      ready = true;
    });
    const timer = setInterval(() => {
      const e = engine.current,
        c = portrait.current?.getContext('2d');
      const now = performance.now();
      if (ready && e && c && !document.hidden) {
        updateFace(face, e.mode, e.input, (now - last) / 1000);
        c.clearRect(0, 0, 132, 132);
        drawFlowerFace(c, 66, 66, 65, face, e.time);
      }
      last = now;
    }, 33);
    return () => clearInterval(timer);
  }, [engine]);
  const [health, setHealth] = useState({ hp: 200, max: 200 });
  useEffect(() => {
    const sample = () => {
      const e = engine.current;
      if (!e) return;
      const hp = Math.ceil(e.hp),
        max = Math.ceil(e.maxHp);
      setHealth((old) =>
        old.hp === hp && old.max === max ? old : { hp, max },
      );
    };
    sample();
    const t = setInterval(sample, 150);
    return () => clearInterval(t);
  }, [engine]);
  return (
    <div className="player-hud">
      <canvas
        ref={portrait}
        className="player-portrait"
        width={132}
        height={132}
        aria-label="Flower 操作表情"
      />
      <div className="hud-bars">
        <div className="health-track">
          <div style={{ width: `${(health.hp / health.max) * 100}%` }} />
          <span>{save.name}</span>
        </div>
        <div className="xp-track">
          <div
            style={{ width: `${(save.xp / xpForLevel(save.level)) * 100}%` }}
          />
          <span>Lvl {save.level}</span>
        </div>
        <small>
          {health.hp} / {health.max} HP <span>·</span>{' '}
          {save.xp.toLocaleString()} / {xpForLevel(save.level).toLocaleString()}{' '}
          XP
        </small>
      </div>
    </div>
  );
});
export const Cooldown = memo(function Cooldown({
  engine,
  index,
}: {
  engine: RefObject<GameEngine | null>;
  index: number;
}) {
  const [value, setValue] = useState({ seconds: 0, percent: 0 });
  useEffect(() => {
    const sample = () => {
      const p = engine.current?.petals[index];
      if (!p) return;
      const cd = Math.max(
          0,
          p.cd ||
            (p.units?.every((u) => u.cd > 0)
              ? Math.min(...p.units.map((u) => u.cd))
              : 0),
        ),
        seconds = Math.ceil(cd * 10) / 10,
        percent = Math.min(100, (cd / stat(p).reload) * 100);
      setValue((old) => (old.seconds === seconds ? old : { seconds, percent }));
    };
    sample();
    const t = setInterval(sample, 100);
    return () => clearInterval(t);
  }, [engine, index]);
  return value.seconds > 0 ? (
    <span className="cooldown" style={{ height: `${value.percent}%` }}>
      <b>{value.seconds.toFixed(1)}</b>
    </span>
  ) : null;
});

export const QuestHUD = memo(function QuestHUD({
  engine,
}: {
  engine: RefObject<GameEngine | null>;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const e = engine.current;
      if (e)
        setProgress(
          e.chainComplete
            ? 100
            : e.time - e.lastChainKill <= 2
              ? Math.min(100, e.chainKills / 5)
              : 0,
        );
    }, 200);
    return () => clearInterval(id);
  }, [engine]);
  return (
    <aside className="quest-hud">
      <strong>Serial killer</strong>
      <p>Destroy 500 mobs within 2 seconds of each other.</p>
      <div className="quest-progress" aria-label="Serial killer">
        <progress
          className="sr-only"
          aria-label="Serial killer progress"
          value={progress}
          max={100}
        />
        <i style={{ width: `${progress}%` }} />
        <span>{Math.floor(progress)}%</span>
      </div>
    </aside>
  );
});
