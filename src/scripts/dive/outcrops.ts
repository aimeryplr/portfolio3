import { mix, rgb, scale, smooth, type RGB } from "./palette.ts";
import { ROCK, drawCoral, makeCoral, pick, reefColor, reseed, rnd, torchAt, type Coral, type CoralType, type P } from "./reef.ts";
import { diver, drawDiver } from "./diver.ts";
import { drawLantern, lantern, lanternAt, warm } from "./lantern.ts";
import { ctx, stage, tri, waterAtY } from "./stage.ts";

// A seabed under the contact section ([data-seabed]) that spans the whole width,
// with an old anchor and amphoras lying on its banks, and a lantern still burning under the form.
// Same low-poly facets as the reef wall, in page coordinates. It sits right next to the content,
// so the water is allowed to dim it less than the wall: colour is absorbed as if no deeper than SHALLOW.

type Facet = [P, P, P, RGB, number, number]; // triangle, base colour, shade, centre y for culling

const SAND: RGB[] = [[150, 140, 108], [138, 126, 98], [160, 148, 116]];
const IRON: RGB = [128, 96, 76];
const CLAY: RGB = [204, 116, 74];

const SHALLOW = 9;

const facets: Facet[] = [];
const corals: { c: Coral; dir: number }[] = [];

const face = (a: P, b: P, c: P, base: RGB, s: number) => facets.push([a, b, c, base, s, (a[1] + b[1] + c[1]) / 3]);

// rotate and scale a local shape point into the page
const placer = (x: number, y: number, angle: number, size: number) => {
  const cs = Math.cos(angle), sn = Math.sin(angle);
  return ([px, py]: P): P => [x + (px * cs - py * sn) * size, y + (px * sn + py * cs) * size];
};

// a band of facets along a centreline, lit side and shadow side
function strip(line: P[], w: number, at: (p: P) => P, base: RGB) {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const l = Math.hypot(bx - ax, by - ay) || 1, nx = (-(by - ay) / l) * w, ny = ((bx - ax) / l) * w;
    const a1: P = [ax + nx, ay + ny], a2: P = [ax - nx, ay - ny], b1: P = [bx + nx, by + ny], b2: P = [bx - nx, by - ny];
    face(at(a1), at(b1), at([ax, ay]), base, 0.8);
    face(at([ax, ay]), at(b1), at([bx, by]), base, 0.86);
    face(at([ax, ay]), at([bx, by]), at(a2), base, 1.05);
    face(at(a2), at([bx, by]), at(b2), base, 1.12);
  }
}

// a low faceted hump of rock: ridge, shoulder, buried base, turned to lie along the slope
function mound(cx: number, by: number, w: number, h: number, angle: number) {
  const n = 5, at = placer(cx, by, angle, 1);
  const rows = [1, 0.45, -0.25].map((f, r) =>
    Array.from({ length: n + 1 }, (_, k): P => {
      const x = cx - w / 2 + (k * w) / n + (k && k < n ? rnd(-0.12, 0.12) * (w / n) : 0);
      return at([x - cx, -h * f * Math.sin((Math.PI * k) / n) * (r < 2 ? rnd(0.8, 1.1) : 1) + (r === 2 ? 6 : 0)]);
    }),
  );
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < n; k++) {
      const col = pick(ROCK), s = (r ? 0.72 : 1.02) + (k < n / 2 ? 0.06 : -0.06);
      face(rows[r][k], rows[r][k + 1], rows[r + 1][k], col, s * rnd(0.9, 1.05));
      face(rows[r][k + 1], rows[r + 1][k + 1], rows[r + 1][k], col, s * rnd(0.82, 0.98));
    }
}

const coralAt = (x: number, y: number, dir: number, size: number, tilt: number, types: CoralType[]) => {
  const t = pick(types);
  corals.push({ c: { ...makeCoral(t, t === "dome" ? size * 0.8 : size), x, y, tilt }, dir });
};

function anchor(x: number, y: number, size: number, angle: number) {
  const at = placer(x, y, angle, size);
  strip([[0, 0], [0, -1]], 0.05, at, IRON);
  strip([[-0.32, -0.84], [0.32, -0.84]], 0.035, at, IRON);
  const ring = Array.from({ length: 7 }, (_, k): P => [Math.sin((k * Math.PI) / 3) * 0.09, -1.09 + Math.cos((k * Math.PI) / 3) * 0.09]);
  strip(ring, 0.025, at, IRON);
  for (const m of [1, -1]) {
    strip([[0, -0.02], [-0.2 * m, 0], [-0.38 * m, -0.12], [-0.47 * m, -0.32]], 0.05, at, IRON);
    face(at([-0.52 * m, -0.46]), at([-0.6 * m, -0.24]), at([-0.37 * m, -0.28]), IRON, m > 0 ? 1.08 : 0.8);
  }
}

function amphora(x: number, y: number, size: number, angle: number) {
  const at = placer(x, y, angle, size);
  const prof: P[] = [[0, 0], [0.12, -0.05], [0.26, -0.25], [0.28, -0.45], [0.2, -0.65], [0.09, -0.78], [0.07, -0.92], [0.11, -0.98]];
  for (let i = 0; i < prof.length - 1; i++) {
    const [w0, y0] = prof[i], [w1, y1] = prof[i + 1];
    face(at([-w0, y0]), at([0, y0]), at([-w1, y1]), CLAY, 0.72);
    face(at([0, y0]), at([0, y1]), at([-w1, y1]), CLAY, 0.78);
    face(at([0, y0]), at([w0, y0]), at([0, y1]), CLAY, 1.02);
    face(at([w0, y0]), at([w1, y1]), at([0, y1]), CLAY, 1.1);
  }
  for (const m of [1, -1]) strip([[0.07 * m, -0.9], [0.21 * m, -0.87], [0.23 * m, -0.7]], 0.025, at, CLAY);
}

// the floor of the dive: flat under the form, rising into banks out to both screen edges
function seabed(el: HTMLElement) {
  const { W } = stage;
  const r = el.getBoundingClientRect(), top = r.top + scrollY, bottom = r.bottom + scrollY;
  const card = el.querySelector("[data-card]")?.getBoundingClientRect();
  const cl = card ? card.left - 30 : W / 2, cr = card ? card.right + 30 : W / 2;
  const bankH = Math.min(300, (bottom - top) * 0.55);
  const floor = bottom - 26, base = bottom + 40;
  const STEP = 60;
  // a diver standing on the sand beside the form, on whichever side has more room.
  // the sand stays flat out past their fins, and only then rises into the bank
  let fl = cl, fr = cr;
  diver.on = false;
  // keeps a little distance from the form rather than leaning on it
  const GAP = 70;
  const roomR = W - cr - 20 - GAP, roomL = cl - 20 - GAP;
  const size = Math.min(460, (bottom - top) * 0.8, Math.max(roomR, roomL) / 0.5);
  if (size >= 180) {
    // the body is not centred in its own width: the waving arm reaches further out than the still one
    const x = roomR >= roomL ? cr + GAP + size * 0.19 : cl - GAP - size * 0.3;
    Object.assign(diver, { on: true, x, size });
    if (roomR >= roomL) fr = x + size * 0.2;
    else fl = x - size * 0.2;
  }
  const bank = (x: number) => smooth(0, 320, Math.max(fl - x, x - fr, 0));
  // the surface of the sand, exactly as the top row draws it, so whatever stands on it touches it
  const n = Math.ceil((W + 80) / STEP) + 2;
  const surface = Array.from({ length: n }, (_, i) => floor - bankH * bank(-40 + i * STEP) * rnd(0.85, 1.05) - rnd(0, 10));
  const yAt = (x: number) => {
    const f = (x + 40) / STEP, i = Math.max(0, Math.min(n - 2, Math.floor(f)));
    return surface[i] + (surface[i + 1] - surface[i]) * (f - i);
  };
  // the angle of the ground under x: turning by it makes the slope's normal the new "up"
  const slopeAt = (x: number) => Math.atan2(yAt(x + 4) - yAt(x - 4), 8);
  // horizontal layers of sand, each row's vertices staggered half a step from the one above,
  // so the facets are long and flat with no seam running down through them
  const rows = [0, 0.16, 0.38, 0.66, 1].map((f, r) => {
    const count = Math.ceil((W + 80) / STEP) + 2;
    return Array.from({ length: count }, (_, i): P => {
      const x = -40 + (i - (r % 2) * 0.5) * STEP + (r && i ? rnd(-0.18, 0.18) * STEP : 0);
      const top = yAt(x);
      return [x, top + (base - top) * f + (r && r < 4 ? rnd(-5, 5) : 0)];
    });
  });
  const shade = [1.02, 0.9, 0.8, 0.72];
  for (let r = 0; r < rows.length - 1; r++) {
    const up = rows[r], down = rows[r + 1];
    let i = 0, j = 0;
    // zip the two rows together, always advancing the one whose next vertex comes first
    while (i < up.length - 1 || j < down.length - 1) {
      const stepUp = j >= down.length - 1 || (i < up.length - 1 && up[i + 1][0] <= down[j + 1][0]);
      const col = pick(SAND);
      if (stepUp) {
        const slope = (up[i + 1][1] - up[i][1]) / (up[i + 1][0] - up[i][0] || 1);
        face(up[i], up[i + 1], down[j], col, (shade[r] - slope * 0.35) * rnd(0.95, 1.04));
        i++;
      } else {
        face(up[i], down[j + 1], down[j], col, shade[r] * 0.94 * rnd(0.95, 1.04));
        j++;
      }
    }
  }
  // rocks and corals scattered on the banks, thicker towards the edges
  for (let x = 20; x < W - 20; x += rnd(50, 90)) {
    const b = bank(x);
    if (b < 0.15) continue;
    // sunk a little into the sand so the base never shows daylight under it
    if (rnd(0, 1) < 0.35) mound(x, yAt(x) + 6, rnd(50, 90), rnd(16, 30) * b, slopeAt(x));
    else coralAt(x, yAt(x) + 5, x < W / 2 ? 1 : -1, rnd(28, 62) * (0.5 + b * 0.5), slopeAt(x), ["branch", "fan", "fan", "soft", "dome", "tube"]);
  }
  // fins pressed into the sand, never hanging over a dip
  if (diver.on) {
    const half = diver.size * 0.15;
    diver.y = Math.max(yAt(diver.x - half), yAt(diver.x), yAt(diver.x + half)) + 4;
  }
  // the lantern, set down on the flat sand under the form, a little right of its middle
  lantern.on = !!card;
  if (card) {
    lantern.x = (cl + cr) / 2 + (cr - cl) * 0.2;
    lantern.y = yAt(lantern.x) + 3;
  }
  // wreckage of past dives, only where there is room beside the form and the diver
  const lx = fl - (fl < cl ? 110 : 170), rx = fr + (fr > cr ? 110 : 170);
  if (lx > 70) anchor(lx, yAt(lx) + 8, Math.min(110, bankH * 0.6), -0.55);
  if (rx < W - 70) {
    amphora(rx, yAt(rx) + 10, 70, -1.35);
    amphora(rx + 62, yAt(rx + 62) + 12, 54, 1.2);
  }
}

export function buildOutcrops() {
  reseed(31);
  facets.length = 0;
  corals.length = 0;
  const bed = document.querySelector<HTMLElement>("[data-seabed]");
  if (bed) seabed(bed);
}

// draws in page coordinates: call inside the scroll translate
export function drawOutcrops(time: number) {
  const g = ctx();
  const top = scrollY - 160, bottom = scrollY + stage.H + 160;
  g.lineWidth = 1;
  for (const [a, b, c, base, sh, cy] of facets) {
    if (cy < top || cy > bottom) continue;
    const fx = (a[0] + b[0] + c[0]) / 3, l = torchAt(fx, cy) * 0.85, w = lanternAt(fx, cy, time) * 0.8;
    const k = 0.78 + l * 0.22;
    const col = mix(waterAtY(cy - scrollY), scale(reefColor(base, cy, l, SHALLOW), sh * (1 + l * 0.4)), k);
    tri(a, b, c, rgb(w ? warm(col, w) : col));
  }
  for (const { c, dir } of corals) if (c.y >= top && c.y <= bottom) drawCoral(c, dir, time, 0.8, SHALLOW);
  if (lantern.on && lantern.y - lantern.size * 5 <= bottom && lantern.y + lantern.size * 5 >= top) {
    // held as bright as the diver: it sits by the content, and its own flame lights it
    const wc = waterAtY(lantern.y - scrollY);
    drawLantern(time, (c) => mix(wc, reefColor(c, lantern.y, 0.5, SHALLOW), 0.88));
  }
  if (diver.on && diver.y >= top && diver.y - diver.size <= bottom) {
    // absorbed like the sand around him, so he belongs to the same depth, but held a little brighter than it
    const cy = diver.y - diver.size / 2, l = torchAt(diver.x, cy) * 0.85, k = 0.86 + l * 0.14, wc = waterAtY(cy - scrollY);
    drawDiver(time, (c, alpha) => rgb(mix(wc, scale(reefColor(c, cy, l, SHALLOW), 1.3 + l * 0.4), k), alpha));
  }
}
