import { mix, type RGB } from "./palette.ts";
import { ctx } from "./stage.ts";

// A diver standing on the sand beside the contact form, waving. Drawn in its own model space,
// 800 units tall: x 400 is the middle of the body, y 942 the sand under the fins.

const hex = (h: number): RGB => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const lt = (c: RGB, t: number) => mix(c, [255, 255, 255], t);
const dk = (c: RGB, t: number) => mix(c, [0, 0, 0], t);
const SUIT = hex(0x2b3a55), GEAR = hex(0xff6b35), TANK = hex(0xf2c230), SKIN = hex(0xc68a64);
const C = {
  s0: lt(SUIT, 0.22), s1: SUIT, s2: dk(SUIT, 0.22), s3: dk(SUIT, 0.4),
  a0: lt(GEAR, 0.18), a1: GEAR, a2: dk(GEAR, 0.16), a3: dk(GEAR, 0.34),
  t0: lt(TANK, 0.25), t1: TANK, t2: dk(TANK, 0.22),
  skin0: lt(SKIN, 0.08), skin1: dk(SKIN, 0.1),
  g1: hex(0x1b1f24), g2: hex(0x2e353e), metal: hex(0xc9d1d6),
  lensL: hex(0x8fd3e8), lensR: hex(0x6fbcd6), white: hex(0xffffff),
};
type Key = keyof typeof C;
// a facet: its colour, its outline, and an opacity when it is a glint
type Facet = [Key, number[], number?];

const TANK_BACK: Facet[] = [
  ["t1", [320, 402, 480, 402, 484, 588, 462, 610, 338, 610, 316, 588]],
  ["t0", [316, 588, 320, 402, 352, 402, 350, 610, 338, 610]],
  ["t2", [448, 402, 480, 402, 484, 588, 462, 610, 450, 610]],
];
const LEGS: Facet[] = [
  ["s1", [312, 600, 398, 600, 318, 740]],
  ["s2", [398, 600, 392, 740, 318, 740]],
  ["s1", [318, 740, 392, 740, 322, 850]],
  ["s2", [392, 740, 370, 850, 322, 850]],
  ["s1", [402, 600, 488, 600, 408, 740]],
  ["s3", [488, 600, 482, 740, 408, 740]],
  ["s2", [408, 740, 482, 740, 430, 850]],
  ["s3", [482, 740, 478, 850, 430, 850]],
  ["a1", [340, 728, 356, 716, 372, 728, 356, 752]],
  ["a2", [428, 728, 444, 716, 460, 728, 444, 752]],
];
const FINS: Facet[] = [
  ["a0", [320, 845, 368, 845, 385, 930]],
  ["a1", [320, 845, 385, 930, 282, 930]],
  ["a3", [282, 930, 385, 930, 380, 942, 288, 942]],
  ["a1", [432, 845, 480, 845, 415, 930]],
  ["a2", [480, 845, 518, 930, 415, 930]],
  ["a3", [415, 930, 518, 930, 512, 942, 420, 942]],
];
const TORSO: Facet[] = [
  ["s0", [305, 370, 400, 382, 295, 420]],
  ["s1", [400, 382, 400, 500, 295, 420]],
  ["s1", [295, 420, 400, 500, 330, 600]],
  ["s2", [330, 600, 400, 500, 400, 600]],
  ["s1", [400, 382, 495, 370, 505, 420]],
  ["s2", [400, 382, 505, 420, 400, 500]],
  ["s2", [505, 420, 470, 600, 400, 500]],
  ["s3", [400, 500, 470, 600, 400, 600]],
  // the vest, its chest strap and the weight belt
  ["a0", [310, 380, 375, 385, 300, 430]],
  ["a1", [375, 385, 360, 560, 300, 430]],
  ["a2", [300, 430, 360, 560, 335, 590]],
  ["a1", [490, 380, 425, 385, 500, 430]],
  ["a2", [425, 385, 440, 560, 500, 430]],
  ["a3", [500, 430, 440, 560, 465, 590]],
  ["g1", [358, 468, 442, 468, 442, 482, 358, 482]],
  ["metal", [392, 464, 408, 464, 410, 486, 390, 486]],
  ["g1", [326, 585, 474, 585, 474, 612, 326, 612]],
  ["g2", [326, 585, 400, 585, 326, 598]],
  ["metal", [386, 584, 414, 584, 414, 613, 386, 613]],
  ["white", [386, 584, 414, 584, 386, 600], 0.35],
  ["g2", [345, 588, 365, 588, 365, 609, 345, 609]],
  ["g2", [435, 588, 455, 588, 455, 609, 435, 609]],
];
const HEAD: Facet[] = [
  ["s2", [378, 345, 422, 345, 428, 378, 372, 378]],
  ["s0", [353, 228, 400, 212, 400, 285]],
  ["s1", [400, 212, 447, 228, 400, 285]],
  ["s2", [447, 228, 465, 272, 400, 285]],
  ["s3", [465, 272, 457, 322, 400, 285]],
  ["s2", [457, 322, 426, 352, 400, 285]],
  ["s2", [426, 352, 374, 352, 400, 285]],
  ["s1", [374, 352, 343, 322, 400, 285]],
  ["s1", [343, 322, 335, 272, 400, 285]],
  ["s0", [335, 272, 353, 228, 400, 285]],
  ["skin0", [362, 258, 400, 258, 400, 334, 378, 334, 354, 300]],
  ["skin1", [400, 258, 438, 258, 446, 300, 422, 334, 400, 334]],
  // the mask: strap, frame, two lenses catching the light
  ["g1", [335, 262, 356, 258, 356, 272, 336, 276]],
  ["g1", [465, 262, 444, 258, 444, 272, 464, 276]],
  ["g1", [356, 250, 444, 250, 450, 292, 412, 298, 400, 290, 388, 298, 350, 292]],
  ["lensL", [364, 257, 395, 257, 393, 288, 360, 286]],
  ["lensR", [405, 257, 436, 257, 440, 286, 407, 288]],
  ["white", [366, 259, 384, 259, 363, 276], 0.55],
  ["white", [407, 259, 420, 259, 406, 270], 0.35],
];
const REGULATOR: Facet[] = [
  ["g1", [384, 306, 416, 306, 422, 322, 408, 334, 392, 334, 378, 322]],
  ["a1", [392, 312, 408, 312, 412, 320, 408, 328, 392, 328, 388, 320]],
];
const HOSE = [418, 320, 446, 330, 462, 352, 472, 384];
// the left arm hangs still at the side
const ARM_STILL: Facet[] = [
  ["s0", [278, 384, 300, 368, 326, 376, 318, 398]],
  ["s0", [280, 380, 316, 396, 264, 494]],
  ["s1", [316, 396, 300, 500, 264, 494]],
  ["s1", [264, 494, 273, 480, 291, 480, 300, 497, 291, 512, 273, 512]],
  ["s1", [264, 494, 300, 500, 268, 596]],
  ["s2", [300, 500, 296, 598, 268, 596]],
  ["g2", [266, 594, 282, 595, 282, 652, 272, 650, 262, 626]],
  ["g1", [282, 595, 298, 596, 304, 630, 292, 652, 282, 652]],
];
const UPPER_ARM: Facet[] = [
  ["s1", [482, 376, 502, 368, 522, 388, 512, 404]],
  ["s0", [494, 378, 574, 316, 596, 344]],
  ["s1", [494, 378, 596, 344, 516, 406]],
];
// the raised forearm and its open glove, turning about the elbow
const ELBOW = [585, 330];
const FOREARM: Facet[] = [
  ["s0", [569, 334, 588, 213, 614, 215]],
  ["s1", [569, 334, 614, 215, 601, 334]],
  ["s1", [567, 330, 576, 314, 594, 314, 603, 330, 594, 346, 576, 346]],
  ["g2", [586, 212, 582, 196, 562, 182, 556, 190, 574, 214]],
  ["g2", [580, 188, 589, 186, 588, 150, 580, 152]],
  ["g2", [590, 186, 599, 184, 600, 142, 591, 143]],
  ["g1", [600, 184, 609, 185, 612, 146, 603, 146]],
  ["g1", [610, 186, 622, 188, 624, 158, 615, 156]],
  ["g2", [584, 222, 602, 222, 602, 178, 580, 186]],
  ["g1", [602, 222, 618, 222, 624, 186, 602, 178]],
];

// shades a colour the way the depth and the water around the diver tint it
export type Paint = (c: RGB, alpha: number) => string;

export const diver = { on: false, x: 0, y: 0, size: 400 };

function draw(facets: Facet[], paint: Paint) {
  const g = ctx();
  for (const [key, pts, alpha] of facets) {
    const col = paint(C[key], alpha ?? 1);
    g.fillStyle = col;
    g.strokeStyle = col;
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fill();
    if (alpha === undefined) g.stroke();
  }
}

// how far through a burst of waving: eases in, waves for a while, eases out, rests with the hand up
function waving(time: number) {
  const t = time % 7;
  return Math.min(1, t / 0.4) * (1 - Math.min(1, Math.max(0, (t - 3.2) / 0.4)));
}

export function drawDiver(time: number, paint: Paint) {
  if (!diver.on) return;
  const g = ctx();
  const s = diver.size / 800;
  // a slow breath: the chest lifts and the head with it, the fins stay planted
  const breath = Math.sin(time * 1.3);
  const lift = breath * 3;
  const wave = (-1 + 15 * Math.sin(time * 3.5) * waving(time)) * (Math.PI / 180);

  g.save();
  g.translate(diver.x, diver.y);
  g.scale(s, s);
  g.translate(-400, -942);
  g.lineWidth = 1 / s;

  // a soft shadow on the sand
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.beginPath();
  for (const [x, y] of [[285, 936], [400, 924], [525, 936], [400, 956]]) g.lineTo(x, y);
  g.fill();

  draw(LEGS, paint);
  draw(FINS, paint);
  g.save();
  g.translate(0, -lift);
  draw(TANK_BACK, paint);
  draw(TORSO, paint);
  g.save();
  // the head nods a touch with each breath
  g.translate(400, 345);
  g.rotate(breath * 0.012);
  g.translate(-400, -345);
  draw(HEAD, paint);
  g.beginPath();
  for (let i = 0; i < HOSE.length; i += 2) g.lineTo(HOSE[i], HOSE[i + 1]);
  g.lineWidth = 9;
  g.lineJoin = "bevel";
  g.strokeStyle = paint(C.g1, 1);
  g.stroke();
  g.lineWidth = 1 / s;
  draw(REGULATOR, paint);
  g.restore();
  draw(ARM_STILL, paint);
  draw(UPPER_ARM, paint);
  g.save();
  g.translate(ELBOW[0], ELBOW[1]);
  g.rotate(wave);
  g.translate(-ELBOW[0], -ELBOW[1]);
  draw(FOREARM, paint);
  g.restore();
  g.restore();

  // bubbles leave the regulator on each breath out and wobble up past the head, growing as they rise
  g.lineWidth = 2;
  g.lineJoin = "round";
  for (let i = 0; i < 6; i++) {
    const p = (time * 0.22 + i / 6) % 1, r = 5 + p * 7;
    const cx = 470 + p * 30 + Math.sin(time * 1.8 + i * 2.1) * 10, cy = 300 - lift - p * 420;
    g.beginPath();
    for (let k = 0; k < 6; k++) g.lineTo(cx + Math.cos((k * Math.PI) / 3) * r, cy + Math.sin((k * Math.PI) / 3) * r);
    g.closePath();
    const fade = Math.min(1, p * 8) * (1 - p);
    g.fillStyle = `rgba(255,255,255,${(0.18 * fade).toFixed(3)})`;
    g.strokeStyle = `rgba(220,240,250,${(0.75 * fade).toFixed(3)})`;
    g.fill();
    g.stroke();
  }
  g.restore();
}

