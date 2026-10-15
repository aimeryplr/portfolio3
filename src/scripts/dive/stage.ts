import { water } from "./palette.ts";

export const MAX_DEPTH = 40;

// shared frame state: creatures live in page coordinates, the screen is a window on it
export const stage = {
  W: 0,
  H: 0,
  DPR: 1,
  depth: 0, // 0..1 page progress
  fixedDepth: null as number | null, // single-screen pages (404, 500) sit at one depth instead
  docH: 1,
  maxS: 1,
  reduced: false,
  touch: false, // phones and tablets: a single fish layer
};

let context: CanvasRenderingContext2D;
export const setCtx = (c: CanvasRenderingContext2D) => (context = c);
export const ctx = () => context;

export const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0, active: false };

// reading scrollHeight forces a layout, so it is cached and refreshed only when the body resizes
let docHeight = 0;
let observed = false;
function docH() {
  if (!observed) {
    observed = true;
    const read = () => (docHeight = document.documentElement.scrollHeight);
    read();
    new ResizeObserver(read).observe(document.body);
  }
  return docHeight;
}

export const maxScroll = () => Math.max(1, docH() - innerHeight);
export const pageDepth = () => Math.max(0, Math.min(1, scrollY / maxScroll()));

export function measure() {
  stage.docH = docH();
  stage.maxS = Math.max(1, stage.docH - stage.H);
  stage.depth = stage.fixedDepth ?? pageDepth();
}

// page y that sits mid-screen when the dive computer reads m meters
export const yAtMeters = (m: number) =>
  Math.max(0, Math.min(stage.docH, (m / MAX_DEPTH) * stage.maxS + stage.H * 0.5));

export type Band = [number, number];
const BANDS = { shallow: [0, 6], reef: [0, 16], shark: [12, 30], deep: [26, 40] } as const;
export const band = (k: keyof typeof BANDS): Band => [
  BANDS[k][0] === 0 ? 0 : yAtMeters(BANDS[k][0]),
  BANDS[k][1] === MAX_DEPTH ? stage.docH : yAtMeters(BANDS[k][1]),
];

interface Body {
  x: number;
  y: number;
}

// look-ahead wall avoidance: project the heading forward and steer away from any wall the probe crosses
export function avoidWalls(
  c: Body,
  vx: number,
  vy: number,
  [top, bottom]: Band,
  look: number,
  margin: number,
  strength: number,
): [number, number] {
  const sp = Math.hypot(vx, vy) || 1;
  const px = c.x + (vx / sp) * look;
  const py = c.y + (vy / sp) * look;
  let sx = 0;
  let sy = 0;
  if (px < margin) sx += (margin - px) / look;
  if (px > stage.W - margin) sx -= (px - (stage.W - margin)) / look;
  if (py < top + margin) sy += (top + margin - py) / look;
  if (py > bottom - margin) sy -= (py - (bottom - margin)) / look;
  return [sx * strength, sy * strength];
}

// safety net after a resize or a page height change
export function clampTo(c: Body, [top, bottom]: Band, pad: number) {
  c.x = Math.max(-pad, Math.min(stage.W + pad, c.x));
  c.y = Math.max(top - pad, Math.min(bottom + pad, c.y));
}

export const onScreen = (y: number, pad: number) => y - scrollY > -pad && y - scrollY < stage.H + pad;

// Parallax: a creature with factor k scrolls at k times the page speed. The mapping scales around
// the middle of the screen, so a creature still passes mid-screen at its own depth and stays in its band.
export const parallaxY = (y: number, k: number) =>
  stage.fixedDepth === null ? stage.H / 2 + (y - scrollY - stage.H / 2) * k : y - scrollY;

// Lenis drives the scroll from the ocean's frame loop, so the page and the canvas move in the same frame.
// It is absent with reduced motion and on single-screen pages, where native scrolling is used.
let smoothScroller: { scrollTo(target: HTMLElement): void } | null = null;
export const setScroller = (s: typeof smoothScroller) => (smoothScroller = s);
export function scrollToEl(el: HTMLElement) {
  if (smoothScroller) smoothScroller.scrollTo(el);
  else el.scrollIntoView({ behavior: stage.reduced ? "auto" : "smooth" });
}

// water color behind a screen y
export const waterAtY = (y: number) => water(stage.depth * 0.85 + (y / stage.H) * 0.3);

type Pt = [number, number] | number[];
// flat-shaded triangle in the current transform; the stroke hides seams between facets
export function tri(a: Pt, b: Pt, c: Pt, col: string) {
  const g = context;
  g.fillStyle = col;
  g.strokeStyle = col;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.lineTo(c[0], c[1]);
  g.closePath();
  g.fill();
  g.stroke();
}
