import { rgb, type RGB } from "./palette.ts";
import { ctx, tri } from "./stage.ts";

// An old brass diving lantern resting on the sand under the contact form, its flame still burning orange.
// Model space: 1 unit is its height, (0, 0) the sand under its foot, up is -y.

export const lantern = { on: false, x: 0, y: 0, size: 56, tilt: 0.12 };

const BRASS: RGB = [200, 146, 70];
const DARK: RGB = [112, 74, 36];
const CAGE: RGB = [52, 38, 26];
const GLASS_Y = -0.39;

// the flame's strength: a slow breath with a quick, uneven flutter on top
const flame = (time: number) =>
  0.85 + 0.1 * Math.sin(time * 1.7) + 0.05 * Math.sin(time * 7.3 + Math.sin(time * 2.1) * 2);

// how much of its light reaches a page point, 0..1; squashed vertically so it pools along the sand
export function lanternAt(px: number, py: number, time: number) {
  if (!lantern.on) return 0;
  const cy = lantern.y + GLASS_Y * lantern.size;
  const d = Math.hypot(px - lantern.x, (py - cy) * 1.6) / (lantern.size * 6);
  return Math.max(0, 1 - d) ** 1.6 * flame(time);
}

// a colour lit by the flame: red and green come back first, as under a real lamp
export const warm = (c: RGB, l: number): RGB => [c[0] + 150 * l, c[1] + 72 * l, c[2] + 18 * l];

// draws in page coordinates; tone applies the water's absorption to a base colour
export function drawLantern(time: number, tone: (c: RGB) => RGB) {
  const g = ctx();
  const { x, y, size: s, tilt } = lantern;
  const f = flame(time);
  const cx = x - Math.sin(tilt) * GLASS_Y * s, cy = y + Math.cos(tilt) * GLASS_Y * s;

  // the light spilling into the water and onto the sand
  g.save();
  g.globalCompositeOperation = "lighter";
  const R = s * 5 * f;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, `rgba(255,160,70,${0.6 * f})`);
  grad.addColorStop(0.3, `rgba(255,115,35,${0.2 * f})`);
  grad.addColorStop(1, "rgba(255,100,30,0)");
  g.fillStyle = grad;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();

  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.scale(s, s);
  g.lineWidth = 1 / s;
  // brass catches the flame most where it sits closest to the glass
  const paint = (c: RGB, shade: number, l: number) =>
    rgb(warm(tone([c[0] * shade, c[1] * shade, c[2] * shade]), l * f));

  // glass: a bulging hexagon, hot in the middle
  const glass = g.createRadialGradient(0, GLASS_Y, 0, 0, GLASS_Y, 0.22);
  glass.addColorStop(0, `rgba(255,214,140,${0.9 * f})`);
  glass.addColorStop(1, `rgba(230,110,40,${0.55 * f})`);
  g.fillStyle = glass;
  g.beginPath();
  for (const [px, py] of [[-0.14, -0.12], [-0.17, GLASS_Y], [-0.14, -0.66], [0.14, -0.66], [0.17, GLASS_Y], [0.14, -0.12]])
    g.lineTo(px, py);
  g.closePath();
  g.fill();
  // the flame, licking a little higher on each flutter
  g.globalCompositeOperation = "lighter";
  tri([0, -0.22], [0.045, -0.36], [0, -0.46 - (f - 0.85) * 0.6], `rgba(255,236,170,${f})`);
  tri([0, -0.22], [-0.045, -0.36], [0, -0.46 - (f - 0.85) * 0.6], `rgba(255,200,110,${f})`);
  g.globalCompositeOperation = "source-over";

  // cage bars, dark against the glow behind them, and the ring around its waist
  g.strokeStyle = paint(CAGE, 1, 0.15);
  g.lineWidth = 0.026;
  for (const bx of [-0.15, -0.05, 0.05, 0.15]) {
    g.beginPath();
    g.moveTo(bx * 0.95, -0.14);
    g.quadraticCurveTo(bx * 1.25, GLASS_Y, bx * 0.95, -0.64);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-0.18, GLASS_Y);
  g.lineTo(0.18, GLASS_Y);
  g.stroke();

  // foot and bands: left facets in shadow, right ones lit
  g.lineWidth = 1 / s;
  const box = (x0: number, x1: number, y0: number, y1: number, inset: number, c: RGB, l: number) => {
    const m = (x0 + x1) / 2;
    tri([x0, y0], [m, y0], [x0 + inset, y1], paint(c, 0.72, l));
    tri([m, y0], [m, y1], [x0 + inset, y1], paint(c, 0.8, l));
    tri([m, y0], [x1, y0], [m, y1], paint(c, 1.02, l));
    tri([x1, y0], [x1 - inset, y1], [m, y1], paint(c, 1.1, l));
  };
  box(-0.21, 0.21, 0, -0.1, 0.03, DARK, 0.2);
  box(-0.18, 0.18, -0.1, -0.15, 0, BRASS, 0.45);
  box(-0.18, 0.18, -0.62, -0.69, 0, BRASS, 0.45);
  // cap and chimney
  box(-0.18, 0.18, -0.69, -0.8, 0.08, BRASS, 0.25);
  box(-0.07, 0.07, -0.8, -0.86, 0.01, DARK, 0.1);
  // the carrying handle
  g.strokeStyle = paint(BRASS, 0.9, 0.12);
  g.lineWidth = 0.03;
  g.beginPath();
  g.moveTo(-0.13, -0.78);
  g.quadraticCurveTo(0, -1.12, 0.13, -0.78);
  g.stroke();
  g.restore();
}
