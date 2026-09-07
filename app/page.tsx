'use client';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  Fragment,
} from 'react';
import { PlayerHUD, Cooldown, QuestHUD } from '@/components/game-hud';
import {
  Settings,
  CircleDot,
  Castle,
  Star,
  Backpack,
  FlaskConical,
  Dna,
  BookOpen,
  X,
  ArrowRightLeft,
  ChevronRight,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  Flower2,
  Home as HomeIcon,
  MousePointer2,
  Keyboard,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { GameEngine, freshSave, validSave } from '@/lib/game-engine';
import type { Save } from '@/lib/game-engine';
import { petalThumbnailSize } from '@/lib/sprite-loader';
import {
  GameRenderer,
  loadSprites,
  drawSprite,
  flower,
} from '@/lib/game-renderer';
import {
  PETALS,
  RARITIES,
  BIOMES,
  itemKey,
  fromKey,
  stat,
  craftUntilBlocked,
  slotsForLevel,
  earnedTP,
  loadoutCosts,
} from '@/lib/game-data';
import type { Equipped, Biome } from '@/lib/game-data';

type Panel = 'inventory' | 'craft' | 'talents' | null;
type SettingsState = {
  mouse: boolean;
  names: boolean;
  damage: boolean;
  sound: boolean;
  zoom: number;
  particles: boolean;
};
const SETTINGS: SettingsState = {
  mouse: true,
  names: true,
  damage: true,
  sound: true,
  zoom: 1,
  particles: true,
};
const SAVE_KEY = 'petal-garden-adventure-v1';
const Sprite = memo(function Sprite({
  type,
  size = 44,
  className = '',
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const draw = () => {
      if (!active || !ref.current) return;
      const c = ref.current.getContext('2d')!;
      c.clearRect(0, 0, size * 2, size * 2);
      c.setTransform(2, 0, 0, 2, 0, 0);
      if (type === 'Flower') flower(c, size / 2, size / 2, size * 0.4);
      else drawSprite(c, type, size / 2, size / 2, petalThumbnailSize(type, size));
    };
    void loadSprites()
      .then(draw)
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type, size]);
  return (
    <canvas
      className={`sprite ${className}`}
      ref={ref}
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size }}
      aria-label={type}
    />
  );
});
const TALENT_POINTS: Record<string, number[][]> = {
  rotation: [
    [140, 580],
    [70, 475],
    [175, 385],
    [70, 245],
    [235, 260],
    [95, 120],
    [-40, 380],
    [10, 560],
    [255, 100],
    [-25, 190],
  ],
  loadout: [
    [347, 548],
    [347, 365],
    [347, 235],
    [192, 118],
    [20, 145],
  ],
  health: [
    [485, 510],
    [550, 372],
    [470, 245],
    [347, 128],
    [505, 113],
    [625, 237],
    [672, 145],
    [684, 415],
    [616, 520],
    [560, 625],
  ],
};
function PanelGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="white" stroke="none">
      {kind === 'inventory' ? (
        <>
          <path d="M12 40C5 35 12 19 22 16L27 16C36 21 41 35 35 40Z" />
          <path d="M23 13L19 4Q25 1 25 12M27 13L33 4Q39 8 29 14M20 14L11 9Q10 15 20 16M27 10L28 2Q32 0 30 11" />
        </>
      ) : kind === 'craft' ? (
        <>
          {[
            [19, 15],
            [29, 24],
            [19, 32],
          ].map(([x, y]) => (
            <circle
              key={y}
              cx={x}
              cy={y}
              r="12"
              stroke="#d89d59"
              strokeWidth="2"
            />
          ))}
        </>
      ) : (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse
              key={i}
              cx="24"
              cy="13"
              rx="5"
              ry="10"
              transform={`rotate(${(i * 360) / 7} 24 24)`}
            />
          ))}
        </>
      )}
    </svg>
  );
}
function PetalCard({
  item,
  count,
  small = false,
  gridColumn,
  selected = false,
  onClick,
  onHover,
  children,
}: {
  item: Equipped;
  count?: number;
  small?: boolean;
  gridColumn?: number;
  selected?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onHover?: (p: Equipped | null) => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className={`petal-card ${small ? 'small' : ''} ${selected ? 'selected' : ''}`}
      style={
        {
          '--rarity': RARITIES[item.rarity].color,
          gridColumn,
        } as React.CSSProperties
      }
      onClick={onClick}
      onMouseEnter={() => onHover?.(item)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(item)}
      onBlur={() => onHover?.(null)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/petal', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      aria-label={`${RARITIES[item.rarity].name} ${item.type}${count !== undefined ? ` ×${count}` : ''}`}
    >
      <span className="petal-count">
        {count !== undefined ? `×${count}` : ''}
      </span>
      <Sprite type={item.type} size={small ? 35 : 49} />
      <span className="petal-name">{item.type}</span>
      {children}
    </button>
  );
}
function playTone(freq = 600) {
  try {
    const A =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const c = new A(),
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.035, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.14);
    osc.start();
    osc.stop(c.currentTime + 0.15);
    osc.onended = () => void c.close();
  } catch {}
}
export default function Game() {
  const canvas = useRef<HTMLCanvasElement>(null),
    map = useRef<HTMLCanvasElement>(null),
    bigMap = useRef<HTMLCanvasElement>(null),
    engine = useRef<GameEngine | null>(null),
    renderer = useRef<GameRenderer | null>(null),
    keys = useRef(new Set<string>()),
    mouse = useRef({ x: 0, y: 0, active: false, down: false, right: false }),
    settingsRef = useRef(SETTINGS),
    lastSaved = useRef(''),
    panelRef = useRef<Panel>(null),
    modalRef = useRef(false),
    raf = useRef(0);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [loaded, setLoaded] = useState(false),
    [stacked, setStacked] = useState(true),
    [menuExpanded, setMenuExpanded] = useState(true),
    [save, setSave] = useState<Save>(freshSave),
    [state, setState] = useState('lobby'),
    [deathStats, setDeathStats] = useState({ kills: 0, xp: 0 }),
    [panel, setPanel] = useState<Panel>(null),
    [resetPending, setResetPending] = useState(false),
    [name, setName] = useState('Guest'),
    [settings, setSettings] = useState(SETTINGS),
    [settingsOpen, setSettingsOpen] = useState(false),
    [mapOpen, setMapOpen] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [aboutOpen, setAboutOpen] = useState(false),
    [selected, setSelected] = useState<Equipped | null>(null),
    [hovered, setHovered] = useState<Equipped | null>(null),
    [rarityFilter, setRarityFilter] = useState(-1),
    [craftMessage, setCraftMessage] = useState(
      '选择一种花瓣，放入 5 片进行合成',
    ),
    [crafting, setCrafting] = useState(false),
    [craftAll, setCraftAll] = useState(false),
    [toast, setToast] = useState(''),
    [search, setSearch] = useState(''),
    [showHint, setShowHint] = useState(true),
    [assetsReady, setAssetsReady] = useState(false);
  const saveNow = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    const serialized = JSON.stringify(e.save);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    try {
      localStorage.setItem(SAVE_KEY, serialized);
    } catch {}
    setSave({
      ...e.save,
      inventory: { ...e.save.inventory },
      loadout: [...e.save.loadout],
      reserve: [...e.save.reserve],
    });
  }, []);
  const notify = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast((t) => (t === text ? '' : t)), 3200);
  }, []);
  const togglePanel = useCallback((p: Panel) => {
    setPanel((old) => (old === p ? null : p));
    setSelected(null);
    setHovered(null);
    setSearch('');
    if (p === 'craft') setRarityFilter(-1);
  }, []);
  useEffect(() => {
    setResetPending(false);
  }, [panel]);
  useEffect(() => {
    settingsRef.current = settings;
    try {
      if (settingsHydrated)
        localStorage.setItem('petal-garden-settings', JSON.stringify(settings));
    } catch {}
    if (renderer.current) {
      renderer.current.zoom = settings.zoom;
      renderer.current.showNames = settings.names;
      renderer.current.showDamage = settings.damage;
      renderer.current.particles = settings.particles;
    }
  }, [settings, settingsHydrated]);
  useEffect(() => {
    panelRef.current = panel;
    mouse.current.active = false;
  }, [panel]);
  useEffect(() => {
    modalRef.current = settingsOpen || mapOpen || helpOpen || aboutOpen;
    if (engine.current) engine.current.paused = modalRef.current;
    mouse.current.active = false;
  }, [settingsOpen, mapOpen, helpOpen, aboutOpen]);
  useEffect(() => {
    let disposed = false;
    const init = async () => {
      let stored = freshSave();
      try {
        stored = validSave(
          JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'),
        );
        setSettings({
          ...SETTINGS,
          ...JSON.parse(localStorage.getItem('petal-garden-settings') || '{}'),
        });
      } catch {}
      setSettingsHydrated(true);
      const e = new GameEngine(stored);
      engine.current = e;
      setSave({ ...e.save });
      setName(e.save.name);
      const r = new GameRenderer(canvas.current!, e);
      renderer.current = r;
      const resize = () => r.resize(window.innerWidth, window.innerHeight);
      resize();
      window.addEventListener('resize', resize);
      e.onEvent = (event) => {
        if (event === 'dead') {
          setDeathStats({ kills: e.sessionKills, xp: e.sessionXP });
          setState('dead');
          if (settingsRef.current.sound) playTone(180);
        } else if (event !== 'save') {
          notify(event);
          if (settingsRef.current.sound)
            playTone(event.startsWith('等级') ? 880 : 540);
        }
        saveNow();
      };
      await loadSprites().catch(() => {});
      if (disposed) {
        window.removeEventListener('resize', resize);
        return;
      }
      setAssetsReady(true);
      setLoaded(true);
      let last = performance.now(),
        lastUI = 0,
        lastSave = 0,
        metricAt = 0;
      const frameCosts: number[] = [];
      const frame = (now: number) => {
        if (disposed) return;
        if (document.hidden) {
          last = now;
          raf.current = requestAnimationFrame(frame);
          return;
        }
        const cpuStart = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        const k = keys.current;
        let dx =
            (k.has('d') || k.has('arrowright') ? 1 : 0) -
            (k.has('a') || k.has('arrowleft') ? 1 : 0),
          dy =
            (k.has('s') || k.has('arrowdown') ? 1 : 0) -
            (k.has('w') || k.has('arrowup') ? 1 : 0);
        if (
          !dx &&
          !dy &&
          settingsRef.current.mouse &&
          mouse.current.active &&
          !panelRef.current &&
          !modalRef.current
        ) {
          dx = (mouse.current.x - r.w / 2) / 110;
          dy = (mouse.current.y - r.h / 2) / 110;
          if (Math.hypot(dx, dy) < 0.22) {
            dx = 0;
            dy = 0;
          }
        }
        e.input = { x: dx, y: dy };
        e.mode =
          k.has('shift') || mouse.current.right
            ? 'defend'
            : k.has(' ') || mouse.current.down
              ? 'attack'
              : 'normal';
        e.update(dt);
        r.render();
        frameCosts.push(performance.now() - cpuStart);
        if (frameCosts.length > 120) frameCosts.shift();
        if (now - metricAt > 1000) {
          const sorted = [...frameCosts].sort((a, b) => a - b);
          canvas.current!.dataset.frameCpuP50 =
            sorted[Math.floor(sorted.length * 0.5)].toFixed(2);
          canvas.current!.dataset.frameCpuP95 =
            sorted[
              Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
            ].toFixed(2);
          canvas.current!.dataset.mobCount = String(e.mobs.length);
          metricAt = now;
        }
        if (now - lastUI > 250) {
          if (map.current) r.drawMap(map.current);
          if (bigMap.current) r.drawMap(bigMap.current, true);
          lastUI = now;
        }
        if (now - lastSave > 5000 && e.state === 'playing') {
          saveNow();
          lastSave = now;
        }
        raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
      return () => window.removeEventListener('resize', resize);
    };
    let cleanup: (() => void) | undefined;
    void init().then((c) => {
      cleanup = c;
    });
    const blur = () => {
      keys.current.clear();
      mouse.current.down = false;
      mouse.current.right = false;
      mouse.current.active = false;
    };
    window.addEventListener('blur', blur);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf.current);
      cleanup?.();
      window.removeEventListener('blur', blur);
    };
  }, [notify, saveNow]);
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).matches('input,textarea')) return;
      const key = ev.key.toLowerCase();
      if (
        [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
      )
        ev.preventDefault();
      if (modalRef.current) {
        if (key === 'escape') {
          setSettingsOpen(false);
          setHelpOpen(false);
          setMapOpen(false);
          setAboutOpen(false);
        }
        return;
      }
      keys.current.add(key);
      if (ev.repeat) return;
      const e = engine.current;
      if (key === 'escape') {
        if (panel) setPanel(null);
        else setSettingsOpen(true);
      }
      if (key === 'z' || key === 'i') togglePanel('inventory');
      if (key === 'c') togglePanel('craft');
      if (key === 'x' || key === 't') togglePanel('talents');
      if (key === 'm') setMapOpen((v) => !v);
      if (key === 'r') {
        e?.save.loadout.forEach((_, i) => e.swap(i));
        saveNow();
      }
      if (/^[0-9]$/.test(key)) {
        e?.swap(key === '0' ? 9 : Number(key) - 1);
        saveNow();
      }
    };
    const up = (ev: KeyboardEvent) => keys.current.delete(ev.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [panel, saveNow, togglePanel]);
  const start = () => {
    const e = engine.current;
    if (!e) return;
    saveNow();
    let data: Save;
    try {
      data = validSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'));
    } catch {
      data = freshSave();
    }
    data.name = name.trim() || 'Guest';
    e.save = data;
    e.rebuildPetals();
    e.start();
    setState('playing');
    setPanel(null);
    setSelected(null);
    mouse.current.active = false;
    setShowHint(false);
    saveNow();
    if (settingsRef.current.sound) playTone(750);
  };
  const equip = (index: number, reserve = false) => {
    if (!engine.current) return;
    if (selected) {
      if (engine.current.equip(index, selected, reserve)) {
        if ((engine.current.save.inventory[itemKey(selected)] ?? 0) === 0)
          setSelected(null);
        notify(`已装备 ${selected.type}`);
        saveNow();
      }
    } else {
      engine.current.swap(index);
      saveNow();
    }
  };
  const dropped = (ev: React.DragEvent, index: number, reserve = false) => {
    ev.preventDefault();
    try {
      const p = JSON.parse(ev.dataTransfer.getData('application/petal'));
      if (PETALS[p.type]) engine.current?.equip(index, p, reserve);
      saveNow();
    } catch {}
  };
  const doCraft = () => {
    if (!selected || crafting || !engine.current) return;
    const p = { ...selected };
    const craftingSave = engine.current.save;
    setCrafting(true);
    setCraftMessage('花瓣正在融合…');
    let completed = 0,
      successes = 0;
    const runChunk = () => {
      if (!engine.current || engine.current.save !== craftingSave) {
        setCrafting(false);
        return;
      }
      const result = craftUntilBlocked(
        craftingSave.inventory,
        p,
        Math.random,
        craftAll ? 100 : 1,
      );
      completed += result.attempts;
      successes += result.successes;
      if (craftAll && !result.blocked) {
        setTimeout(runChunk, 0);
        return;
      }
      setCrafting(false);
      setCraftMessage(
        completed
          ? successes
            ? `获得 ${successes} 片 ${RARITIES[p.rarity + 1].name} ${p.type}`
            : '合成失败'
          : '需要 5 片相同类型、相同稀有度花瓣',
      );
      if (settingsRef.current.sound) playTone(successes ? 1000 : 260);
      saveNow();
    };
    setTimeout(runChunk, 850);
  };

  const spentTP =
      save.talents.health * 3 +
      save.talents.rotation * 3 +
      loadoutCosts.slice(0, save.talents.loadout).reduce((a, b) => a + b, 0),
    tp = earnedTP(save.level) - spentTP;
  const upgrade = (type: 'loadout' | 'health' | 'rotation') => {
    const e = engine.current;
    if (!e) return;
    const cost = type === 'loadout' ? loadoutCosts[e.save.talents.loadout] : 3;
    if (!cost || tp < cost) return;
    const ratio = e.hp / e.maxHp;
    e.save.talents[type]++;
    if (type === 'loadout') {
      e.save.loadout.push(null);
      e.save.reserve.push(null);
    }
    e.rebuildPetals();
    e.hp = e.maxHp * ratio;
    saveNow();
    notify('天赋已升级');
  };
  const resetTalents = () => {
    if (!engine.current?.resetTalents()) return;
    setResetPending(false);
    saveNow();
    notify('天赋已重置，全部天赋点已返还；额外槽位花瓣已放回背包');
  };
  const absorb = () => {
    const e = engine.current;
    if (!e || !selected) return;
    const k = itemKey(selected);
    if (!(e.save.inventory[k] > 0)) return;
    e.save.inventory[k]--;
    const xp = 5 ** selected.rarity;
    e.gainXP(xp);
    saveNow();
    notify(`吸收了 1 片 ${selected.type} · +${xp} XP`);
  };
  const inventory = useMemo(
    () =>
      Object.entries(save.inventory)
        .filter(
          ([key, count]) =>
            count > 0 &&
            (rarityFilter < 0 || fromKey(key).rarity === rarityFilter) &&
            fromKey(key).type.toLowerCase().includes(search.toLowerCase()),
        )
        .sort(([a], [b]) =>
          panel === 'craft'
            ? fromKey(a).type.localeCompare(fromKey(b).type) ||
              fromKey(a).rarity - fromKey(b).rarity
            : fromKey(b).rarity - fromKey(a).rarity ||
              fromKey(a).type.localeCompare(fromKey(b).type),
        ),
    [save.inventory, rarityFilter, search, panel],
  );
  const displayedInventory: [string, number][] =
    panel === 'craft'
      ? [...new Set(inventory.map(([key]) => fromKey(key).type))].flatMap(
          (type) =>
            Array.from(
              {
                length:
                  (save.inventory[itemKey({ type, rarity: 8 })] ?? 0) > 0
                    ? 9
                    : 8,
              },
              (_, rarity) => {
                const key = itemKey({ type, rarity });
                return [key, save.inventory[key] ?? 0] as [string, number];
              },
            ),
        )
      : inventory;
  const inspect = hovered,
    slots = slotsForLevel(save.level, save.talents.loadout);
  return (
    <main className={`game-shell ${state === 'lobby' ? 'is-lobby' : ''}`}>
      <canvas
        ref={canvas}
        onContextMenu={(ev) => ev.preventDefault()}
        className="world-canvas"
        aria-label="花园战场"
        onPointerMove={(ev) => {
          mouse.current.x = ev.clientX;
          mouse.current.y = ev.clientY;
          mouse.current.active = true;
        }}
        onPointerDown={(ev) => {
          if (ev.button === 0) mouse.current.down = true;
          if (ev.button === 2) mouse.current.right = true;
          ev.currentTarget.setPointerCapture(ev.pointerId);
        }}
        onPointerUp={() => {
          mouse.current.down = false;
          mouse.current.right = false;
        }}
        onPointerLeave={() => {
          mouse.current.active = false;
          mouse.current.down = false;
          mouse.current.right = false;
        }}
      />
      <div className="reference-ui">
        <nav
          className={`toolbar ${menuExpanded ? '' : 'collapsed'}`}
          aria-label="游戏菜单"
        >
          <button
            className="tool grey"
            title="设置 [Esc]"
            aria-label="设置"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings />
          </button>
          <button
            className="tool red duplicate-tool"
            title="背包 [Z]"
            aria-label="背包"
            onClick={() => togglePanel('inventory')}
          >
            <CircleDot />
          </button>
          <button
            className="tool cyan duplicate-tool"
            title="花瓣合成 [C]"
            aria-label="花瓣合成"
            onClick={() => togglePanel('craft')}
          >
            <Castle fill="currentColor" />
          </button>
          <button
            className="tool gold duplicate-tool"
            title="天赋 [X]"
            aria-label="天赋"
            onClick={() => togglePanel('talents')}
          >
            <Dna />
            {tp > 0 && state !== 'lobby' && (
              <span className="tool-badge">{tp}</span>
            )}
          </button>
          <button
            className="tool muted-tool"
            title="操作说明"
            aria-label="操作说明"
            onClick={() => setHelpOpen(true)}
          >
            <Star fill="currentColor" />
          </button>
          {state !== 'lobby' && (
            <button
              className="menu-close"
              aria-label={menuExpanded ? '收起菜单' : '展开菜单'}
              onClick={() => setMenuExpanded((v) => !v)}
            >
              {menuExpanded ? <X /> : <ChevronRight />}
            </button>
          )}
        </nav>
        {state === 'lobby' ? (
          <>
            <div className="brand">florr.io</div>
            <section className="start-card">
              <div className="start-row">
                <input
                  aria-label="花朵昵称"
                  placeholder="Guest"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  maxLength={20}
                />
                <button
                  className="play-button"
                  onClick={start}
                  disabled={!loaded}
                >
                  Ready <Play fill="currentColor" />
                </button>
              </div>
              <div className="biome-picker" aria-label="选择区域">
                {(Object.keys(BIOMES) as (keyof typeof BIOMES)[]).map(
                  (biome) => (
                    <button
                      key={biome}
                      className={save.biome === biome ? 'active' : ''}
                      aria-pressed={save.biome === biome}
                      onClick={() => {
                        engine.current?.setBiome(biome);
                        saveNow();
                      }}
                    >
                      {biome}
                    </button>
                  ),
                )}
              </div>
            </section>
            <button
              className="credits-button"
              onClick={() => setAboutOpen(true)}
            >
              非官方二次创作 · 素材来源
            </button>
          </>
        ) : (
          <>
            <PlayerHUD engine={engine} save={save} />
            <QuestHUD engine={engine} />
            <button
              className="minimap-wrap"
              title="地图 [M]"
              onClick={() => setMapOpen(true)}
            >
              <canvas ref={map} width={150} height={112} />
              <span>{save.biome}</span>
            </button>
            {showHint && !panel && (
              <aside className="tutorial">
                <button
                  aria-label="关闭提示"
                  onClick={() => setShowHint(false)}
                >
                  <X size={14} />
                </button>
                <b>欢迎来到{BIOMES[save.biome].zh}</b>
                <p>
                  移动鼠标探索，按住 <kbd>空格</kbd> 展开花瓣。
                  <br />
                  击败生物后靠近掉落物，收集新的花瓣。
                </p>
                <small>
                  越往地图右侧，生物越强。
                  <button
                    onClick={() => {
                      setShowHint(false);
                      setHelpOpen(true);
                    }}
                  >
                    查看操作 <ChevronRight size={12} />
                  </button>
                </small>
              </aside>
            )}
            <aside className="side-actions">
              <button
                className={panel === 'inventory' ? 'active' : ''}
                onClick={() => togglePanel('inventory')}
                title="背包 [Z]"
              >
                <PanelGlyph kind="inventory" />
                <kbd>[Z]</kbd>
              </button>
              <button
                className={panel === 'talents' ? 'active' : ''}
                onClick={() => togglePanel('talents')}
                title="天赋 [X]"
              >
                <PanelGlyph kind="talents" />
                <kbd>[X]</kbd>
              </button>
              <button
                className={panel === 'craft' ? 'active' : ''}
                onClick={() => togglePanel('craft')}
                title="合成 [C]"
              >
                <PanelGlyph kind="craft" />
                <kbd>[C]</kbd>
              </button>
            </aside>
            <section
              className="loadout"
              style={{ '--slots': slots } as React.CSSProperties}
              aria-label="花瓣装备栏"
            >
              <div className="loadout-label">
                <span>
                  {selected ? `点击槽位装备 ${selected.type}` : '主装备'}
                </span>
                <button
                  title="交换全部主备花瓣 [R]"
                  onClick={() => {
                    engine.current?.save.loadout.forEach((_, i) =>
                      engine.current?.swap(i),
                    );
                    saveNow();
                  }}
                >
                  <ArrowRightLeft size={13} /> <kbd>R</kbd>
                </button>
              </div>
              <div className="loadout-row">
                {Array.from({ length: slots }, (_, i) => {
                  const p = save.loadout[i];
                  return (
                    <div
                      className={`slot ${selected ? 'equip-ready' : ''}`}
                      key={i}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => dropped(ev, i)}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        engine.current?.unequip(i);
                        saveNow();
                      }}
                    >
                      {p ? (
                        <PetalCard
                          item={p}
                          onClick={() => equip(i)}
                          onHover={setHovered}
                        >
                          <Cooldown engine={engine} index={i} />
                        </PetalCard>
                      ) : (
                        <button
                          className="empty-slot"
                          aria-label={`装备槽 ${i + 1}`}
                          onClick={() => equip(i)}
                        >
                          +
                        </button>
                      )}
                      <kbd className="slot-key">[{i === 9 ? 0 : i + 1}]</kbd>
                    </div>
                  );
                })}
              </div>
              <div className="loadout-row reserve-row">
                {Array.from({ length: slots }, (_, i) => {
                  const p = save.reserve[i];
                  return (
                    <div
                      className="slot"
                      key={i}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => dropped(ev, i, true)}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        engine.current?.unequip(i, true);
                        saveNow();
                      }}
                    >
                      {p ? (
                        <PetalCard
                          item={p}
                          small
                          onClick={() => equip(i, true)}
                          onHover={setHovered}
                        />
                      ) : (
                        <button
                          className="empty-slot"
                          aria-label={`备用槽 ${i + 1}`}
                          onClick={() => equip(i, true)}
                        >
                          {' '}
                        </button>
                      )}
                    </div>
                  );
                })}
                <span className="reserve-label">
                  备用
                  <br />
                  <small>数字键切换</small>
                </span>
              </div>
            </section>
            <div className="touch-controls">
              <button
                onPointerDown={() => keys.current.add(' ')}
                onPointerUp={() => keys.current.delete(' ')}
                onPointerLeave={() => keys.current.delete(' ')}
              >
                进攻
              </button>
              <button
                onPointerDown={() => keys.current.add('shift')}
                onPointerUp={() => keys.current.delete('shift')}
                onPointerLeave={() => keys.current.delete('shift')}
              >
                防御
              </button>
            </div>
          </>
        )}
        {panel && (
          <section
            className={`game-panel ${panel}-panel`}
            aria-label={
              panel === 'inventory'
                ? '背包面板'
                : panel === 'craft'
                  ? '合成面板'
                  : panel === 'talents'
                    ? '天赋面板'
                    : '图鉴面板'
            }
          >
            <header>
              <h2>
                {panel === 'inventory'
                  ? 'Inventory'
                  : panel === 'craft'
                    ? 'Craft'
                    : panel === 'talents'
                      ? 'Talents'
                      : '生物图鉴'}
              </h2>
              <button
                aria-label="关闭面板"
                onClick={() => {
                  setPanel(null);
                  setSelected(null);
                  setHovered(null);
                }}
              >
                <X size={21} />
              </button>
            </header>
            {(panel === 'inventory' || panel === 'craft') && (
              <>
                {panel === 'craft' ? (
                  <div className="craft-area">
                    <div className={`craft-ring ${crafting ? 'crafting' : ''}`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className="craft-input"
                          style={{
                            left: `${50 + Math.cos((i * Math.PI * 2) / 5 - Math.PI / 2) * 36}%`,
                            top: `${50 + Math.sin((i * Math.PI * 2) / 5 - Math.PI / 2) * 35}%`,
                          }}
                        >
                          {selected ? (
                            <PetalCard
                              item={selected}
                              count={Math.max(
                                0,
                                Math.floor(
                                  (Math.min(
                                    craftAll
                                      ? save.inventory[itemKey(selected)] ?? 0
                                      : 5,
                                    save.inventory[itemKey(selected)] ?? 0,
                                  ) +
                                    4 -
                                    i) /
                                    5,
                                ),
                              )}
                              small
                            />
                          ) : (
                            <span>?</span>
                          )}
                        </div>
                      ))}
                      <div className="craft-output">
                        {selected ? (
                          <PetalCard
                            item={{
                              ...selected,
                              rarity: Math.min(8, selected.rarity + 1),
                            }}
                            small
                          />
                        ) : (
                          <FlaskConical size={35} />
                        )}
                      </div>
                    </div>
                    <p className="craft-chance">
                      {selected
                        ? `${(RARITIES[selected.rarity].chance * 100).toFixed(selected.rarity === 7 ? 1 : 0)}% success chance`
                        : '?% success chance'}
                    </p>
                    <button
                      className="craft-button"
                      onClick={doCraft}
                      disabled={
                        !selected ||
                        crafting ||
                        selected.rarity === 8 ||
                        (save.inventory[itemKey(selected)] ?? 0) < 5
                      }
                    >
                      {crafting
                        ? 'Crafting…'
                        : 'Craft'}
                    </button>
                    <p className="craft-instruction">
                      Combine 5 of the same petal to craft an upgrade
                    </p>
                    <p className="craft-message" aria-live="polite">
                      {craftMessage}
                    </p>
                  </div>
                ) : (
                  <p className="panel-instruction">
                    Drag a petal to equip it
                  </p>
                )}
                <div className="inventory-controls">
                  <label className="stack-control">
                    <input
                      type="checkbox"
                      checked={stacked}
                      onChange={(e) => setStacked(e.target.checked)}
                    />
                    Stack
                  </label>
                  <input
                    aria-label="搜索花瓣"
                    placeholder=""
                    value={search}
                    onChange={(ev) => setSearch(ev.target.value)}
                  />
                  <span>
                    {Object.values(save.inventory).reduce((a, b) => a + b, 0)}{' '}
                    片花瓣
                  </span>
                </div>
                <div className="rarity-filters">
                  <button
                    className={rarityFilter === -1 ? 'active' : ''}
                    onClick={() => setRarityFilter(-1)}
                  >
                    全部
                  </button>
                  {RARITIES.slice(0, 8).map((r, i) => (
                    <button
                      key={r.name}
                      className={rarityFilter === i ? 'active' : ''}
                      title={r.name}
                      aria-label={`筛选 ${r.name}`}
                      onClick={() => setRarityFilter(i)}
                      style={{ background: r.color }}
                    />
                  ))}
                </div>
                <div className="inventory-scroll">
                  {inventory.length === 0 ? (
                    <div className="empty-inventory">
                      <Backpack size={42} />
                      <b>{search ? '没有找到这种花瓣' : '这里还没有花瓣'}</b>
                      <p>
                        击败生物，靠近掉落物即可收集。
                        <br />
                        收集后可在这里装备或合成。
                      </p>
                    </div>
                  ) : (
                    <div className="petal-grid">
                      {displayedInventory.map(([key, count], index) => (
                        <Fragment key={key}>
                          {(index === 0 ||
                            (panel === 'craft'
                              ? fromKey(displayedInventory[index - 1][0])
                                  .type !== fromKey(key).type
                              : fromKey(displayedInventory[index - 1][0])
                                  .rarity !== fromKey(key).rarity)) && (
                            <div
                              className="inventory-group"
                              style={{
                                color:
                                  panel === 'craft'
                                    ? '#fff'
                                    : RARITIES[fromKey(key).rarity].color,
                              }}
                            >
                              {panel === 'craft'
                                ? fromKey(key).type
                                : RARITIES[fromKey(key).rarity].name}
                            </div>
                          )}
                          {count === 0 ? (
                            <div className="craft-empty" aria-hidden="true" />
                          ) : (
                            <PetalCard
                              key={key}
                              item={fromKey(key)}
                              gridColumn={
                                panel === 'craft'
                                  ? fromKey(key).rarity + 1
                                  : undefined
                              }
                              count={
                                panel === 'inventory' && !stacked
                                  ? undefined
                                  : count
                              }
                              selected={!!selected && itemKey(selected) === key}
                              onClick={(event) => {
                                if (crafting) return;
                                setSelected(fromKey(key));
                                const all = event.shiftKey;
                                setCraftAll(all);
                                if (panel === 'craft')
                                  setCraftMessage(
                                    'Combine 5 of the same petal to craft an upgrade',
                                  );
                              }}
                              onHover={setHovered}
                            />
                          )}
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
                {panel === 'inventory' && selected && (
                  <footer className="inventory-footer">
                    <span>
                      {RARITIES[selected.rarity].name} {selected.type}
                    </span>
                    <button onClick={absorb}>
                      吸收 1 片 <span>+{5 ** selected.rarity} XP</span>
                    </button>
                  </footer>
                )}
              </>
            )}
            {panel === 'talents' && (
              <>
                <div className="talent-heading">
                  <Dna size={40} />
                  <div>
                    <b>{tp} TP</b>
                    <p>可用天赋点 · Level {save.level}</p>
                  </div>
                </div>
                <div className="talent-reset">
                  {resetPending ? (
                    <>
                      <p id="talent-reset-note">返还全部 TP，额外槽位花瓣放回背包。</p>
                      <button aria-describedby="talent-reset-note" onClick={resetTalents}>Confirm reset</button>
                      <button onClick={() => setResetPending(false)}>Cancel</button>
                    </>
                  ) : (
                    <button disabled={spentTP === 0} onClick={() => setResetPending(true)}>Reset</button>
                  )}
                </div>
                <p className="panel-instruction">
                  升级获得天赋点，定制你的花朵。
                </p>
                <div className="talent-tree" aria-label="天赋树">
                  <svg
                    className="talent-connections"
                    viewBox="0 0 698 635"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {Object.entries(TALENT_POINTS).map(([id, points]) => (
                      <path
                        key={id}
                        d={`M347 570 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')}`}
                      />
                    ))}
                  </svg>
                  {(['rotation', 'loadout', 'health'] as const).map((id) => (
                    <div className={`talent-branch branch-${id}`} key={id}>
                      <h3>
                        {id === 'rotation'
                          ? '旋转速度'
                          : id === 'loadout'
                            ? '花瓣槽位'
                            : '生命强化'}
                      </h3>
                      {Array.from(
                        { length: id === 'loadout' ? 5 : 10 },
                        (_, i) => i,
                      )
                        .reverse()
                        .map((offset) => {
                          const max = id === 'loadout' ? 5 : 10;
                          const current = save.talents[id];
                          const level = offset;
                          const cost =
                            id === 'loadout' ? loadoutCosts[level] : 3;
                          const owned = current > level;
                          return (
                            <button
                              key={level}
                              style={{
                                left: `${(TALENT_POINTS[id][level][0] / 698) * 100}%`,
                                top: `${(TALENT_POINTS[id][level][1] / 635) * 100}%`,
                              }}
                              className={`talent-node ${owned ? 'owned' : ''}`}
                              aria-label={`${id} 等级 ${level + 1}，${owned ? '已解锁' : `${cost} TP`}`}
                              title={`${id === 'rotation' ? '+0.25 rad/s' : id === 'loadout' ? '+1 装备和备用槽' : '生命值 ×1.3'} · ${cost} TP`}
                              disabled={
                                level !== current || tp < cost || current >= max
                              }
                              onClick={() => upgrade(id)}
                            >
                              {id === 'rotation' ? (
                                <RotateCcw />
                              ) : id === 'loadout' ? (
                                <Flower2 />
                              ) : (
                                <span>✚</span>
                              )}
                              <b>{owned ? '✓' : cost}</b>
                              <small>Lv {level + 1}</small>
                            </button>
                          );
                        })}
                    </div>
                  ))}
                  <div className="talent-root">
                    <Sprite type="Flower" size={70} />
                  </div>
                </div>
                <p className="talent-footnote">
                  等级尾数为 5 时获得 2 TP，尾数为 0 时获得 10 TP，其余等级获得
                  1 TP。
                </p>
              </>
            )}
          </section>
        )}
        {inspect && assetsReady && (
          <aside className={`petal-tooltip ${panel ? 'by-panel' : ''}`}>
            <div className="tooltip-heading">
              <Sprite type={inspect.type} size={54} />
              <div>
                <h3>{inspect.type}</h3>
                <span style={{ color: RARITIES[inspect.rarity].color }}>
                  {RARITIES[inspect.rarity].name}
                </span>
              </div>
            </div>
            <p>{PETALS[inspect.type].description}</p>
            <dl>
              <div>
                <dt>伤害</dt>
                <dd>{stat(inspect).damage.toLocaleString()}</dd>
              </div>
              <div>
                <dt>耐久</dt>
                <dd>{stat(inspect).hp.toLocaleString()}</dd>
              </div>
              <div>
                <dt>重载</dt>
                <dd>{stat(inspect).reload} s</dd>
              </div>
              {stat(inspect).heal > 0 && (
                <div>
                  <dt>{inspect.type === 'Leaf' ? '每秒回复' : '回复生命'}</dt>
                  <dd>{Number(stat(inspect).heal.toFixed(1))}</dd>
                </div>
              )}
            </dl>
            {panel === 'inventory' && <small>点击选择 · 拖动装备</small>}
          </aside>
        )}
        {toast && <output className="game-toast">{toast}</output>}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="game-dialog settings-dialog">
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>调整花园里的操作与显示。</DialogDescription>
            <div className="setting-row">
              <span>
                <MousePointer2 size={19} /> 鼠标跟随移动
                <small>WASD / 方向键始终可用</small>
              </span>
              <Switch
                checked={settings.mouse}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, mouse: v }))
                }
                aria-label="鼠标跟随移动"
              />
            </div>
            {(
              [
                {
                  key: 'sound',
                  label: '游戏音效',
                  icon: settings.sound ? (
                    <Volume2 size={19} />
                  ) : (
                    <VolumeX size={19} />
                  ),
                },
                {
                  key: 'names',
                  label: '显示生物名称',
                  icon: <BookOpen size={19} />,
                },
                { key: 'damage', label: '显示伤害数字', icon: <span>✦</span> },
                { key: 'particles', label: '粒子效果', icon: <span>✧</span> },
              ] as const
            ).map((row) => (
              <div className="setting-row" key={row.key}>
                <span>
                  {row.icon}
                  {row.label}
                </span>
                <Switch
                  checked={settings[row.key]}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({ ...s, [row.key]: v }))
                  }
                  aria-label={row.label}
                />
              </div>
            ))}
            <div className="setting-row">
              <span>
                Debug mode
                <small>
                  Stock all 16 Super petals to ×500. Existing extras are kept.
                </small>
              </span>
              <Switch
                aria-label="Debug mode"
                checked={!!save.debug}
                onCheckedChange={(enabled) => {
                  engine.current?.setDebug(enabled);
                  saveNow();
                  if (enabled) notify('Debug: all Super petals ×500');
                }}
              />
            </div>
            {save.debug && (
              <button
                className="dialog-action"
                onClick={() => {
                  engine.current?.refillSuperPetals();
                  saveNow();
                  notify('Super petals restocked to ×500');
                }}
              >
                Restock Super petals ×500
              </button>
            )}
            <div className="zoom-setting">
              <span>
                <Maximize size={18} />
                视野缩放 <b>{Math.round(settings.zoom * 100)}%</b>
              </span>
              <Slider
                min={0.6}
                max={1.4}
                step={0.05}
                value={[settings.zoom]}
                onValueChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    zoom: Array.isArray(v) ? v[0] : v,
                  }))
                }
                aria-label="视野缩放"
              />
            </div>
            <button
              className="dialog-action"
              onClick={() => {
                setSettingsOpen(false);
                setHelpOpen(true);
              }}
            >
              <Keyboard size={18} />
              查看键位
            </button>
            {state !== 'lobby' && (
              <button
                className="dialog-action"
                onClick={() => {
                  if (engine.current) {
                    engine.current.state = 'lobby';
                    engine.current.paused = false;
                  }
                  saveNow();
                  setState('lobby');
                  setSettingsOpen(false);
                  setPanel(null);
                }}
              >
                <HomeIcon size={18} />
                保存并返回大厅
              </button>
            )}
            <button
              className="about-link"
              onClick={() => {
                setSettingsOpen(false);
                setAboutOpen(true);
              }}
            >
              素材与数值说明
            </button>
          </DialogContent>
        </Dialog>
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className="game-dialog map-dialog">
            <DialogTitle>世界地图</DialogTitle>
            <DialogDescription>
              向右探索，稀有度与危险也会逐步提高。
            </DialogDescription>
            <div className="biome-buttons">
              {Object.entries(BIOMES).map(([key, b]) => (
                <button
                  className={save.biome === key ? 'active' : ''}
                  key={key}
                  onClick={() => {
                    engine.current?.setBiome(key as Biome);
                    saveNow();
                    setMapOpen(false);
                    notify(`已抵达${b.zh}`);
                  }}
                >
                  {b.zh}
                  <small>{key}</small>
                </button>
              ))}
            </div>
            <canvas className="big-map" ref={bigMap} width={580} height={340} />
            <div className="map-legend">
              {RARITIES.slice(0, 6).map((r) => (
                <span key={r.name}>
                  <i style={{ background: r.color }} />
                  {r.zh}
                </span>
              ))}
            </div>
            <small>黄色圆点是你的位置。切换区域会回到该区域的起点。</small>
          </DialogContent>
        </Dialog>
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="game-dialog help-dialog">
            <DialogTitle>在花园里生存</DialogTitle>
            <DialogDescription>
              花瓣会自动旋转。让花瓣接触生物，而不是你的花朵。
            </DialogDescription>
            <div className="controls-table">
              {[
                ['移动', '鼠标 / WASD / 方向键'],
                ['进攻 · 展开花瓣', '鼠标左键 / Space'],
                ['防御 · 收回花瓣', '鼠标右键 / Shift'],
                ['背包 / 天赋 / 合成', 'Z / X / C'],
                ['单槽主备互换', '1–9 / 0'],
                ['整排主备互换', 'R'],
                ['地图', 'M'],
                ['设置 / 关闭面板', 'Esc'],
              ].map(([a, b]) => (
                <div key={a}>
                  <span>{a}</span>
                  <kbd>{b}</kbd>
                </div>
              ))}
            </div>
            <p>
              花瓣损坏后会自动重载。Rose 在受伤时收回并治疗；Leaf
              持续回血。死亡保留花瓣与等级，复活后继续探索。
            </p>
            <button
              className="dialog-action"
              onClick={() => setHelpOpen(false)}
            >
              明白了，去探索 <ChevronRight size={18} />
            </button>
          </DialogContent>
        </Dialog>
        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="game-dialog about-dialog">
            <DialogTitle>Petal Garden</DialogTitle>
            <DialogDescription>florr.io 非官方单机二次创作</DialogDescription>
            <p>
              界面参考 florr.io 游客版。花瓣与生物图片来自 Florr.io Community
              Wiki，原游戏及其素材归各自权利人所有。本作品不连接原版服务器。
            </p>
            <p>
              已按 Wiki
              核对主要花瓣的伤害、耐久、重载、稀有度倍率和五合一概率。移动速度、地图、刷新与掉率、经验曲线及部分天赋属于本地模拟；Wiki
              中有冲突的数据已记录，尚未做到全机制、全数值一致。
            </p>
            <div className="source-links">
              <a href="https://florr.io" target="_blank" rel="noreferrer">
                原版 florr.io <ExternalLink size={14} />
              </a>
              <a
                href="https://official-florrio.fandom.com/wiki/Petals"
                target="_blank"
                rel="noreferrer"
              >
                花瓣 Wiki <ExternalLink size={14} />
              </a>
              <a href="/SOURCES.md" target="_blank">
                素材与数据来源 <ExternalLink size={14} />
              </a>
            </div>
            <small>进度保存在当前浏览器中。</small>
          </DialogContent>
        </Dialog>
        <Dialog open={state === 'dead'} onOpenChange={() => {}}>
          <DialogContent
            className="game-dialog death-dialog"
            showCloseButton={false}
          >
            <Sprite type="Flower" size={90} />
            <DialogTitle>这次冒险结束了</DialogTitle>
            <DialogDescription>
              花瓣和等级已保留，再试一次吧。
            </DialogDescription>
            <div className="death-stats">
              <div>
                <b>{deathStats.kills}</b>
                <span>击败生物</span>
              </div>
              <div>
                <b>{deathStats.xp}</b>
                <span>获得经验</span>
              </div>
            </div>
            <button
              className="play-button"
              onClick={() => {
                engine.current?.start();
                setState('playing');
                setPanel(null);
                mouse.current.active = false;
                saveNow();
              }}
            >
              重新绽放 <Play size={18} fill="currentColor" />
            </button>
            <button
              className="about-link"
              onClick={() => {
                if (engine.current) engine.current.state = 'lobby';
                setState('lobby');
                setPanel(null);
              }}
            >
              返回大厅
            </button>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
