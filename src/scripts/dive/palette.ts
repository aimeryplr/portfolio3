export type RGB = [number, number, number];

// one water function used by every layer: 0 = surface, 1 = abyss
const STOPS: [number, RGB][] = [
  [0, [24, 116, 134]],
  [0.3, [12, 66, 102]],
  [0.65, [7, 31, 62]],
  [1, [3, 9, 22]],
];

export function water(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, a] = STOPS[i - 1];
      const [t1, b] = STOPS[i];
      return mix(a, b, (t - t0) / (t1 - t0));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export const rgb = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
export const scale = (c: RGB, s: number): RGB => [c[0] * s, c[1] * s, c[2] * s];
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
