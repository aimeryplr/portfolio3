import { anglers, drawAngler, spawnAnglers, stepAngler } from "./angler.ts";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { drawFish, fish, fishScreenY, spawnFish, stepFish } from "./fish.ts";
import { createLightRays } from "./lightRays.ts";
import { buildMesh, drawMesh } from "./mesh.ts";
import { smooth } from "./palette.ts";
import { buildOutcrops, drawOutcrops } from "./outcrops.ts";
import { buildReef, drawReef } from "./reef.ts";
import { burst, drawBubbles, drawSnow } from "./particles.ts";
import { drawShark, sharks, stepShark } from "./shark.ts";
import { MAX_DEPTH, measure, mouse, onScreen, setCtx, setScroller, stage } from "./stage.ts";

// a school sized to the screen: 18 on a desktop, a handful on a phone,
// plus a crowd near the surface so the top of the page is busy
const fishCount = () => ({
  reef: Math.round(Math.max(6, Math.min(18, stage.W / 80))),
  shallow: Math.round(Math.max(6, Math.min(14, stage.W / 100))),
});

// The whole background: low-poly water, god rays, creatures and particles.
// Scroll is the descent: 0..1 of the page maps to 0..40 m.
export function startOcean(ocean: HTMLCanvasElement, raysCanvas: HTMLCanvasElement, fixedDepth: number | null = null) {
  const g = ocean.getContext("2d");
  if (!g) return;
  setCtx(g);
  stage.fixedDepth = fixedDepth;
  stage.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  stage.touch = matchMedia("(pointer: coarse)").matches;
  const rays = createLightRays(raysCanvas);
  // the wheel scroll is stepped from this loop, so the canvas never lags a frame behind the page.
  // lerp 0.2 instead of the default 0.1: the page catches up with the wheel in about 0.25 s, not 0.5 s.
  // syncTouch does the same for a finger: left to the browser, a touch scroll moves the page on the
  // compositor while the canvas redraws from scrollY a frame or more later, and the water drags behind
  const lenis =
    stage.reduced || fixedDepth !== null ? null : new Lenis({ anchors: true, lerp: 0.2, syncTouch: true });
  setScroller(lenis);

  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.addEventListener("mouseleave", () => (mouse.active = false));
  addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("a, button, input, textarea, label, summary")) return;
    if (stage.reduced) return;
    burst(e.clientX, e.clientY);
  });

  let last = performance.now();
  let lastScroll = scrollY;
  let reefDocH = 0;
  let cssDepth = -1;

  function draw(now: number) {
    const dt = stage.reduced ? 1 : Math.min(3, (now - last) / 16.67);
    last = now;
    lenis?.raf(now);
    const time = stage.reduced ? 0 : now / 1000;
    const scrollDy = scrollY - lastScroll;
    lastScroll = scrollY;
    measure();
    // the card glass follows the water's color; only written when it moves, since it restyles the page
    if (Math.abs(stage.depth - cssDepth) > 0.004) {
      cssDepth = stage.depth;
      document.documentElement.style.setProperty("--depth", cssDepth.toFixed(3));
    }
    // fonts and hydrating islands change the page height, and the water and reef are laid out against it
    if (stage.docH !== reefDocH) {
      reefDocH = stage.docH;
      buildMesh();
      buildReef();
      buildOutcrops();
    }
    const deep = smooth(24, 32, stage.depth * MAX_DEPTH); // glowing plankton down there

    g!.setTransform(stage.DPR, 0, 0, stage.DPR, 0, 0);
    drawMesh(time);
    rays.draw(time);
    // the whole page keeps simulating, on screen or not
    if (!stage.reduced) {
      for (const s of sharks) stepShark(s, dt);
      stepFish(dt);
      for (const a of anglers) stepAngler(a, dt, time);
    }
    // creatures are drawn in page coordinates, shifted by the scroll, and only when visible;
    // fish place themselves on screen with their own parallax
    const inWorld = (fn: () => void) => {
      g!.save();
      g!.translate(0, -scrollY);
      fn();
      g!.restore();
    };
    const drawLayer = (layer: number) => {
      for (const f of fish) {
        const y = fishScreenY(f);
        if (f.layer === layer && y > -80 && y < stage.H + 80) drawFish(f);
      }
    };
    // far school behind the reef, mid school among it, near school over everything
    drawLayer(0);
    inWorld(() => {
      drawReef(time);
      drawOutcrops(time);
    });
    drawLayer(1);
    drawSnow(time, stage.reduced ? 0 : dt, stage.reduced ? 0 : scrollDy, deep);
    inWorld(() => {
      for (const s of sharks) if (onScreen(s.y, s.len)) drawShark(s);
    });
    drawLayer(2);
    inWorld(() => {
      for (const a of anglers) if (onScreen(a.y, a.size * 3)) drawAngler(a, time);
    });
    drawBubbles(time, stage.reduced ? 0 : dt, scrollDy);
  }

  function loop(now: number) {
    draw(now);
    requestAnimationFrame(loop);
  }

  // The canvas is sized in CSS to the large viewport (100lvh), so a phone's address bar sliding in
  // or out does not change it. Its resize events are dropped here: rebuilding the canvas, the reef and
  // the school is a visible hitch, and the bar moves exactly when a scroll starts.
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = ocean.clientWidth || innerWidth;
    const h = ocean.clientHeight || innerHeight;
    if (w === stage.W && h === stage.H && dpr === stage.DPR) return;
    stage.DPR = dpr;
    stage.W = w;
    stage.H = h;
    ocean.width = stage.W * stage.DPR;
    ocean.height = stage.H * stage.DPR;
    rays.resize();
    measure();
    buildMesh();
    buildReef();
    buildOutcrops();
    reefDocH = stage.docH;
    spawnFish(fishCount());
    if (stage.reduced) draw(0);
  }

  addEventListener("resize", resize);
  resize();
  spawnAnglers();
  if (stage.reduced) {
    // one redraw per frame at most, scroll events can fire faster than that
    let queued = false;
    addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          draw(0);
        });
      },
      { passive: true },
    );
    draw(0);
  } else {
    requestAnimationFrame(loop);
  }
}
