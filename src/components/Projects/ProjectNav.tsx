import { useEffect, useRef, useState, useCallback } from "react";

interface ProjectEntry {
  id: string;
  name: string;
}

interface Props {
  projects: ProjectEntry[];
}

const MAX_WIDTH = 64;
const MIN_WIDTH = 24;
const INFLUENCE_PX = 500;

function resolveAccentRgb(): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function rgba(rgb: [number, number, number], a: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export default function ProjectNav({ projects }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const accentRef = useRef<[number, number, number]>([0, 0, 0]);
  const rafRef = useRef(0);
  const visibleRef = useRef(false);
  const hoveredRef = useRef<number | null>(null);
  const currentWidths = useRef<number[]>([]);
  const currentAlphas = useRef<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const update = useCallback(() => {
    const viewportCenter = window.innerHeight / 2;
    const rgb = accentRef.current;
    const lerp = 0.12;

    if (currentWidths.current.length !== projects.length) {
      currentWidths.current = projects.map(() => MIN_WIDTH);
      currentAlphas.current = projects.map(() => 0.15);
    }

    projects.forEach(({ id }, i) => {
      const bar = barsRef.current[i];
      const label = labelsRef.current[i];
      const target = document.getElementById(id);
      if (!bar || !target) return;

      const rect = target.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const dist = Math.abs(elCenter - viewportCenter);

      const t = Math.max(0, 1 - dist / INFLUENCE_PX);

      const targetWidth = MIN_WIDTH + t * (MAX_WIDTH - MIN_WIDTH);
      const targetAlpha = 0.15 + t * 0.75;

      currentWidths.current[i] += (targetWidth - currentWidths.current[i]) * lerp;
      currentAlphas.current[i] += (targetAlpha - currentAlphas.current[i]) * lerp;

      const w = currentWidths.current[i];
      const a = currentAlphas.current[i];

      bar.style.width = `${w}px`;
      bar.style.backgroundColor = rgba(rgb, a);
    });

    let closestIdx = 0;
    let closestDist = Infinity;
    projects.forEach(({ id }, i) => {
      const target = document.getElementById(id);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });

    projects.forEach((_, i) => {
      const label = labelsRef.current[i];
      if (!label) return;
      const show = i === closestIdx || hoveredRef.current === i;
      label.style.opacity = show ? "1" : "0";
      label.style.transform = show ? "translateX(0)" : "translateX(8px)";
    });

    rafRef.current = requestAnimationFrame(update);
  }, [projects]);

  useEffect(() => {
    if (isMobile) return;
    accentRef.current = resolveAccentRgb();

    const section = document.getElementById("projects-section");
    const nav = navRef.current;
    if (!section || !nav) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        nav.style.opacity = entry.isIntersecting ? "1" : "0";
        nav.style.pointerEvents = entry.isIntersecting ? "auto" : "none";

        if (entry.isIntersecting) {
          rafRef.current = requestAnimationFrame(update);
        } else {
          cancelAnimationFrame(rafRef.current);
        }
      },
      { threshold: 0 },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [projects, isMobile, update]);

  function onHover(i: number | null) {
    hoveredRef.current = i;
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (isMobile) return null;

  return (
    <nav
      ref={navRef}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end gap-2 transition-opacity duration-500"
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      {projects.map(({ id, name }, i) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          aria-label={`Scroll to ${name}`}
          className="flex items-center gap-2 cursor-pointer border-none bg-transparent p-0"
        >
          <span
            ref={(el) => { labelsRef.current[i] = el; }}
            className="text-sm font-semibold whitespace-nowrap select-none transition-all duration-200"
            style={{
              color: "white",
              opacity: 0,
              transform: "translateX(8px)",
            }}
          >
            {name}
          </span>
          <div
            ref={(el) => { barsRef.current[i] = el; }}
            style={{
              width: MIN_WIDTH,
              height: 8,
              borderRadius: "3px 0 0 3px",
              flexShrink: 0,
            }}
          />
        </button>
      ))}
    </nav>
  );
}
