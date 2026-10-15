import { rgb, scale, water } from "./palette.ts";
import { ctx, mouse, stage } from "./stage.ts";

// low-poly water: a jittered grid split into triangles, each one shaded by the depth palette.
// The grid lives in page coordinates and spans the whole document, so it scrolls with the content.
const CELL = 110;
// the cursor pulls the nearby vertices toward it; PULL < 1 keeps the facets from folding over
const PULL_RADIUS = 280;
const PULL = 0.7;

interface Vert {
  bx: number;
  by: number;
  s: number;
  edge: boolean; // the outer ring: pulling it in would open a gap at the border
  ox: number;
  oy: number;
  x: number;
  y: number;
}

let verts: Vert[] = [];
let cols = 0;
let rows = 0;
// tris[r] holds the triangles between vertex rows r and r + 1, so only the visible band is drawn
let tris: [number, number, number, number][][] = [];

// same jitter for the same cell on every rebuild: the page height changes as fonts and islands load,
// and a fresh Math.random() would make the water jump
const hash = (r: number, c: number, k: number) => {
  const n = Math.sin(r * 127.1 + c * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

export function buildMesh() {
  cols = Math.ceil(stage.W / CELL) + 2;
  rows = Math.ceil(Math.max(stage.docH, stage.H) / CELL) + 2;
  verts = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      verts.push({
        bx: (c - 0.5) * CELL + (hash(r, c, 0) - 0.5) * CELL * 0.7,
        by: (r - 0.5) * CELL + (hash(r, c, 1) - 0.5) * CELL * 0.7,
        s: hash(r, c, 2) * 6.28,
        edge: r === 0 || c === 0 || r === rows - 1 || c === cols - 1,
        ox: 0,
        oy: 0,
        x: 0,
        y: 0,
      });
    }
  }
  tris = [];
  for (let r = 0; r < rows - 1; r++) {
    const row: [number, number, number, number][] = [];
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c, j = i + 1, k = i + cols, l = k + 1;
      const seedA = 0.96 + hash(r, c, 3) * 0.08, seedB = 0.96 + hash(r, c, 4) * 0.08;
      if ((r + c) % 2) row.push([i, j, l, seedA], [i, l, k, seedB]);
      else row.push([i, j, k, seedA], [j, l, k, seedB]);
    }
    tris.push(row);
  }
}

export function drawMesh(time: number) {
  const g = ctx();
  const amp = CELL * 0.14;
  const pulling = mouse.active && !stage.reduced;
  const my = mouse.y + scrollY;
  // a row of margin on each side: jitter, waves and pull never move a vertex a full cell
  const r0 = Math.max(0, Math.floor(scrollY / CELL) - 1);
  const r1 = Math.min(rows - 1, Math.ceil((scrollY + stage.H) / CELL) + 2);

  for (let i = r0 * cols; i < (r1 + 1) * cols; i++) {
    const v = verts[i];
    const wx = v.bx + Math.sin(time * 0.35 + v.s) * amp;
    const wy = v.by + Math.cos(time * 0.28 + v.s * 1.3) * amp;
    let tx = 0, ty = 0;
    if (pulling && !v.edge) {
      const dx = mouse.x - wx, dy = my - wy;
      const f = Math.max(0, 1 - Math.hypot(dx, dy) / PULL_RADIUS) ** 2 * PULL;
      tx = dx * f;
      ty = dy * f;
    }
    // eased so the water stretches toward the cursor and drifts back once it leaves
    v.ox += (tx - v.ox) * 0.08;
    v.oy += (ty - v.oy) * 0.08;
    v.x = wx + v.ox;
    v.y = wy + v.oy;
  }

  g.save();
  g.translate(0, -scrollY);
  g.lineWidth = 1;
  for (let r = r0; r < r1; r++) {
    for (const [a, b, c, seed] of tris[r]) {
      const A = verts[a], B = verts[b], C = verts[c];
      const cx = (A.x + B.x + C.x) / 3, cy = (A.y + B.y + C.y) / 3;
      // shaded by where the facet sits on screen, so the light still darkens as you descend
      const sy = cy - scrollY;
      const t = stage.depth * 0.85 + (sy / stage.H) * 0.3;
      // light ripples across the facets near the surface
      const near = Math.max(0, 1 - t * 1.4);
      let light = seed;
      light += (0.07 * Math.sin(time * 0.7 + cx * 0.011 - sy * 0.006) +
                0.04 * Math.sin(time * 1.15 - cx * 0.007 + seed * 40)) * near;
      light += Math.pow(Math.max(0, 1 - t * 3), 3) * 0.18; // brighter just under the surface
      const col = rgb(scale(water(t), light));
      g.fillStyle = col;
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(A.x, A.y);
      g.lineTo(B.x, B.y);
      g.lineTo(C.x, C.y);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }
  g.restore();
}
