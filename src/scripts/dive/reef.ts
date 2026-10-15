import { mix, rgb, scale, smooth, type RGB } from "./palette.ts";
import { MAX_DEPTH, ctx, mouse, stage, tri, waterAtY, yAtMeters } from "./stage.ts";

// Reef wall: low-poly rock down both page edges with corals on its rim, from the surface to 18 m.
// It lives in page coordinates like the creatures. Water eats the reds first with depth,
// and the cursor is a dive torch that brings them back.

export type P = [number, number];
export type CoralType = "branch" | "fan" | "dome" | "soft" | "tube";

export interface Coral {
  type: CoralType;
  size: number;
  tris: [P, P, P, number][];
  fronds: { a: number; l: number; s: number; sh: number }[];
  base: RGB;
  s: number;
  sway: boolean;
  tilt?: number; // radians, to stand along a slope's normal instead of straight up
  x: number;
  y: number;
}

interface Side {
  dir: 1 | -1;
  edge: number[];
  rock: [P, P, P, RGB, number, number][];
  corals: Coral[];
}

const STEP = 56;
export const ROCK: RGB[] = [[92, 84, 78], [92, 84, 78], [92, 84, 78], [84, 94, 74], [100, 82, 98]];
const CORALS: Record<CoralType, RGB[]> = {
  branch: [[236, 122, 84], [176, 112, 204], [232, 168, 96]],
  fan: [[214, 64, 76], [232, 192, 74], [168, 84, 168]],
  dome: [[196, 170, 96], [150, 172, 92], [210, 140, 110]],
  soft: [[242, 150, 184], [250, 192, 120], [140, 210, 190]],
  tube: [[150, 92, 192], [92, 142, 204], [220, 120, 80]],
};

export const reef = { y0: 0, sides: [] as Side[] };

// seeded so a rebuild after a page height change keeps the same reef
let seed = 1;
export const reseed = (n: number) => (seed = n);
export const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
export const rnd = (a: number, b: number) => a + random() * (b - a);
export const pick = <T>(a: T[]) => a[(random() * a.length) | 0];

export const metersAtY = (y: number) => Math.max(0, Math.min(MAX_DEPTH, ((y - stage.H * 0.5) / stage.maxS) * MAX_DEPTH));

// coral model: base on the wall at the origin, +x grows away from the wall, -y is up
export function makeCoral(type: CoralType, size: number): Omit<Coral, "x" | "y"> {
  const tris: Coral["tris"] = [];
  const fronds: Coral["fronds"] = [];
  if (type === "branch") {
    const spike = (ox: number, oy: number, a: number, l: number, w: number, s: number) => {
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      tris.push([[ox + nx, oy + ny], [ox - nx, oy - ny], [ox + Math.cos(a) * l, oy + Math.sin(a) * l], s]);
    };
    const n = 3 + ((random() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const ang = -1.35 + (k * 1.1) / (n - 1) + rnd(-0.1, 0.1), len = rnd(0.6, 1), sh = rnd(0.8, 1.15);
      spike(0, 0, ang, len, 0.07, sh);
      spike(Math.cos(ang) * len * 0.45, Math.sin(ang) * len * 0.45, ang + (random() < 0.5 ? -0.55 : 0.55), len * 0.45, 0.045, sh * 0.85);
    }
  } else if (type === "fan") {
    let prev: P | null = null;
    for (let k = 0; k <= 7; k++) {
      const a = -1.45 + (k * 1.3) / 7, r = rnd(0.85, 1.05);
      const p: P = [Math.cos(a) * r, Math.sin(a) * r];
      if (prev) tris.push([[0, 0], prev, p, k % 2 ? 1.05 : 0.82]);
      prev = p;
    }
  } else if (type === "dome") {
    let prev: P = [0, -0.5];
    for (let k = 1; k <= 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 6;
      const p: P = [Math.cos(a) * 0.5, Math.sin(a) * 0.5];
      tris.push([[0, 0], prev, p, 1.15 - k * 0.07 + rnd(-0.04, 0.04)]); // upper facets catch more light
      prev = p;
    }
  } else if (type === "soft") {
    for (let k = 0; k < 6; k++) fronds.push({ a: -1.4 + k * 0.24 + rnd(-0.05, 0.05), l: rnd(0.45, 0.75), s: rnd(0, 6.28), sh: rnd(0.8, 1.15) });
    tris.push([[0, -0.12], [0.14, -0.02], [0, 0.1], 0.7]);
  } else {
    for (let k = 0; k < 3; k++) {
      const x = 0.06 + k * 0.17, h = rnd(0.5, 0.95), lean = 0.06 * k, w = 0.065;
      const bl: P = [x - w, 0], br: P = [x + w, 0], tl: P = [x - w + lean, -h], tr: P = [x + w + lean, -h];
      tris.push([bl, br, tr, 0.75], [bl, tr, tl, 1.0], [tl, tr, [x + lean, -h + 0.05], 0.35]);
    }
  }
  return { type, size, tris, fronds, base: pick(CORALS[type]), s: rnd(0, 6.28), sway: type === "fan" || type === "soft" };
}

export function buildReef() {
  seed = 7;
  const { W, H } = stage;
  // as wide as the empty margin beside the content column; no wall at all when the column fills the screen
  const gutter = (W - 920) / 2;
  reef.sides = [];
  if (gutter < 50) return;
  const W0 = Math.min(320, gutter + 30);
  const y0 = H * 0.42, y1 = yAtMeters(18);
  const n = Math.max(2, Math.ceil((y1 - y0) / STEP) + 1);
  const cScale = Math.min(1, W0 / 200);
  reef.y0 = y0;
  reef.sides = ([1, -1] as const).map((dir): Side => {
    const X = (d: number) => (dir > 0 ? d : W - d);
    const ph = [rnd(0, 6.28), rnd(0, 6.28)];
    const bumps = Array.from({ length: Math.ceil(n / 9) }, () => ({ y: rnd(y0, y1), a: rnd(0.15, 0.4), w: rnd(40, 90) }));
    const edge: number[] = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + i * STEP;
      let e = 0.62 + 0.18 * Math.sin(y * 0.004 + ph[0]) + 0.12 * Math.sin(y * 0.011 + ph[1]) + rnd(-0.09, 0.09);
      for (const b of bumps) e += b.a * Math.exp(-(((y - b.y) / b.w) ** 2));
      // a crest just under the surface on top, a drop-off into the blue at the bottom
      e *= (0.35 + 0.65 * smooth(y0, y0 + 260, y)) * (1 - smooth(y1 - 520, y1, y));
      edge.push(i ? Math.max(0, e * W0) : 0);
    }
    const mid = edge.map((e, i): P => [e * rnd(0.4, 0.62), y0 + i * STEP + (i && i < n - 1 ? rnd(-0.3, 0.3) * STEP : 0)]);
    const rock: Side["rock"] = [];
    const t = (a: P, b: P, c: P, s: number) =>
      rock.push([a, b, c, pick(ROCK), Math.max(0.45, Math.min(1.3, s * rnd(0.88, 1.06))), (a[1] + b[1] + c[1]) / 3]);
    for (let i = 0; i < n - 1; i++) {
      const ya = y0 + i * STEP, yb = ya + STEP;
      const O0: P = [X(-20), ya], O1: P = [X(-20), yb];
      const M0: P = [X(mid[i][0]), mid[i][1]], M1: P = [X(mid[i + 1][0]), mid[i + 1][1]];
      const E0: P = [X(edge[i]), ya], E1: P = [X(edge[i + 1]), yb];
      const lean = ((edge[i + 1] - edge[i]) / STEP) * 0.3; // ledges facing up catch light, overhangs stay dark
      t(O0, M0, O1, 0.62);
      t(M0, M1, O1, 0.7);
      t(M0, E0, M1, 0.88 + lean * 0.5);
      t(E0, E1, M1, 0.98 + lean);
    }
    const corals: Coral[] = [];
    for (let i = 1; i < n - 1; i++) {
      if (edge[i] < 12 || random() > 0.6) continue;
      const k = random(), y = y0 + (i + k) * STEP, e = edge[i] + (edge[i + 1] - edge[i]) * k;
      const type = pick<CoralType>(["branch", "branch", "fan", "fan", "dome", "soft", "soft", "tube"]);
      const size = Math.max(14, rnd(26, 62) * (0.4 + 0.6 * cScale)) * (type === "dome" ? 0.8 : 1);
      corals.push({ ...makeCoral(type, size), x: X(e - 3), y });
      // smaller growth on the face of the wall
      if (W0 > 90 && random() < 0.35)
        corals.push({ ...makeCoral(pick<CoralType>(["dome", "tube", "soft"]), size * 0.55), x: X(e * rnd(0.35, 0.8)), y: y + rnd(-20, 20) });
    }
    return { dir, edge, rock, corals };
  });
}

// distance from its screen edge to the rim of one side of the wall, at page y
export function reefEdgeAt(side: Side, y: number) {
  const f = (y - reef.y0) / STEP, i = Math.floor(f);
  if (i < 0 || i >= side.edge.length - 1) return 0;
  return side.edge[i] + (side.edge[i + 1] - side.edge[i]) * (f - i);
}

export const torchAt = (px: number, py: number) => {
  if (!mouse.active) return 0;
  return Math.max(0, 1 - Math.hypot(px - mouse.x, py - scrollY - mouse.y) / 260) ** 1.2;
};

// water absorbs red first, then green: by 10 m a red sea fan reads brown, unless the torch is on it
export function reefColor(base: RGB, y: number, l: number, maxM = MAX_DEPTH): RGB {
  const m = Math.min(maxM, metersAtY(y));
  const ab = [Math.exp(-m / 8), Math.exp(-m / 22), Math.exp(-m / 60)];
  return [0, 1, 2].map((i) => base[i] * (ab[i] + (1 - ab[i]) * l)) as RGB;
}

// one coral, its base at (c.x, c.y), growing away from a wall on the left (dir 1) or the right (dir -1)
export function drawCoral(c: Coral, dir: number, time: number, minK = 0.35, maxM = MAX_DEPTH) {
  const g = ctx();
  const l = torchAt(c.x, c.y - c.size * 0.4);
  const k = Math.min(1, Math.max(minK, 0.8 - metersAtY(c.y) * 0.025) + l * 0.35);
  const col = reefColor(c.base, c.y, l, maxM), wc = waterAtY(c.y - scrollY);
  const shade = (s: number) => rgb(mix(wc, scale(col, s * (1 + l * 0.25)), k));
  g.save();
  g.translate(c.x, c.y);
  if (c.tilt) g.rotate(c.tilt);
  g.scale(dir * c.size, c.size);
  if (c.sway) g.rotate(Math.sin(time * 0.9 + c.s) * 0.07);
  g.lineWidth = 1 / c.size;
  for (const [p, q, r, s] of c.tris) tri(p, q, r, shade(s));
  for (const f of c.fronds) {
    const a = f.a + Math.sin(time * 1.4 + f.s) * 0.12, nx = -Math.sin(f.a) * 0.06, ny = Math.cos(f.a) * 0.06;
    tri([nx, ny], [-nx, -ny], [Math.cos(a) * f.l, Math.sin(a) * f.l], shade(f.sh));
  }
  g.restore();
}

// draws in page coordinates: call inside the scroll translate
export function drawReef(time: number) {
  const g = ctx();
  const top = scrollY - 120, bottom = scrollY + stage.H + 120;
  for (const side of reef.sides) {
    g.lineWidth = 1;
    for (const [a, b, c, base, sh, cy] of side.rock) {
      if (cy < top || cy > bottom) continue;
      const l = torchAt((a[0] + b[0] + c[0]) / 3, cy) * 0.85;
      const k = Math.max(0.3, 0.55 - metersAtY(cy) * 0.012) + l * 0.35;
      tri(a, b, c, rgb(mix(waterAtY(cy - scrollY), scale(reefColor(base, cy, l), sh * (1 + l * 0.4)), k)));
    }
    for (const c of side.corals) if (c.y >= top && c.y <= bottom) drawCoral(c, side.dir, time);
  }
  // a soft pool of torch light, only while the cursor is close to a wall
  if (mouse.active && reef.sides.length) {
    const my = mouse.y + scrollY;
    const gap = Math.min(mouse.x - reefEdgeAt(reef.sides[0], my), stage.W - reefEdgeAt(reef.sides[1], my) - mouse.x);
    const near = 1 - smooth(0, 160, gap);
    if (near > 0) {
      const R = 210, grad = g.createRadialGradient(mouse.x, my, 0, mouse.x, my, R);
      grad.addColorStop(0, `rgba(255,236,200,${0.12 * near})`);
      grad.addColorStop(1, "rgba(255,236,200,0)");
      g.save();
      g.globalCompositeOperation = "lighter";
      g.fillStyle = grad;
      g.fillRect(mouse.x - R, my - R, R * 2, R * 2);
      g.restore();
    }
  }
}
