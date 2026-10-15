import { stage } from "./stage.ts";

// React Bits <LightRays /> shader, ported from ogl to raw WebGL so it shares the ocean's frame loop.
// Props used: raysOrigin top-center, raysColor #bdf2f7, raysSpeed 0.8, lightSpread 0.9,
// rayLength 1.4, fadeDistance 1.0, followMouse, mouseInfluence 0.08, noiseAmount 0.08, distortion 0.05
const RAYS = {
  color: [0xbd / 255, 0xf2 / 255, 0xf7 / 255],
  speed: 0.8,
  spread: 0.9,
  length: 1.4,
  fade: 1.0,
  mouseInfluence: 0.08,
  noise: 0.08,
  distortion: 0.05,
};

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
const FRAG = `precision highp float;
uniform float iTime; uniform vec2 iResolution; uniform vec2 rayPos; uniform vec2 rayDir;
uniform vec3 raysColor; uniform float raysSpeed; uniform float lightSpread; uniform float rayLength;
uniform float fadeDistance; uniform vec2 mousePos; uniform float mouseInfluence;
uniform float noiseAmount; uniform float distortion; uniform float scrollY;
float noise(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed){
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float baseStrength = clamp((0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
                             (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)), 0.0, 1.0);
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
}
void main(){
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseDirection = normalize(mousePos * iResolution.xy - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  vec4 c = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed) * 0.5
         + vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed) * 0.4;
  if (noiseAmount > 0.0) { float n = noise(coord * 0.01 + iTime * 0.1); c.rgb *= (1.0 - noiseAmount + noiseAmount * n); }
  float brightness = max(0.0, 1.0 - ((coord.y + scrollY) / iResolution.y));
  c.x *= 0.1 + brightness * 0.8; c.y *= 0.3 + brightness * 0.6; c.z *= 0.5 + brightness * 0.5;
  c.rgb *= raysColor;
  gl_FragColor = c;
}`;

const UNIFORMS = [
  "iTime", "iResolution", "rayPos", "rayDir", "raysColor", "raysSpeed", "lightSpread",
  "rayLength", "fadeDistance", "mousePos", "mouseInfluence", "noiseAmount", "distortion", "scrollY",
] as const;

export function createLightRays(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true });
  if (!gl) return { resize() {}, draw() {} };

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  // one oversized triangle covers the screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)])) as Record<
    (typeof UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  gl.uniform3fv(u.raysColor, RAYS.color);
  gl.uniform1f(u.raysSpeed, RAYS.speed);
  gl.uniform1f(u.lightSpread, RAYS.spread);
  gl.uniform1f(u.rayLength, RAYS.length);
  gl.uniform1f(u.fadeDistance, RAYS.fade);
  gl.uniform1f(u.mouseInfluence, RAYS.mouseInfluence);
  gl.uniform1f(u.noiseAmount, RAYS.noise);
  gl.uniform1f(u.distortion, RAYS.distortion);
  gl.uniform2fv(u.rayDir, [0, 1]);

  const m = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
  addEventListener("pointermove", (e) => {
    m.x = e.clientX / stage.W;
    m.y = e.clientY / stage.H;
  });

  return {
    resize() {
      canvas.width = stage.W * stage.DPR;
      canvas.height = stage.H * stage.DPR;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2fv(u.iResolution, [canvas.width, canvas.height]);
    },
    draw(time: number) {
      // single-screen pages don't scroll, so the light fades with their depth instead
      const fade = stage.fixedDepth === null ? 1 : Math.max(0, 1 - stage.depth * 1.6);
      canvas.style.opacity = fade.toFixed(3);
      // the sun hangs above the top of the page and scrolls away with it
      const scroll = scrollY * stage.DPR;
      const source = -0.2 * canvas.height - scroll;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // past the rays' reach, or faded out: skip the GPU work
      if (fade <= 0 || -source > canvas.width * RAYS.length) return;
      m.sx = m.sx * 0.92 + m.x * 0.08;
      m.sy = m.sy * 0.92 + m.y * 0.08;
      gl.uniform1f(u.iTime, time);
      gl.uniform2fv(u.mousePos, [m.sx, m.sy]);
      gl.uniform2fv(u.rayPos, [0.5 * canvas.width, source]);
      gl.uniform1f(u.scrollY, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
