/**
 * CRT television shader — GLSL ShaderMaterial version.
 *
 * Ported from the TSL NodeMaterial version to standard GLSL so it works
 * with R3F's default WebGLRenderer (no WebGPU required).
 *
 * Effects: barrel distortion, horizontal roll, horizontal tear, phosphor glow,
 * scanlines, RGB sub-pixel pattern, chromatic aberration, flicker, static noise,
 * interlace shimmer, vignette, edge bloom, warm color grading, OOB masking.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  GLSL source                                                        */
/* ------------------------------------------------------------------ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uFlickerIntensity;
  uniform float uStaticIntensity;
  uniform float uReactionIntensity;

  /* --- Pseudo-random hash --- */
  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  /* --- Smooth 2D noise (bilinear interpolation of hash corners) --- */
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep

    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float t = uTime;
    float reaction = uReactionIntensity;

    vec2 uvCoord = vUv;

    /* --- Barrel distortion (CRT glass curvature) --- */
    vec2 centered = uvCoord - vec2(0.5);
    float dist = length(centered);
    float distSq = dist * dist;
    uvCoord = vec2(0.5) + centered * (1.0 + 0.22 * distSq);

    /* --- Horizontal roll (VHS tracking artifact) --- */
    float rollSpeed = 0.6 + reaction * 2.0;
    float rollY = fract(t * rollSpeed * 0.08);
    float rollBand = smoothstep(0.0, 0.06, abs(uvCoord.y - rollY))
                   * smoothstep(0.0, 0.06, abs(uvCoord.y - (rollY - 1.0)));
    float rollShift = (1.0 - rollBand) * 0.03 * (1.0 + reaction * 4.0);
    uvCoord.x += rollShift;

    /* --- Horizontal tear (signal glitch) --- */
    float tearLine = step(0.993, rand(vec2(floor(t * 10.0), 0.0)));
    float tearY = rand(vec2(floor(t * 10.0), 1.0));
    float tearActive = tearLine * step(abs(uvCoord.y - tearY), 0.015);
    uvCoord.x += tearActive * 0.08 * (1.0 + reaction * 3.0);

    /* --- Base phosphor glow --- */
    vec3 coldGreen = vec3(0.25, 0.85, 0.35);
    vec3 warmAmber = vec3(0.9, 0.6, 0.15);
    vec3 hotWhite  = vec3(0.95, 1.0, 0.9);

    float amberMix = clamp(0.2 + 0.15 * sin(t * 1.2) + reaction * 0.5, 0.0, 1.0);
    vec3 baseColor = mix(
      mix(coldGreen, warmAmber, amberMix),
      hotWhite,
      clamp(reaction * 0.6, 0.0, 1.0)
    );

    /* Center hotspot (electron beam convergence) */
    float centerGlow = 1.0 + 0.6 * exp(distSq * -6.0);
    vec3 color = baseColor * centerGlow;

    /* --- Scanlines --- */
    float scanFreq = 280.0;
    float scanWobble = sin(t * 0.7 + uvCoord.x * 15.0) * 0.8;
    float scanRaw = sin(uvCoord.y * scanFreq + t * 1.5 + scanWobble);
    float scanEffect = 0.85 + 0.15 * scanRaw;
    color *= scanEffect;

    /* --- RGB phosphor sub-pixel pattern --- */
    float subpixelFreq = 500.0;
    float px = mod(uvCoord.x * subpixelFreq, 3.0);
    vec3 subpixelMask = vec3(
      smoothstep(0.0, 0.8, 1.0 - abs(px - 0.5)),
      smoothstep(0.0, 0.8, 1.0 - abs(px - 1.5)),
      smoothstep(0.0, 0.8, 1.0 - abs(px - 2.5))
    );
    color *= mix(vec3(1.0), subpixelMask * 1.4, 0.3);

    /* --- Chromatic aberration --- */
    float chromaStr = 0.004 + reaction * 0.006 + distSq * 0.008;
    float rShiftFactor = 1.0 + noise2D(uvCoord * 40.0 + t * 0.3) * chromaStr * 0.08;
    float bShiftFactor = 1.0 + noise2D(uvCoord * 35.0 - t * 0.2) * chromaStr * 0.06;
    color.r *= rShiftFactor;
    color.b *= bShiftFactor;

    /* --- Flicker (power instability) --- */
    float flicker = 1.0
      - uFlickerIntensity * rand(vec2(floor(t * 6.0), 0.0)) * 0.08
      - reaction * 0.06 * sin(t * 25.0);
    color *= flicker;

    /* --- Static noise --- */
    float noiseAmount = uStaticIntensity + reaction * 0.12;
    float noiseVal = rand(uvCoord * 800.0 + t * 7.0) * noiseAmount;
    color += noiseVal * vec3(0.15, 0.2, 0.12);

    /* --- Interlace shimmer --- */
    float interlace = 0.96 + 0.04 * step(0.5, mod(uvCoord.y * 560.0 + t * 4.0, 2.0));
    color *= interlace;

    /* --- Vignette --- */
    float vignette = max(1.0 - distSq * 2.5 * 0.5, 0.0);
    color *= vignette;

    /* --- Screen edge phosphor bloom --- */
    float edgeDist = max(abs(centered.x), abs(centered.y));
    float edgeBloom = smoothstep(0.38, 0.48, edgeDist) * 0.15;
    color += vec3(edgeBloom * 0.4, edgeBloom, edgeBloom * 0.6);

    /* --- Warm color grading --- */
    color *= vec3(0.82, 1.0, 0.88);

    /* --- Final brightness --- */
    color *= 2.8 + reaction * 1.2;

    /* --- Out-of-bounds masking (barrel distortion overflow) --- */
    if (uvCoord.x < 0.0 || uvCoord.x > 1.0 || uvCoord.y < 0.0 || uvCoord.y > 1.0) {
      color = vec3(0.0);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/*  Uniforms — exported so TV.tsx can update them per-frame            */
/* ------------------------------------------------------------------ */

export interface CrtUniforms {
  uTime: THREE.IUniform<number>;
  uFlickerIntensity: THREE.IUniform<number>;
  uStaticIntensity: THREE.IUniform<number>;
  uReactionIntensity: THREE.IUniform<number>;
}

export function createCrtUniforms(): CrtUniforms {
  return {
    uTime: {value: 0},
    uFlickerIntensity: {value: 1.0},
    uStaticIntensity: {value: 0.06},
    uReactionIntensity: {value: 0.0},
  };
}

/* ------------------------------------------------------------------ */
/*  Factory — creates a ready-to-use ShaderMaterial                    */
/* ------------------------------------------------------------------ */

export function createCrtMaterial(name: string): THREE.ShaderMaterial {
  const uniforms = createCrtUniforms();
  const mat = new THREE.ShaderMaterial({
    name,
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide,
  });
  return mat;
}
