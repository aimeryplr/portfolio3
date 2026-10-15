import { anglers, drawAngler, spawnAnglers, stepAngler } from "./angler.ts";
import { drawFish, fish, spawnFish, stepFish } from "./fish.ts";
import { createLightRays } from "./lightRays.ts";
import { buildMesh, drawMesh } from "./mesh.ts";
import { smooth } from "./palette.ts";
import { buildOutcrops, drawOutcrops } from "./outcrops.ts";
import { buildReef, drawReef } from "./reef.ts";
import { burst, drawBubbles, drawSnow } from "./particles.ts";
import { drawShark, sharks, stepShark } from "./shark.ts";
import { MAX_DEPTH, measure, mouse, onScreen, setCtx, stage } from "./stage.ts";

// a school sized to the screen: 18 on a desktop, a handful on a phone,
// plus a crowd near the surface so the top of the page is busy
const fishCount = () => ({
  reef: Math.round(Math.max(6, Math.min(18, stage.W / 80))),
  shallow: Math.round(Math.max(6, Math.min(14, stage.W / 100))),
});

// The whole background: low-poly water, god rays, creatures and particles.
// Scroll is the descent: 0..1 of the page maps to 0..40 m.
export function startOcean(ocean: HTMLCanvasElement, raysCanvas: HTMLCanvasElement) {
  const g = ocean.getContext("2d");
  if (!g) return;
  setCtx(g);
  stage.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rays = createLightRays(raysCanvas);

  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.addEventListener("mouseleave", () => (mouse.active = false));
  addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("a, button, input, textarea, label, summary")) return;
    burst(e.clientX, e.clientY);
    if (stage.reduced) draw(0);
  });

  let last = performance.now();
  let lastScroll = scrollY;
  let reefDocH = 0;

  function draw(now: number) {
    const dt = stage.reduced ? 1 : Math.min(3, (now - last) / 16.67);
    last = now;
    const time = stage.reduced ? 0 : now / 1000;
    const scrollDy = scrollY - lastScroll;
    lastScroll = scrollY;
    measure();
    // fonts and hydrating islands change the page height, and the reef is laid out against it
    if (stage.docH !== reefDocH) {
      reefDocH = stage.docH;
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
    // creatures are drawn in page coordinates, shifted by the scroll, and only when visible
    const inWorld = (fn: () => void) => {
      g!.save();
      g!.translate(0, -scrollY);
      fn();
      g!.restore();
    };
    inWorld(() => {
      drawReef(time);
      drawOutcrops(time);
      for (const f of fish) if (f.z < 0.5 && onScreen(f.y, 80)) drawFish(f);
    });
    drawSnow(time, stage.reduced ? 0 : dt, stage.reduced ? 0 : scrollDy, deep);
    inWorld(() => {
      for (const s of sharks) if (onScreen(s.y, s.len)) drawShark(s);
      for (const f of fish) if (f.z >= 0.5 && onScreen(f.y, 80)) drawFish(f);
      for (const a of anglers) if (onScreen(a.y, a.size * 3)) drawAngler(a, time);
    });
    drawBubbles(time, stage.reduced ? 0 : dt);
  }

  function loop(now: number) {
    draw(now);
    requestAnimationFrame(loop);
  }

  function resize() {
    stage.DPR = Math.min(devicePixelRatio || 1, 1.5);
    stage.W = innerWidth;
    stage.H = innerHeight;
    ocean.width = stage.W * stage.DPR;
    ocean.height = stage.H * stage.DPR;
    rays.resize();
    buildMesh();
    measure();
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
    addEventListener("scroll", () => draw(0), { passive: true });
    draw(0);
  } else {
    requestAnimationFrame(loop);
  }
}
