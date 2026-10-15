import { rgb, scale, water } from "./palette.ts";
import { ctx, stage } from "./stage.ts";

// low-poly water: a jittered grid split into triangles, each one shaded by the depth palette
const CELL = 110;

interface Vert {
  bx: number;
  by: number;
  s: number;
  x: number;
  y: number;
}

let verts: Vert[] = [];
let tris: [number, number, number, number][] = [];

export function buildMesh() {
  const cols = Math.ceil(stage.W / CELL) + 2;
  const rows = Math.ceil(stage.H / CELL) + 2;
  verts = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      verts.push({
        bx: (c - 0.5) * CELL + (Math.random() - 0.5) * CELL * 0.7,
        by: (r - 0.5) * CELL + (Math.random() - 0.5) * CELL * 0.7,
        s: Math.random() * 6.28,
        x: 0,
        y: 0,
      });
    }
  }
  tris = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c, j = i + 1, k = i + cols, l = k + 1;
      const seedA = 0.96 + Math.random() * 0.08, seedB = 0.96 + Math.random() * 0.08;
      if ((r + c) % 2) tris.push([i, j, l, seedA], [i, l, k, seedB]);
      else tris.push([i, j, k, seedA], [j, l, k, seedB]);
    }
  }
}

export function drawMesh(time: number) {
  const g = ctx();
  const amp = CELL * 0.08;
  for (const v of verts) {
    v.x = v.bx + Math.sin(time * 0.25 + v.s) * amp;
    v.y = v.by + Math.cos(time * 0.2 + v.s * 1.3) * amp;
  }
  g.lineWidth = 1;
  for (const [a, b, c, seed] of tris) {
    const A = verts[a], B = verts[b], C = verts[c];
    const cx = (A.x + B.x + C.x) / 3, cy = (A.y + B.y + C.y) / 3;
    const t = stage.depth * 0.85 + (cy / stage.H) * 0.3;
    // light ripples across the facets near the surface
    const near = Math.max(0, 1 - t * 1.4);
    let light = seed;
    light += (0.07 * Math.sin(time * 0.7 + cx * 0.011 - cy * 0.006) +
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
