/** Original Wiki images are kept byte-for-byte. Crop/key card backgrounds once
 * during decode; cache a compact transparent display surface, never per frame. */
export type SpriteInfo = {
  src: string;
  bbox: number[];
  width: number;
  height: number;
  card?: boolean;
  customCrop?: boolean;
  mask?: { circle: number[]; rects?: number[][] };
  rotation?: number;
  source?: string;
};
export type PreparedSprite = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  rotation: number;
};
export const preparedSprites: Record<string, PreparedSprite> = {};
export const spriteManifest: Record<string, SpriteInfo> = {};
/** Preserve the visible occupancy of the Wiki's uncropped thumbnail frame. */
export function petalThumbnailSize(key: string, frameSize: number) {
  const info = spriteManifest[key];
  if (!info) return frameSize * 0.5;
  const [left, top, right, bottom] = info.bbox;
  return frameSize * Math.max(right - left, bottom - top) /
    Math.max(info.width, info.height);
}
/** Orbit petals are 30% smaller; thumbnail sizes and explicit display sizes stay unchanged. */
export function petalWorldSize(key: string, basicSize = 15.75) {
  const basicOccupancy = petalThumbnailSize('Basic', 1);
  return petalThumbnailSize(key, basicSize / basicOccupancy);
}
let loading: Promise<void> | undefined;
export function loadSprites() {
  return (loading ??= (async () => {
    const response = await fetch('/assets/manifest.json');
    if (!response.ok) throw Error('Sprite manifest unavailable');
    Object.assign(spriteManifest, await response.json());
    await Promise.all(
      Object.entries(spriteManifest).map(async ([key, info]) => {
        const img = new Image();
        img.src = info.src;
        await img.decode();
        preparedSprites[key] = prepare(img, info);
      }),
    );
  })());
}
function prepare(img: HTMLImageElement, info: SpriteInfo): PreparedSprite {
  const surface = document.createElement('canvas');
  const ctx = surface.getContext('2d', { willReadFrequently: !!info.card })!;
  let [l, t, r, b] = info.bbox;
  if (info.card && !info.customCrop) {
    l = Math.round(img.width * 0.13);
    t = Math.round(img.height * 0.13);
    r = Math.round(img.width * 0.87);
    b = Math.round(img.height * 0.87);
  }
  const down = Math.min(1, 320 / Math.max(r - l, b - t));
  surface.width = Math.ceil((r - l) * down);
  surface.height = Math.ceil((b - t) * down);
  ctx.drawImage(img, l, t, r - l, b - t, 0, 0, surface.width, surface.height);
  if (info.card) {
    const data = ctx.getImageData(0, 0, surface.width, surface.height),
      px = data.data,
      w = surface.width,
      h = surface.height;
    const bg = info.customCrop ? [255, 255, 255] : [px[0], px[1], px[2]];
    const seen = new Uint8Array(w * h),
      queue = new Int32Array(w * h);
    let head = 0,
      tail = 0;
    const visit = (p: number) => {
      if (p < 0 || p >= w * h || seen[p]) return;
      seen[p] = 1;
      const i = p * 4;
      if (
        Math.abs(px[i] - bg[0]) <= 18 &&
        Math.abs(px[i + 1] - bg[1]) <= 18 &&
        Math.abs(px[i + 2] - bg[2]) <= 18
      ) {
        queue[tail++] = p;
        px[i + 3] = 0;
      }
    };
    for (let x = 0; x < w; x++) {
      visit(x);
      visit((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      visit(y * w);
      visit(y * w + w - 1);
    }
    while (head < tail) {
      const p = queue[head++];
      if (p % w) visit(p - 1);
      if (p % w < w - 1) visit(p + 1);
      visit(p - w);
      visit(p + w);
    }
    if (info.mask) {
      const [cx, cy, rad] = info.mask.circle;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const sx = x / down + l,
            sy = y / down + t;
          const inside =
            (sx - cx) ** 2 + (sy - cy) ** 2 <= rad ** 2 ||
            (info.mask.rects ?? []).some(
              ([a, b, c, d]) => sx >= a && sx <= c && sy >= b && sy <= d,
            );
          if (!inside) px[(y * w + x) * 4 + 3] = 0;
        }
    }
    ctx.putImageData(data, 0, 0);
    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (px[(y * w + x) * 4 + 3]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
    if (maxX > minX) {
      const crop = document.createElement('canvas');
      crop.width = maxX - minX + 3;
      crop.height = maxY - minY + 3;
      crop
        .getContext('2d')!
        .drawImage(
          surface,
          minX,
          minY,
          maxX - minX + 1,
          maxY - minY + 1,
          1,
          1,
          maxX - minX + 1,
          maxY - minY + 1,
        );
      return {
        canvas: crop,
        width: crop.width,
        height: crop.height,
        rotation: info.rotation ?? 0,
      };
    }
  }
  return {
    canvas: surface,
    width: surface.width,
    height: surface.height,
    rotation: info.rotation ?? 0,
  };
}
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  angle = 0,
) {
  const s = preparedSprites[key];
  if (!s) return false;
  const scale = size / Math.max(s.width, s.height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + s.rotation);
  ctx.drawImage(
    s.canvas,
    (-s.width * scale) / 2,
    (-s.height * scale) / 2,
    s.width * scale,
    s.height * scale,
  );
  ctx.restore();
  return true;
}
