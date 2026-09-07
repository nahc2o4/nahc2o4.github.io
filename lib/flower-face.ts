import { drawSprite } from './sprite-loader.ts';
export type FaceState = {
  gazeX: number;
  gazeY: number;
  attack: number;
  defend: number;
};
export const createFace = (): FaceState => ({
  gazeX: 0,
  gazeY: 0,
  attack: 0,
  defend: 0,
});
export function updateFace(
  face: FaceState,
  mode: string,
  input: { x: number; y: number },
  dt: number,
) {
  const blend = -Math.expm1(-12 * Math.max(0, Math.min(dt, 0.1)));
  const length = Math.hypot(input.x, input.y);
  const x = length ? input.x / Math.max(1, length) : 0;
  const y = length ? input.y / Math.max(1, length) : 0;
  face.gazeX += (x - face.gazeX) * blend;
  face.gazeY += (y - face.gazeY) * blend;
  face.attack += ((mode === 'attack' ? 1 : 0) - face.attack) * blend;
  face.defend += ((mode === 'defend' ? 1 : 0) - face.defend) * blend;
  return face;
}
export function drawFlowerFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  face: FaceState,
  time = 0,
) {
  drawSprite(ctx, 'Flower', x, y, r * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  // Keep the original Wiki silhouette; replace only its flat-yellow face interior.
  ctx.fillStyle = '#ffe763';
  ctx.beginPath();
  ctx.ellipse(0, 0.03, 0.66, 0.64, 0, 0, Math.PI * 2);
  ctx.fill();
  const blinkPhase = time % 5.7;
  const blink =
    blinkPhase > 5.52 ? Math.sin(((blinkPhase - 5.52) / 0.18) * Math.PI) : 0;
  const eyeHeight = Math.max(0.025, 0.245 * (1 - 0.92 * blink));
  for (const side of [-1, 1]) {
    const ex = side * 0.26 + face.gazeX * 0.035,
      ey = -0.19 + face.gazeY * 0.025;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.fillStyle = '#080a08';
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.12, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.12, eyeHeight, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(
      // Cancel the resting right bias when looking left; keep neutral/right unchanged.
      0.045 + face.gazeX * (face.gazeX < 0 ? 0.138 : 0.048),
      face.gazeY * 0.065,
      0.06,
      Math.max(0.01, eyeHeight * 0.46),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  ctx.strokeStyle = '#11150d';
  ctx.lineWidth = 0.06;
  ctx.lineCap = 'round';
  const half = 0.225,
    mouthY = 0.38;
  ctx.beginPath();
  ctx.moveTo(-half, mouthY);
  ctx.quadraticCurveTo(
    0,
    mouthY + 0.2 - 0.37 * face.attack - 0.23 * face.defend,
    half,
    mouthY,
  );
  ctx.stroke();
  ctx.restore();
}
