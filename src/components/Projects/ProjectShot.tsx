import { useId, type ReactNode } from "react";
import { area, curveCatmullRom } from "d3-shape";
import { randomLcg } from "d3-random";

interface Props {
  children: ReactNode;
  // any string unique to the project: the same seed always draws the same wave
  seed: string;
}

type Point = [number, number];

// the wave's look; heights are fractions of the shot's height, the box being 0..1 on both axes
const wave = {
  // where the wave sits: 0 is the top of the shot, 1 the bottom
  base: 0.93,
  // how many points the curve passes through, both ends included: more points, more bumps
  points: { min: 4, max: 6 },
  // how far a bump reaches above or below the base
  amplitude: { min: 0.028, max: 0.062 },
  // the smallest bump, as a share of the amplitude, so no bump goes flat
  minBump: 0.3,
  // how far inner points drift sideways, as a share of the gap between two points
  drift: 0.3,
};

// FNV-1a: turns the seed string into a 32-bit number for randomLcg
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// a wave's points from left to right, in 0..1 units of the shot's box
function wavePoints(next: () => number): Point[] {
  const count = wave.points.min + Math.floor(next() * (wave.points.max - wave.points.min + 1));
  const amplitude = wave.amplitude.min + next() * (wave.amplitude.max - wave.amplitude.min);
  // whether the wave starts low or high
  const phase = next() < 0.5 ? 0 : 1;
  return Array.from({ length: count }, (_, i) => {
    // inner points drift sideways so the bumps aren't evenly spaced, but not so far they bunch up into a kink
    const x = i === 0 || i === count - 1 ? i / (count - 1) : (i + (next() - 0.5) * wave.drift) / (count - 1);
    // alternate up and down so it reads as a wave, not as noise; the size of each bump varies
    const y = wave.base + ((i + phase) % 2 ? -1 : 1) * amplitude * (wave.minBump + next() * (1 - wave.minBump));
    return [x, y];
  });
}

// everything between the top edge and the wave, smoothed through every point
const shape = area<Point>()
  .x(([x]) => x)
  .y0(0)
  .y1(([, y]) => y)
  .curve(curveCatmullRom)
  .digits(4);

// the screenshot (an Astro <Image /> passed through a slot), bleeding to the card's edges and cut along a wave
export default function ProjectShot({ children, seed }: Props) {
  // one clip path per card, so the ids don't collide on the page (React 19.2 ids like _R_0_ need no escaping in url())
  const clipId = useId();
  const clip = shape(wavePoints(randomLcg(hash(seed)))) ?? "";
  return (
    // the negative margins undo the card padding set on .card in global.css
    <div className="relative -mx-[22px] -mt-[22px] aspect-[3324/1696] rounded-[inherit]">
      <svg className="absolute size-0" aria-hidden="true">
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <path d={clip} />
        </clipPath>
      </svg>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-accent/5" style={{ clipPath: `url(#${clipId})` }}>
        {children}
      </div>
    </div>
  );
}
