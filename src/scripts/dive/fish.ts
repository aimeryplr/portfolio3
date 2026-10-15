import { mix, rgb, scale, type RGB } from "./palette.ts";
import { reef, reefEdgeAt } from "./reef.ts";
import { sharks } from "./shark.ts";
import { avoidWalls, band, clampTo, ctx, mouse, stage, tri, waterAtY } from "./stage.ts";

// ---------- low-poly reef school (boids) ----------
interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number; // 0 = far, 1 = near
  len: number;
  phase: number;
  speed: number;
  color: RGB;
  zone: "reef" | "shallow"; // shallow fish stay in the first metres, where the page opens
}

const SPECIES: RGB[] = [[150, 205, 212], [150, 205, 212], [150, 205, 212], [222, 150, 92]];
export const fish: Fish[] = [];

function makeFish(zone: Fish["zone"]): Fish {
  const z = Math.random();
  const a = Math.random() * 6.28;
  const [top, bottom] = band(zone);
  return {
    x: stage.W * (0.1 + Math.random() * 0.8),
    y: top + (bottom - top) * (0.1 + Math.random() * 0.8),
    vx: Math.cos(a),
    vy: Math.sin(a) * 0.3,
    z,
    len: 26 + z * 30,
    phase: Math.random() * 6.28,
    speed: 0,
    color: SPECIES[(Math.random() * SPECIES.length) | 0],
    zone,
  };
}

// keeps the school at the wanted size per zone, adding or dropping fish after a resize
export function spawnFish(counts: Record<Fish["zone"], number>) {
  for (const zone of ["reef", "shallow"] as const) {
    const have = fish.filter((f) => f.zone === zone);
    for (let i = have.length; i < counts[zone]; i++) fish.push(makeFish(zone));
    for (const f of have.slice(counts[zone])) fish.splice(fish.indexOf(f), 1);
  }
}

export function stepFish(dt: number) {
  const bands = { reef: band("reef"), shallow: band("shallow") };
  const sp = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) / Math.max(dt, 0.5);
  mouse.speed = mouse.speed * 0.85 + sp * 0.15;
  mouse.px = mouse.x;
  mouse.py = mouse.y;
  for (const f of fish) {
    const rb = bands[f.zone];
    let ax = 0, ay = 0, cx = 0, cy = 0, avx = 0, avy = 0, n = 0;
    for (const o of fish) {
      if (o === f || Math.abs(o.z - f.z) > 0.4) continue;
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
      if (d < 130) {
        n++;
        cx += o.x;
        cy += o.y;
        avx += o.vx;
        avy += o.vy;
        if (d < 34) {
          ax -= (dx / (d + 0.1)) * 0.06;
          ay -= (dy / (d + 0.1)) * 0.06;
        }
      }
    }
    if (n) {
      ax += (cx / n - f.x) * 0.0006 + (avx / n - f.vx) * 0.03;
      ay += (cy / n - f.y) * 0.0006 + (avy / n - f.vy) * 0.03;
    }
    // wander
    ax += (Math.random() - 0.5) * 0.03;
    ay += (Math.random() - 0.5) * 0.02;
    // walls: page sides, the surface, and the bottom of the fish's band
    const [wx, wy] = avoidWalls(f, f.vx, f.vy, rb, 90, 40, 0.08);
    ax += wx;
    ay += wy;
    // cursor: curious when calm, scatter when fast
    if (mouse.active) {
      const dx = mouse.x - f.x, dy = mouse.y + scrollY - f.y, d = Math.hypot(dx, dy);
      if (mouse.speed > 18 && d < 240) {
        ax -= (dx / d) * 0.35;
        ay -= (dy / d) * 0.35;
      } else if (d < 280 && d > 110) {
        ax += (dx / d) * 0.012 * f.z;
        ay += (dy / d) * 0.012 * f.z;
      } else if (d <= 80) {
        ax -= (dx / d) * 0.04;
        ay -= (dy / d) * 0.04;
      }
    }
    // a shark is passing: get out of the way
    for (const shark of sharks) {
      const dx = shark.x - f.x, dy = shark.y - f.y, d = Math.hypot(dx, dy);
      if (d < shark.len * 1.1) {
        ax -= (dx / d) * 0.25;
        ay -= (dy / d) * 0.25;
      }
      // with a reef at this depth, they also dive for cover against the nearest wall
      if (reef.sides.length && d < shark.len * 1.8) {
        const eL = reefEdgeAt(reef.sides[0], f.y), eR = reefEdgeAt(reef.sides[1], f.y);
        if (eL > 20 || eR > 20) {
          const toL = eL > 20 && (eR <= 20 || f.x < stage.W / 2);
          const tx = toL ? eL - 8 : stage.W - eR + 8;
          ax += Math.sign(tx - f.x) * Math.min(1, Math.abs(tx - f.x) / 60) * 0.12;
        }
      }
    }
    f.vx += ax * dt;
    f.vy += ay * dt;
    f.vy *= 0.985;
    const max = 1.1 + f.z * 0.9, min = 0.35;
    let s = Math.hypot(f.vx, f.vy);
    if (s > max) {
      f.vx *= max / s;
      f.vy *= max / s;
      s = max;
    }
    if (s < min) {
      f.vx *= min / (s || 1);
      f.vy *= min / (s || 1);
      s = min;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    clampTo(f, rb, 40);
    f.phase += (0.12 + s * 0.12) * dt;
    f.speed = s;
  }
}

// fish model, facing +x, unit length
const P: Record<string, [number, number]> = {
  nose: [0.5, 0], top: [0.08, -0.19], bot: [0.08, 0.16], mid: [0.12, 0.01],
  bt: [-0.26, -0.06], bb: [-0.26, 0.05], fin: [-0.12, -0.32],
  tTop: [-0.52, -0.2], tMid: [-0.42, 0], tBot: [-0.52, 0.19],
};

export function drawFish(f: Fish) {
  const g = ctx();
  const len = f.len;
  const ang = Math.atan2(f.vy, f.vx);
  const flip = Math.cos(ang) < 0 ? -1 : 1;
  const wag = Math.sin(f.phase) * (0.25 + f.speed * 0.12);
  const water = waterAtY(f.y - scrollY);
  const lightLoss = 1 - stage.depth * 0.55;
  // far fish blend more into the water
  const k = 0.22 + f.z * 0.5;
  const shade = (s: number) => rgb(mix(water, scale(f.color, s * lightLoss), k));
  g.save();
  g.translate(f.x, f.y);
  g.rotate(ang);
  g.scale(len, len * flip);
  // tail rotates around tail base
  const pivot = [-0.27, 0], c = Math.cos(wag), s = Math.sin(wag);
  const rot = (p: [number, number]): [number, number] => {
    const x = p[0] - pivot[0], y = p[1] - pivot[1];
    return [pivot[0] + x * c - y * s, pivot[1] + x * s + y * c];
  };
  const tTop = rot(P.tTop), tMid = rot(P.tMid), tBot = rot(P.tBot);
  g.lineWidth = 1 / len;
  tri(P.top, P.fin, P.bt, shade(0.72));
  tri(P.bt, tTop, tMid, shade(0.85));
  tri(P.bb, tMid, tBot, shade(0.62));
  tri(P.bt, tMid, P.bb, shade(0.7));
  tri(P.nose, P.top, P.mid, shade(1.18));
  tri(P.nose, P.mid, P.bot, shade(0.68));
  tri(P.top, P.bt, P.mid, shade(1.0));
  tri(P.mid, P.bt, P.bb, shade(0.86));
  tri(P.mid, P.bb, P.bot, shade(0.58));
  g.restore();
}
