import { ctx, stage } from "./stage.ts";

// ---------- marine snow: tiny triangles, screen space ----------
const snow = Array.from({ length: 110 }, () => ({
  x: Math.random(), y: Math.random(), z: Math.random(), s: Math.random() * 6.28, r: Math.random() * 6.28,
}));

// deep = 0..1, how far into the deep zone we are: a few specks turn into bioluminescent plankton
export function drawSnow(time: number, dt: number, scrollDy: number, deep: number) {
  const g = ctx();
  const { W, H } = stage;
  for (const p of snow) {
    p.y += (0.00008 + p.z * 0.00012) * dt;
    p.y -= (scrollDy * (0.3 + p.z * 0.6)) / H;
    p.x += Math.sin(time * 0.4 + p.s) * 0.00005 * dt;
    p.r += 0.004 * dt;
    if (p.y > 1.02) p.y -= 1.04;
    if (p.y < -0.02) p.y += 1.04;
    if (p.x > 1.02) p.x -= 1.04;
    if (p.x < -0.02) p.x += 1.04;
    const glowing = p.z > 0.85 && deep > 0;
    const sz = (0.8 + p.z * 1.8) * (glowing ? 1 + deep * 0.6 : 1);
    const x = p.x * W, y = p.y * H;
    g.fillStyle = glowing
      ? `rgba(${(205 - 65 * deep) | 0},${(235 + 20 * deep) | 0},${(240 - 20 * deep) | 0},${0.38 + deep * 0.5 * (0.6 + 0.4 * Math.sin(time * 2 + p.s * 5))})`
      : `rgba(205,235,240,${0.1 + p.z * 0.28})`;
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = p.r + k * 2.094;
      const px = x + Math.cos(a) * sz, py = y + Math.sin(a) * sz;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.fill();
  }
}

// ---------- bubbles: faceted hexagons ----------
interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  s: number;
  rot: number;
}

let bubbles: Bubble[] = [];
let nextStream = 1.5;
let streamTimer = 0;

const makeBubble = (x: number, y: number, vx: number): Bubble => ({
  x, y, vx, vy: -(0.5 + Math.random() * 0.6), r: 2 + Math.random() * 5, s: Math.random() * 6.28, rot: Math.random(),
});

function spawnStream() {
  const x = stage.W * (0.1 + Math.random() * 0.8);
  const n = 5 + ((Math.random() * 6) | 0);
  for (let i = 0; i < n; i++) bubbles.push(makeBubble(x + (Math.random() - 0.5) * 10, stage.H + 20 + i * 26, 0));
}

// a click releases a burst of bubbles, like exhaling through the regulator
export function burst(x: number, y: number) {
  for (let i = 0; i < 14; i++) {
    const b = makeBubble(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 3);
    b.vy = -(0.8 + Math.random() * 1.5);
    bubbles.push(b);
  }
}

// bubbles live on screen but are carried by the page: a scroll moves them like the content around them
export function drawBubbles(time: number, dt: number, scrollDy: number) {
  const g = ctx();
  streamTimer += dt / 60;
  if (!stage.reduced && streamTimer > nextStream) {
    streamTimer = 0;
    nextStream = 2 + Math.random() * 3;
    spawnStream();
  }
  g.lineWidth = 1;
  for (const b of bubbles) b.y -= scrollDy;
  // streams start just under the screen, so keep some room below before dropping a bubble
  bubbles = bubbles.filter((b) => b.y > -30 && b.y < stage.H + 400);
  for (const b of bubbles) {
    b.vy -= 0.004 * dt;
    b.vx *= 0.98;
    b.y += b.vy * dt;
    b.x += (b.vx + Math.sin(time * 3 + b.s) * 0.35) * dt;
    b.r += 0.004 * dt;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = b.rot + (k * Math.PI) / 3, px = b.x + Math.cos(a) * b.r, py = b.y + Math.sin(a) * b.r;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fillStyle = "rgba(190,240,250,0.08)";
    g.fill();
    g.strokeStyle = "rgba(190,240,250,0.45)";
    g.stroke();
    // highlight facet
    g.fillStyle = "rgba(235,252,255,0.5)";
    const a0 = b.rot + Math.PI, a1 = b.rot + (Math.PI * 4) / 3;
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x + Math.cos(a0) * b.r * 0.85, b.y + Math.sin(a0) * b.r * 0.85);
    g.lineTo(b.x + Math.cos(a1) * b.r * 0.85, b.y + Math.sin(a1) * b.r * 0.85);
    g.closePath();
    g.fill();
  }
}
