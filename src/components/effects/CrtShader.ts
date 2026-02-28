import * as THREE from 'three';

const CRT_VERTEX = `
precision highp float;

varying vec2 vUV;

void main() {
  vUV = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CRT_FRAGMENT = `
precision highp float;

varying vec2 vUV;

uniform float time;
uniform float flickerIntensity;
uniform float staticIntensity;
uniform float reactionIntensity;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise for organic effects
float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = vUV;

  // --- Barrel distortion (CRT glass curvature) ---
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float distSq = dist * dist;
  uv = 0.5 + centered * (1.0 + 0.22 * distSq);

  // --- Horizontal roll (VHS tracking artifact) ---
  float rollSpeed = 0.6 + reactionIntensity * 2.0;
  float rollY = fract(time * rollSpeed * 0.08);
  float rollBand = smoothstep(0.0, 0.06, abs(uv.y - rollY)) *
                   smoothstep(0.0, 0.06, abs(uv.y - rollY - 1.0));
  float rollShift = (1.0 - rollBand) * 0.03 * (1.0 + reactionIntensity * 4.0);
  uv.x += rollShift;

  // --- Horizontal tear (signal glitch) ---
  float tearLine = step(0.993, rand(vec2(floor(time * 10.0), 0.0)));
  float tearY = rand(vec2(floor(time * 10.0), 1.0));
  float tearActive = tearLine * step(abs(uv.y - tearY), 0.015);
  uv.x += tearActive * 0.08 * (1.0 + reactionIntensity * 3.0);

  // --- Base phosphor glow (BRIGHT -- sells the CRT effect) ---
  vec3 coldGreen = vec3(0.25, 0.85, 0.35);
  vec3 warmAmber = vec3(0.90, 0.60, 0.15);
  vec3 hotWhite  = vec3(0.95, 1.0, 0.90);

  // Pulse between green and amber; reactions push toward hot white
  float amberMix = 0.2 + 0.15 * sin(time * 1.2) + reactionIntensity * 0.5;
  vec3 baseColor = mix(coldGreen, warmAmber, clamp(amberMix, 0.0, 1.0));
  baseColor = mix(baseColor, hotWhite, clamp(reactionIntensity * 0.6, 0.0, 1.0));

  // Brighter center hotspot (like real CRT electron beam convergence)
  float centerGlow = 1.0 + 0.6 * exp(-distSq * 6.0);
  vec3 color = baseColor * centerGlow;

  // --- Scanlines (visible horizontal bands) ---
  float scanFreq = 280.0;
  float scanWobble = sin(time * 0.7 + uv.x * 15.0) * 0.8;
  float scanRaw = sin(uv.y * scanFreq + time * 1.5 + scanWobble);
  // Darken scan valleys, brighten peaks
  float scanEffect = 0.85 + 0.15 * scanRaw;
  color *= scanEffect;

  // --- RGB phosphor sub-pixel pattern ---
  float subpixelFreq = 500.0;
  float px = mod(uv.x * subpixelFreq, 3.0);
  vec3 subpixelMask = vec3(
    smoothstep(0.0, 0.8, 1.0 - abs(px - 0.5)),
    smoothstep(0.0, 0.8, 1.0 - abs(px - 1.5)),
    smoothstep(0.0, 0.8, 1.0 - abs(px - 2.5))
  );
  // Blend: 70% colored sub-pixels + 30% white (so it doesn't go too dark)
  color *= mix(vec3(1.0), subpixelMask * 1.4, 0.3);

  // --- Chromatic aberration (RGB fringing at edges) ---
  float chromaStr = 0.004 + reactionIntensity * 0.006 + distSq * 0.008;
  vec2 rOffset = centered * chromaStr;
  vec2 bOffset = -centered * chromaStr * 0.7;
  // Approximate: shift R and B channels by sampling base color at offset UVs
  float rShiftFactor = 1.0 + noise2D(uv * 40.0 + time * 0.3) * 0.08;
  float bShiftFactor = 1.0 + noise2D(uv * 35.0 - time * 0.2) * 0.06;
  color.r *= rShiftFactor;
  color.b *= bShiftFactor;

  // --- Flicker (power instability) ---
  float flicker = 1.0 - flickerIntensity * rand(vec2(floor(time * 6.0), 0.0)) * 0.08;
  flicker -= reactionIntensity * 0.06 * sin(time * 25.0);
  color *= flicker;

  // --- Static noise (signal interference) ---
  float noiseAmount = staticIntensity + reactionIntensity * 0.12;
  float noiseVal = rand(uv * 800.0 + time * 7.0) * noiseAmount;
  color += noiseVal * vec3(0.15, 0.2, 0.12);

  // --- Interlace shimmer (alternating field visibility) ---
  float interlace = 0.96 + 0.04 * step(0.5, mod(uv.y * 560.0 + time * 4.0, 2.0));
  color *= interlace;

  // --- Vignette (darker edges like real CRT) ---
  float vignette = 1.0 - 0.5 * distSq * 2.5;
  vignette = max(vignette, 0.0);
  color *= vignette;

  // --- Screen edge phosphor bloom ---
  float edgeDist = max(abs(centered.x), abs(centered.y));
  float edgeBloom = smoothstep(0.38, 0.48, edgeDist) * 0.15;
  color += vec3(edgeBloom * 0.4, edgeBloom, edgeBloom * 0.6);

  // --- Warm color grading (CRT phosphor temperature) ---
  color *= vec3(0.82, 1.0, 0.88);

  // --- Final brightness (cranked up to make the CRT POP in the dark kitchen) ---
  color *= 2.8 + reactionIntensity * 1.2;

  // --- Out-of-bounds (barrel distortion overflow) ---
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createCrtMaterial(_name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CRT_VERTEX,
    fragmentShader: CRT_FRAGMENT,
    uniforms: {
      time: {value: 0},
      flickerIntensity: {value: 1.0},
      staticIntensity: {value: 0.06},
      reactionIntensity: {value: 0.0},
    },
  });
}
