import { MAX_DEPTH, maxScroll, pageDepth } from "./stage.ts";

// The dive computer HUD: depth, water temperature, dive time, and a gauge whose stops jump to each section.
export function startDiveComputer(root: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gauge = root.querySelector<HTMLElement>("[data-gauge]")!;
  const marker = root.querySelector<HTMLElement>("[data-marker]")!;
  const depthEl = root.querySelector<HTMLElement>("[data-hud-depth]")!;
  const tempEl = root.querySelector<HTMLElement>("[data-hud-temp]")!;
  const timeEl = root.querySelector<HTMLElement>("[data-hud-time]")!;
  const pressEl = root.querySelector<HTMLElement>("[data-hud-press]")!;
  const diver = root.querySelector<SVGElement>("[data-diver]")!;
  const fins = root.querySelector<SVGElement>("[data-fins]")!;
  const stops = [...document.querySelectorAll<HTMLElement>("[data-stop]")];

  const metersFor = (el: HTMLElement) =>
    Math.max(0, Math.min(MAX_DEPTH, ((el.offsetTop - innerHeight * 0.3) / maxScroll()) * MAX_DEPTH));

  function layout() {
    gauge.querySelectorAll(".tick, .stopdot").forEach((n) => n.remove());
    for (let m = 0; m <= MAX_DEPTH; m += 5) {
      const t = document.createElement("div");
      t.className = "tick";
      t.style.top = `${(m / MAX_DEPTH) * 100}%`;
      t.style.width = m % 10 ? "5px" : "9px";
      gauge.appendChild(t);
    }
    for (const el of stops) {
      const m = metersFor(el);
      const b = document.createElement("button");
      b.className = "stopdot";
      b.style.top = `${(m / MAX_DEPTH) * 100}%`;
      b.textContent = `${m.toFixed(0).padStart(2, " ")} m  ${el.dataset.stop}`;
      b.addEventListener("click", () => el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }));
      gauge.appendChild(b);
      const lbl = el.querySelector("[data-depth-label]");
      if (lbl) lbl.textContent = `// -${m.toFixed(0)} m`;
    }
  }

  function update() {
    const depth = pageDepth();
    depthEl.innerHTML = `${(depth * MAX_DEPTH).toFixed(1)}<small> m</small>`;
    tempEl.innerHTML = `${Math.round(26 - depth * 8)}<small>°C</small>`;
    marker.style.top = `${depth * 100}%`;
    // one atmosphere at the surface, plus one bar every 10 m of water
    const bar = 1 + (depth * MAX_DEPTH) / 10;
    pressEl.innerHTML = `${bar.toFixed(1)}<small> bar</small>`;
  }

  // the diver levels out when resting, tips head down on the way down and head up on the way back
  let lastDepth = pageDepth();
  let speed = 0;
  let angle = 0;
  let kick = 0;
  function swim(time: number) {
    const depth = pageDepth();
    speed += ((depth - lastDepth) * 60 - speed) * 0.15;
    lastDepth = depth;
    const target = depth < 0.01 ? 0 : Math.max(-70, Math.min(70, speed * 900));
    angle += (target - angle) * 0.08;
    kick += 0.08 + Math.min(0.25, Math.abs(speed) * 40);
    const bob = Math.sin(time * 0.002) * 1.2;
    diver.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${angle.toFixed(1)}deg)`;
    fins.style.transform = `rotate(${(Math.sin(kick) * 12).toFixed(1)}deg)`;
    requestAnimationFrame(swim);
  }
  if (!reduced) requestAnimationFrame(swim);

  const t0 = Date.now();
  setInterval(() => {
    const s = ((Date.now() - t0) / 1000) | 0;
    timeEl.textContent = `${String((s / 60) | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  // the page height changes when islands hydrate or images load: re-place the stops
  new ResizeObserver(layout).observe(document.body);
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", layout);
  layout();
  update();
}

// safety stop countdown, runs while the contact section is in view
export function startSafetyStop(timerEl: HTMLElement) {
  let left = 180;
  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.4 }).observe(
    timerEl.closest("section, footer") ?? timerEl,
  );
  setInterval(() => {
    if (!visible || left <= 0) return;
    left--;
    timerEl.textContent = left ? `${(left / 60) | 0}:${String(left % 60).padStart(2, "0")}` : "OK, surface !";
  }, 1000);
}
