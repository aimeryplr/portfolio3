import { mix, rgb, scale, type RGB } from "./palette.ts";
import { reef, reefEdgeAt } from "./reef.ts";
import { sharks } from "./shark.ts";
import { avoidWalls, band, clampTo, ctx, mouse, parallaxY, stage, tri, waterAtY } from "./stage.ts";

// ---------- low-poly reef school (boids) ----------
// Fish live on three depth layers. Each layer scrolls at its own parallax speed and is drawn at its
// own place in the scene: far fish behind the reef, mid fish among it, near fish over everything.
// A layer is split into small schools that only flock among themselves and follow their own slowly
// drifting target, so schools travel the band instead of merging into one pile.
export const LAYERS = [
  { z: 0.12, k: 0.72, share: 0.4, margin: -10 }, // far: may slip behind the reef at the page edges
  { z: 0.5, k: 1, share: 0.35, margin: 40 }, // mid: moves with the reef
  { z: 0.9, k: 1.22, share: 0.25, margin: 40 }, // near: drifts faster than the page
] as const;
const SCHOOL_SIZE = 5;

type Zone = "reef" | "shallow"; // shallow fish stay in the first metres, where the page opens

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  layer: number; // index in LAYERS
  z: number; // 0 = far, 1 = near
  k: number; // parallax: share of the page scroll speed
  school: School;
  fear: number; // 0..1, raised by an approaching cursor, shared through the school, fades out
  len: number;
  phase: number;
  speed: number;
  color: RGB;
  zone: Zone;
}

// a school's target sweeps its band on a slow Lissajous path, phases and speeds drawn at random
interface School {
  wx: number;
  wy: number;
  px: number;
  py: number;
  tx: number;
  ty: number;
}

const SPECIES: RGB[] = [[150, 205, 212], [150, 205, 212], [150, 205, 212], [222, 150, 92]];
export const fish: Fish[] = [];
const schools = new Map<string, School[]>();
let clock = 0;

const makeSchool = (): School => ({
  wx: 0.0012 + Math.random() * 0.0016,
  wy: 0.0015 + Math.random() * 0.002,
  px: Math.random() * 6.28,
  py: Math.random() * 6.28,
  tx: 0,
  ty: 0,
});

function makeFish(zone: Zone, layer: number, school: School): Fish {
  const L = LAYERS[layer];
  const z = Math.max(0, Math.min(1, L.z + (Math.random() - 0.5) * 0.12));
  const a = Math.random() * 6.28;
  const [top, bottom] = band(zone);
  return {
    x: stage.W * (0.1 + Math.random() * 0.8),
    y: top + (bottom - top) * (0.1 + Math.random() * 0.8),
    vx: Math.cos(a),
    vy: Math.sin(a) * 0.3,
    layer,
    z,
    k: L.k,
    school,
    fear: 0,
    len: 26 + z * 30,
    phase: Math.random() * 6.28,
    speed: 0,
    color: SPECIES[(Math.random() * SPECIES.length) | 0],
    zone,
  };
}

// keeps each zone and layer at the wanted size, adding or dropping fish after a resize,
// and deals the fish into schools of about SCHOOL_SIZE
export function spawnFish(counts: Record<Zone, number>) {
  for (const zone of ["reef", "shallow"] as const) {
    LAYERS.forEach((L, layer) => {
      const want = Math.max(1, Math.round(counts[zone] * L.share));
      const key = `${zone}:${layer}`;
      const list = schools.get(key) ?? [];
      const nSchools = Math.ceil(want / SCHOOL_SIZE);
      while (list.length < nSchools) list.push(makeSchool());
      list.length = nSchools;
      schools.set(key, list);
      const have = fish.filter((f) => f.zone === zone && f.layer === layer);
      for (const f of have.slice(want)) fish.splice(fish.indexOf(f), 1);
      for (let i = have.length; i < want; i++) fish.push(makeFish(zone, layer, list[0]));
      fish.filter((f) => f.zone === zone && f.layer === layer).forEach((f, i) => (f.school = list[i % nSchools]));
    });
  }
}

export function stepFish(dt: number) {
  const bands = { reef: band("reef"), shallow: band("shallow") };
  clock += dt;
  for (const [key, list] of schools) {
    const [top, bottom] = bands[key.split(":")[0] as Zone];
    for (const sc of list) {
      sc.tx = stage.W * (0.5 + 0.36 * Math.sin(clock * sc.wx + sc.px));
      sc.ty = top + (bottom - top) * (0.5 + 0.4 * Math.sin(clock * sc.wy + sc.py));
    }
  }
  // cursor velocity on screen, per frame; nothing on the first move after it enters
  const fresh = mouse.px < -9000;
  const mvx = fresh ? 0 : (mouse.x - mouse.px) / Math.max(dt, 0.5);
  const mvy = fresh ? 0 : (mouse.y - mouse.py) / Math.max(dt, 0.5);
  const sp = Math.hypot(mvx, mvy);
  mouse.speed = mouse.speed * 0.85 + sp * 0.15;
  mouse.px = mouse.x;
  mouse.py = mouse.y;
  for (const f of fish) {
    const rb = bands[f.zone];
    let ax = 0, ay = 0, cx = 0, cy = 0, avx = 0, avy = 0, n = 0, schoolFear = 0;
    for (const o of fish) {
      // other layers swim in another plane: no contact at all
      if (o === f || o.layer !== f.layer) continue;
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
      // keep apart from any fish of the layer, but only school with your own
      if (d < 34) {
        ax -= (dx / (d + 0.1)) * 0.06;
        ay -= (dy / (d + 0.1)) * 0.06;
      }
      if (o.school === f.school && d < 130) {
        n++;
        cx += o.x;
        cy += o.y;
        avx += o.vx;
        avy += o.vy;
        schoolFear = Math.max(schoolFear, o.fear);
      }
    }
    if (n) {
      ax += (cx / n - f.x) * 0.0006 + (avx / n - f.vx) * 0.03;
      ay += (cy / n - f.y) * 0.0006 + (avy / n - f.vy) * 0.03;
    }
    // the school's target, a gentle constant pull
    const tdx = f.school.tx - f.x, tdy = f.school.ty - f.y, td = Math.hypot(tdx, tdy) || 1;
    ax += (tdx / td) * 0.012;
    ay += (tdy / td) * 0.008;
    // wander
    ax += (Math.random() - 0.5) * 0.03;
    ay += (Math.random() - 0.5) * 0.02;
    // walls: page sides, the surface, and the bottom of the fish's band
    const [wx, wy] = avoidWalls(f, f.vx, f.vy, rb, 90, LAYERS[f.layer].margin, 0.08);
    ax += wx;
    ay += wy;
    // cursor: a predator. Fear grows with how close it is and how fast it closes in, then fades;
    // a calm, distant cursor still draws the curious ones
    f.fear *= 0.965 ** dt;
    if (mouse.active) {
      // measured on screen, where the fish is drawn
      const rx = f.x - mouse.x, ry = fishScreenY(f) - mouse.y, d = Math.hypot(rx, ry) || 1;
      const ux = rx / d, uy = ry / d;
      const closing = mvx * ux + mvy * uy; // cursor speed toward this fish
      const near = Math.max(0, 1 - d / 280);
      const threat = near * Math.min(1, Math.max(0, closing) / 7) + (d < 90 ? 0.5 * (1 - d / 90) : 0);
      f.fear = Math.max(f.fear, Math.min(1, threat * 1.6));
      if (f.fear > 0.05 && d < 360) {
        // straight away, plus a break to the side of the cursor's path
        let bx = 0, by = 0;
        if (sp > 0.5) {
          const hx = mvx / sp, hy = mvy / sp, along = rx * hx + ry * hy;
          const px = rx - along * hx, py = ry - along * hy, pd = Math.hypot(px, py);
          if (pd > 1) {
            bx = px / pd;
            by = py / pd;
          } else {
            bx = -hy; // dead ahead of the cursor: pick a side
            by = hx;
          }
        }
        const push = 0.45 * f.fear * (0.4 + near);
        ax += (ux + bx * 0.8) * push;
        ay += (uy + by * 0.8) * push;
      } else if (mouse.speed < 4 && d < 280 && d > 110) {
        ax -= ux * 0.012 * f.z;
        ay -= uy * 0.012 * f.z;
      }
    }
    // panic spreads through the school, a little weaker at each fish
    f.fear = Math.max(f.fear, schoolFear * 0.75);
    // a shark is passing: get out of the way
    for (const shark of sharks) {
      // on screen too: the shark scrolls with the page, the fish with its parallax
      const dx = shark.x - f.x, dy = shark.y - scrollY - fishScreenY(f), d = Math.hypot(dx, dy);
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
    // a frightened fish sprints, up to about 2.8 times its cruising top speed
    const max = (1.1 + f.z * 0.9) * (1 + f.fear * 1.8), min = 0.35;
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

export const fishScreenY = (f: Fish) => parallaxY(f.y, f.k);

// drawn in screen coordinates, at the fish's parallax position
export function drawFish(f: Fish) {
  const g = ctx();
  const len = f.len;
  const ang = Math.atan2(f.vy, f.vx);
  const flip = Math.cos(ang) < 0 ? -1 : 1;
  const wag = Math.sin(f.phase) * (0.25 + f.speed * 0.12);
  const sy = fishScreenY(f);
  const water = waterAtY(sy);
  const lightLoss = 1 - stage.depth * 0.55;
  // far fish blend more into the water
  const k = 0.22 + f.z * 0.5;
  const shade = (s: number) => rgb(mix(water, scale(f.color, s * lightLoss), k));
  g.save();
  g.translate(f.x, sy);
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
