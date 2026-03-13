/**
 * CRT television shader — TSL (Three Shading Language) NodeMaterial version.
 *
 * Replaces the old GLSL ShaderMaterial with a node graph that compiles to
 * WGSL (WebGPU) or GLSL (WebGL2 fallback) automatically.
 *
 * Effects: barrel distortion, horizontal roll, horizontal tear, phosphor glow,
 * scanlines, RGB sub-pixel pattern, chromatic aberration, flicker, static noise,
 * interlace shimmer, vignette, edge bloom, warm color grading, OOB masking.
 */

import {
  abs,
  add,
  clamp,
  dot,
  exp,
  Fn,
  float,
  floor,
  fract,
  length,
  max,
  mix,
  mod,
  mul,
  select,
  sin,
  smoothstep,
  step,
  sub,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import {NodeMaterial} from 'three/webgpu';

/* ------------------------------------------------------------------ */
/*  Uniforms — exported so CrtTelevision.tsx can update them per-frame */
/* ------------------------------------------------------------------ */

export const crtUniforms = {
  time: uniform(0),
  flickerIntensity: uniform(1.0),
  staticIntensity: uniform(0.06),
  reactionIntensity: uniform(0.0),
};

/* ------------------------------------------------------------------ */
/*  Helper: deterministic pseudo-random (replaces GLSL rand)          */
/* ------------------------------------------------------------------ */

const rand = Fn(([co_immutable]: [ReturnType<typeof vec2>]) => {
  const co = co_immutable.toVar();
  return fract(sin(dot(co, vec2(12.9898, 78.233))).mul(43758.5453));
});

/* ------------------------------------------------------------------ */
/*  Helper: smooth 2D noise (bilinear interpolation of hash corners)  */
/* ------------------------------------------------------------------ */

const noise2D = Fn(([p_immutable]: [ReturnType<typeof vec2>]) => {
  const p = p_immutable.toVar();
  const i = floor(p).toVar();
  const f = fract(p).toVar();

  // smoothstep: f = f * f * (3 - 2*f)
  f.assign(f.mul(f).mul(sub(3.0, mul(2.0, f))));

  const a = rand(i);
  const b = rand(add(i, vec2(1.0, 0.0)));
  const c = rand(add(i, vec2(0.0, 1.0)));
  const d = rand(add(i, vec2(1.0, 1.0)));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
});

/* ------------------------------------------------------------------ */
/*  Main CRT fragment shader                                          */
/* ------------------------------------------------------------------ */

const crtFragment = Fn(() => {
  const t = crtUniforms.time;
  const reaction = crtUniforms.reactionIntensity;

  // Current UV from mesh attribute
  const uvCoord = uv().toVar();

  // --- Barrel distortion (CRT glass curvature) ---
  const centered = sub(uvCoord, vec2(0.5, 0.5)).toVar();
  const dist = length(centered);
  const distSq = dist.mul(dist).toVar();
  uvCoord.assign(add(vec2(0.5, 0.5), centered.mul(add(1.0, mul(0.22, distSq)))));

  // --- Horizontal roll (VHS tracking artifact) ---
  const rollSpeed = add(0.6, mul(reaction, 2.0));
  const rollY = fract(mul(t, rollSpeed, 0.08));
  const rollBand = smoothstep(float(0.0), float(0.06), abs(sub(uvCoord.y, rollY))).mul(
    smoothstep(float(0.0), float(0.06), abs(sub(uvCoord.y, sub(rollY, 1.0)))),
  );
  const rollShift = sub(1.0, rollBand)
    .mul(0.03)
    .mul(add(1.0, mul(reaction, 4.0)));
  uvCoord.x.addAssign(rollShift);

  // --- Horizontal tear (signal glitch) ---
  const tearLine = step(0.993, rand(vec2(floor(mul(t, 10.0)), float(0.0))));
  const tearY = rand(vec2(floor(mul(t, 10.0)), float(1.0)));
  const tearActive = tearLine.mul(step(abs(sub(uvCoord.y, tearY)), float(0.015)));
  uvCoord.x.addAssign(tearActive.mul(0.08).mul(add(1.0, mul(reaction, 3.0))));

  // --- Base phosphor glow ---
  const coldGreen = vec3(0.25, 0.85, 0.35);
  const warmAmber = vec3(0.9, 0.6, 0.15);
  const hotWhite = vec3(0.95, 1.0, 0.9);

  const amberMix = clamp(add(0.2, mul(0.15, sin(mul(t, 1.2))), mul(reaction, 0.5)), 0.0, 1.0);
  const baseColor = mix(
    mix(coldGreen, warmAmber, amberMix),
    hotWhite,
    clamp(mul(reaction, 0.6), 0.0, 1.0),
  ).toVar();

  // Center hotspot (electron beam convergence)
  const centerGlow = add(1.0, mul(0.6, exp(mul(distSq, -6.0))));
  const color = mul(baseColor, centerGlow).toVar();

  // --- Scanlines ---
  const scanFreq = float(280.0);
  const scanWobble = mul(sin(add(mul(t, 0.7), mul(uvCoord.x, 15.0))), 0.8);
  const scanRaw = sin(add(mul(uvCoord.y, scanFreq), mul(t, 1.5), scanWobble));
  const scanEffect = add(0.85, mul(0.15, scanRaw));
  color.mulAssign(scanEffect);

  // --- RGB phosphor sub-pixel pattern ---
  const subpixelFreq = float(500.0);
  const px = mod(mul(uvCoord.x, subpixelFreq), 3.0);
  const subpixelMask = vec3(
    smoothstep(float(0.0), float(0.8), sub(1.0, abs(sub(px, 0.5)))),
    smoothstep(float(0.0), float(0.8), sub(1.0, abs(sub(px, 1.5)))),
    smoothstep(float(0.0), float(0.8), sub(1.0, abs(sub(px, 2.5)))),
  );
  color.mulAssign(mix(vec3(1.0, 1.0, 1.0), mul(subpixelMask, 1.4), 0.3));

  // --- Chromatic aberration ---
  const chromaStr = add(0.004, mul(reaction, 0.006), mul(distSq, 0.008));
  const rShiftFactor = add(
    1.0,
    mul(noise2D(add(mul(uvCoord, 40.0), mul(t, 0.3))), chromaStr, 0.08),
  );
  const bShiftFactor = add(
    1.0,
    mul(noise2D(sub(mul(uvCoord, 35.0), mul(t, 0.2))), chromaStr, 0.06),
  );
  color.x.mulAssign(rShiftFactor);
  color.z.mulAssign(bShiftFactor);

  // --- Flicker (power instability) ---
  const flicker = sub(
    sub(1.0, mul(crtUniforms.flickerIntensity, rand(vec2(floor(mul(t, 6.0)), float(0.0))), 0.08)),
    mul(reaction, 0.06, sin(mul(t, 25.0))),
  );
  color.mulAssign(flicker);

  // --- Static noise ---
  const noiseAmount = add(crtUniforms.staticIntensity, mul(reaction, 0.12));
  const noiseVal = mul(rand(add(mul(uvCoord, 800.0), mul(t, 7.0))), noiseAmount);
  color.addAssign(mul(noiseVal, vec3(0.15, 0.2, 0.12)));

  // --- Interlace shimmer ---
  const interlace = add(
    0.96,
    mul(0.04, step(0.5, mod(add(mul(uvCoord.y, 560.0), mul(t, 4.0)), 2.0))),
  );
  color.mulAssign(interlace);

  // --- Vignette ---
  const vignette = max(sub(1.0, mul(distSq, 2.5, 0.5)), 0.0);
  color.mulAssign(vignette);

  // --- Screen edge phosphor bloom ---
  const edgeDist = max(abs(centered.x), abs(centered.y));
  const edgeBloom = mul(smoothstep(float(0.38), float(0.48), edgeDist), 0.15);
  color.addAssign(vec3(mul(edgeBloom, 0.4), edgeBloom, mul(edgeBloom, 0.6)));

  // --- Warm color grading ---
  color.mulAssign(vec3(0.82, 1.0, 0.88));

  // --- Final brightness ---
  color.mulAssign(add(2.8, mul(reaction, 1.2)));

  // --- Out-of-bounds masking (barrel distortion overflow) ---
  const oob = uvCoord.x
    .lessThan(0.0)
    .or(uvCoord.x.greaterThan(1.0))
    .or(uvCoord.y.lessThan(0.0))
    .or(uvCoord.y.greaterThan(1.0));
  const finalColor = select(oob, vec3(0.0, 0.0, 0.0), color);

  return vec4(finalColor, 1.0);
});

/* ------------------------------------------------------------------ */
/*  Factory — creates a ready-to-use NodeMaterial                     */
/* ------------------------------------------------------------------ */

export function createCrtMaterial(_name: string): InstanceType<typeof NodeMaterial> {
  const mat = new NodeMaterial();
  mat.fragmentNode = crtFragment();
  return mat;
}
