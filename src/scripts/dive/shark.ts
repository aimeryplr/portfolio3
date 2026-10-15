import { mix, rgb, scale, type RGB } from "./palette.ts";
import { avoidWalls, band, clampTo, ctx, mouse, stage, tri, waterAtY } from "./stage.ts";

// ---------- sharks: mid depth cruisers ----------
export interface Shark {
  x: number; y: number; heading: number; len: number; phase: number; tx: number; ty: number; timer: number; ready: boolean;
  scale: number; // body size relative to the full grown one
  startX: number; // where it first shows up, as a share of the width
}

const make = (scale: number, startX: number): Shark => ({ x: 0, y: 0, heading: 0, len: 220, phase: 0, tx: 0, ty: 0, timer: 0, ready: false, scale, startX });

// a full grown one, and a younger one starting from the other side
export const sharks: Shark[] = [make(1, 0.2), make(0.72, 0.8)];

function retarget(shark: Shark) {
  const [top, bottom] = band("shark");
  const my = mouse.y + scrollY;
  // now and then it comes to check out the cursor, if the cursor is at its depth
  if (mouse.active && my > top && my < bottom && Math.random() < 0.35) {
    shark.tx = mouse.x;
    shark.ty = my;
  } else {
    shark.tx = stage.W * (0.1 + Math.random() * 0.8);
    shark.ty = top + (bottom - top) * (0.15 + Math.random() * 0.7);
  }
  shark.timer = 0;
}

export function stepShark(shark: Shark, dt: number) {
  shark.len = Math.min(280, Math.max(150, stage.W * 0.22)) * shark.scale;
  const sb = band("shark");
  if (!shark.ready) {
    shark.x = stage.W * shark.startX;
    shark.y = sb[0] + (sb[1] - sb[0]) * (shark.startX < 0.5 ? 0.5 : 0.3);
    shark.heading = shark.startX < 0.5 ? 0 : Math.PI;
    shark.ready = true;
    retarget(shark);
  }
  shark.timer += dt;
  const dx = shark.tx - shark.x, dy = shark.ty - shark.y, dist = Math.hypot(dx, dy) || 1;
  if (dist < 90 || shark.timer > 900) retarget(shark);
  const [wx, wy] = avoidWalls(shark, Math.cos(shark.heading), Math.sin(shark.heading), sb, shark.len * 1.3, shark.len * 0.35, 1);
  const avoiding = wx || wy;
  // desired direction = toward the target, overridden by wall avoidance when a wall is ahead
  const want = Math.atan2(dy / dist + wy * 3, dx / dist + wx * 3);
  let diff = want - shark.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const turn = avoiding ? 0.016 : 0.006;
  shark.heading += Math.max(-turn, Math.min(turn, diff)) * dt;
  shark.x += Math.cos(shark.heading) * 1.2 * dt;
  shark.y += Math.sin(shark.heading) * 1.2 * dt;
  clampTo(shark, sb, shark.len);
  // the young one beats its tail faster for the same cruising speed
  shark.phase += (0.07 / shark.scale) * dt;
}

// model facing +x, unit length
const S: Record<string, [number, number]> = {
  snout: [0.5, 0.03], head: [0.32, -0.08], d1: [0.1, -0.12], dTip: [-0.05, -0.34], d2: [-0.1, -0.1],
  back: [-0.3, -0.05], cb: [-0.4, 0], tTop: [-0.62, -0.27], tMid: [-0.48, 0], tBot: [-0.54, 0.13],
  mouth: [0.36, 0.07], belly: [0.12, 0.12], bellyB: [-0.22, 0.06], mid: [0.1, 0.0], midB: [-0.2, 0],
  p1: [0.18, 0.09], p2: [0.06, 0.11], pTip: [-0.03, 0.3],
  e1: [0.34, -0.035], e2: [0.31, -0.02], e3: [0.33, -0.005],
};
const TOP: RGB = [62, 86, 104];
const BELLY: RGB = [160, 182, 188];

export function drawShark(shark: Shark) {
  const g = ctx();
  const flip = Math.cos(shark.heading) < 0 ? -1 : 1;
  const wag = Math.sin(shark.phase) * 0.22;
  // the back half of the body bends progressively toward the tail
  const bend = (p: [number, number]): [number, number] => {
    if (p[0] >= -0.12) return p;
    const a = wag * ((-0.12 - p[0]) / 0.5), c = Math.cos(a), s = Math.sin(a), x = p[0] + 0.12, y = p[1];
    return [-0.12 + x * c - y * s, x * s + y * c];
  };
  const P: Record<string, [number, number]> = {};
  for (const k in S) P[k] = bend(S[k]);
  const water = waterAtY(shark.y - scrollY), loss = 1 - stage.depth * 0.4;
  // countershading: dark back, pale belly, both fading into the water
  const sh = (base: RGB, f: number) => rgb(mix(water, scale(base, f * loss), 0.62));
  g.save();
  g.translate(shark.x, shark.y);
  g.rotate(shark.heading);
  g.scale(shark.len, shark.len * flip);
  g.lineWidth = 1 / shark.len;
  tri(P.cb, P.tTop, P.tMid, sh(TOP, 0.82));
  tri(P.cb, P.tMid, P.tBot, sh(TOP, 0.62));
  tri(P.d1, P.dTip, P.d2, sh(TOP, 0.72));
  tri(P.snout, P.head, P.mid, sh(TOP, 1.12));
  tri(P.head, P.d1, P.mid, sh(TOP, 1.0));
  tri(P.d1, P.d2, P.mid, sh(TOP, 0.9));
  tri(P.mid, P.d2, P.midB, sh(TOP, 0.8));
  tri(P.d2, P.back, P.midB, sh(TOP, 0.86));
  tri(P.back, P.cb, P.midB, sh(TOP, 0.74));
  tri(P.snout, P.mid, P.mouth, sh(BELLY, 0.86));
  tri(P.mouth, P.mid, P.belly, sh(BELLY, 1.0));
  tri(P.mid, P.bellyB, P.belly, sh(BELLY, 0.92));
  tri(P.mid, P.midB, P.bellyB, sh(BELLY, 0.8));
  tri(P.midB, P.cb, P.bellyB, sh(BELLY, 0.7));
  tri(P.p1, P.pTip, P.p2, sh(TOP, 0.6));
  tri(P.e1, P.e2, P.e3, "rgba(6,10,14,0.9)");
  g.restore();
}
