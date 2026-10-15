import { rgb, type RGB } from "./palette.ts";
import { avoidWalls, band, clampTo, ctx, mouse, stage, tri } from "./stage.ts";

// ---------- anglerfish: the deep, lit by its own lure ----------
interface Angler {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  mouth: number;
  mouthT: number;
  glow: number;
  glowT: number;
  face: number;
  faceS: number;
  wa: number; // wander heading
  tilt: number;
  sp: number;
}

export let anglers: Angler[] = [];

export function spawnAnglers() {
  const [top, bottom] = band("deep");
  anglers = [0, 1, 2].map((i) => ({
    x: stage.W * (0.2 + 0.3 * i),
    y: top + (bottom - top) * (0.25 + 0.25 * i),
    vx: i % 2 ? -0.2 : 0.2,
    vy: 0,
    size: 90 + i * 20,
    phase: Math.random() * 6.28,
    mouth: 0.1,
    mouthT: 0.1,
    glow: 1,
    glowT: 1,
    face: i % 2 ? -1 : 1,
    faceS: i % 2 ? -1 : 1,
    wa: i % 2 ? Math.PI : 0,
    tilt: 0,
    sp: 0.4,
  }));
}

export function stepAngler(a: Angler, dt: number, time: number) {
  const dx = mouse.x - a.x, dy = mouse.y + scrollY - a.y, d = Math.hypot(dx, dy);
  const stalking = mouse.active && d < 320;
  if (stalking) {
    // it has noticed you: turns, creeps closer, opens up
    const pull = d > 140 ? 0.008 : -0.012;
    a.vx += (dx / d) * pull * dt;
    a.vy += (dy / d) * pull * dt;
    a.mouthT = d < 180 ? 1 : 0.4;
    a.glowT = 1.5;
  } else {
    // solo wander: a slowly drifting heading, like a lone fish patrolling
    a.wa += (Math.random() - 0.5) * 0.12 * dt;
    a.vx += Math.cos(a.wa) * 0.012 * dt;
    a.vy += Math.sin(a.wa) * 0.006 * dt;
    a.mouthT = 0.12 + 0.08 * Math.sin(time * 0.8 + a.phase);
    a.glowT = 1;
  }
  // walls: page sides and the edges of the deep band; the wander heading follows the escape direction
  const db = band("deep");
  const [wx, wy] = avoidWalls(a, a.vx, a.vy, db, a.size * 1.6, a.size * 0.6, 0.05);
  if (wx || wy) {
    a.vx += wx * dt;
    a.vy += wy * dt;
    a.wa = Math.atan2(a.vy, a.vx);
  }
  a.vx *= 0.985;
  a.vy *= 0.985;
  let sp = Math.hypot(a.vx, a.vy);
  const max = stalking ? 1.1 : 0.8, min = stalking ? 0.05 : 0.3;
  if (sp > max) {
    a.vx *= max / sp;
    a.vy *= max / sp;
    sp = max;
  }
  if (sp < min) {
    a.vx *= min / (sp || 1);
    a.vy *= min / (sp || 1);
    sp = min;
  }
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  clampTo(a, db, a.size);
  if (stalking) a.face = dx > 0 ? 1 : -1;
  else if (Math.abs(a.vx) > 0.08) a.face = a.vx > 0 ? 1 : -1;
  a.sp = sp;
  a.phase += (0.06 + sp * 0.14) * dt;
  const k = Math.min(1, 0.08 * dt);
  const tiltT = Math.max(-0.45, Math.min(0.45, Math.atan2(a.vy, Math.abs(a.vx) + 0.001)));
  a.tilt += (tiltT - a.tilt) * k * 0.5;
  a.mouth += (a.mouthT - a.mouth) * k;
  a.glow += (a.glowT - a.glow) * k * 0.6;
  a.faceS += (a.face - a.faceS) * k;
}

type Pt = [number, number];
const BODY: RGB = [30, 37, 45];
const lerp = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

export function drawAngler(a: Angler, time: number) {
  const g = ctx();
  const flicker = Math.random() < 0.012 ? 0.35 : 1;
  const pulse = (0.82 + 0.18 * Math.sin(time * 2.2 + a.phase)) * a.glow * flicker;
  const s = a.size, fx = a.faceS, o = a.mouth;
  // the lure bobs with each stroke and trails a little behind when swimming fast
  const L: Pt = [
    0.48 - a.sp * 0.06 + 0.03 * Math.sin(time * 1.3 + a.phase),
    -0.47 + 0.025 * Math.sin(a.phase * 2) + 0.02 * Math.cos(time * 1.1),
  ];
  const rotA = a.tilt * a.face, rc0 = Math.cos(rotA), rs0 = Math.sin(rotA);
  const lxl = L[0] * s * fx, lyl = L[1] * s;
  const lx = a.x + lxl * rc0 - lyl * rs0, ly = a.y + lxl * rs0 + lyl * rc0;

  // the lure lights the water around it
  g.save();
  g.globalCompositeOperation = "lighter";
  const R = s * 2.3 * pulse;
  const grad = g.createRadialGradient(lx, ly, 0, lx, ly, R);
  grad.addColorStop(0, `rgba(140,255,215,${0.32 * pulse})`);
  grad.addColorStop(0.25, `rgba(90,220,190,${0.11 * pulse})`);
  grad.addColorStop(1, "rgba(60,180,160,0)");
  g.fillStyle = grad;
  g.fillRect(lx - R, ly - R, R * 2, R * 2);
  g.restore();

  const F: Pt = [0.22, -0.24], Tp: Pt = [-0.02, -0.3], BT: Pt = [-0.26, -0.17], TB: Pt = [-0.36, 0];
  const BB: Pt = [-0.25, 0.17], Bt: Pt = [0, 0.25], C: Pt = [0, 0], UJ: Pt = [0.36, -0.04], H0: Pt = [0.12, 0.04];
  const LJ: Pt = [0.42, 0.04 + 0.2 * o], CH: Pt = [0.2, 0.24 + 0.07 * o];
  // facets facing the lure catch its light
  const lit = (pts: Pt[], f: number) => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    const l = Math.max(0, 1 - Math.hypot(cx - L[0], cy - L[1]) / 0.85) * pulse;
    return rgb([BODY[0] * f + 50 * l, BODY[1] * f + 130 * l, BODY[2] * f + 110 * l]);
  };
  const T = (a1: Pt, b1: Pt, c1: Pt, f: number) => tri(a1, b1, c1, lit([a1, b1, c1], f));

  g.save();
  g.translate(a.x, a.y);
  g.rotate(rotA);
  g.scale(s * fx, s);
  g.lineWidth = 1 / s;
  // tail beats around its base, harder when swimming faster
  const wag = Math.sin(a.phase) * (0.25 + a.sp * 0.3), wc = Math.cos(wag), ws = Math.sin(wag);
  const tw = (p: Pt): Pt => {
    const x = p[0] - TB[0], y = p[1];
    return [TB[0] + x * wc - y * ws, x * ws + y * wc];
  };
  T(TB, tw([-0.56, -0.17]), tw([-0.5, 0]), 0.8);
  T(TB, tw([-0.5, 0]), tw([-0.56, 0.17]), 0.6);
  T(C, F, Tp, 1.15);
  T(C, Tp, BT, 1.0);
  T(C, BT, TB, 0.85);
  T(C, TB, BB, 0.7);
  T(C, BB, Bt, 0.6);
  T(C, UJ, F, 1.25);
  T(C, H0, UJ, 0.95);
  T(C, Bt, CH, 0.65);
  T(C, CH, H0, 0.8);
  T(H0, CH, LJ, 0.9);
  tri(UJ, H0, LJ, "rgb(14,3,7)"); // inside of the mouth
  // teeth, upper pointing down, lower pointing up
  const tooth = "rgba(215,228,220,0.92)";
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const b1 = lerp(UJ, H0, t), b2 = lerp(UJ, H0, t + 0.13), m = lerp(UJ, H0, t + 0.065);
    tri(b1, b2, [m[0], m[1] + 0.075 * (1 - t * 0.5)], tooth);
    const c1 = lerp(LJ, H0, t), c2 = lerp(LJ, H0, t + 0.13), n = lerp(LJ, H0, t + 0.065);
    tri(c1, c2, [n[0], n[1] - 0.075 * (1 - t * 0.5)], tooth);
  }
  // pale, unblinking eye
  tri([0.15, -0.13], [0.22, -0.12], [0.18, -0.07], "rgba(205,215,185,0.95)");
  tri([0.175, -0.115], [0.195, -0.112], [0.183, -0.095], "rgb(8,8,10)");
  // lure stalk and bulb
  g.strokeStyle = lit([[0.1, -0.3], [0.25, -0.55], L], 0.9);
  g.lineWidth = 0.014;
  g.beginPath();
  g.moveTo(0.06, -0.29);
  g.quadraticCurveTo(0.2, -0.66, L[0], L[1]);
  g.stroke();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = `rgba(215,255,240,${Math.min(1, 0.6 + 0.4 * pulse)})`;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const ang = (k * Math.PI) / 3 + time * 0.5;
    const px = L[0] + Math.cos(ang) * 0.035, py = L[1] + Math.sin(ang) * 0.035;
    if (k) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
  g.restore();
}
