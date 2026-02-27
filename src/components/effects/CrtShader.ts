import { Effect, ShaderMaterial, type Scene } from '@babylonjs/core';

const CRT_VERTEX = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;

varying vec2 vUV;

void main() {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}
`;

const CRT_FRAGMENT = `
precision highp float;

varying vec2 vUV;

uniform float time;
uniform float flickerIntensity;
uniform float staticIntensity;

// Pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUV;

  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  uv = 0.5 + centered * (1.0 + 0.15 * dist * dist);

  // Base CRT green glow
  vec3 color = vec3(0.05, 0.15, 0.08);

  // Scanlines
  float scanline = sin(uv.y * 400.0 + time * 2.0) * 0.08;

  // Flicker
  float flicker = 1.0 - flickerIntensity * rand(vec2(time * 0.1, 0.0)) * 0.1;

  // Static noise
  float noise = rand(uv + time) * staticIntensity;

  // Vignette
  float vignette = 1.0 - 0.6 * dist * dist;

  // Combine
  color = (color + scanline) * flicker * vignette + noise * 0.15;

  // CRT green tint
  color *= vec3(0.7, 1.0, 0.8);

  // Out-of-bounds black
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createCrtMaterial(name: string, scene: Scene): ShaderMaterial {
  // Register shaders with Babylon's Effect system
  Effect.ShadersStore[`${name}VertexShader`] = CRT_VERTEX;
  Effect.ShadersStore[`${name}FragmentShader`] = CRT_FRAGMENT;

  const material = new ShaderMaterial(name, scene, name, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'time', 'flickerIntensity', 'staticIntensity'],
    // No samplers — shader is purely procedural
  });

  // Set initial uniform values
  material.setFloat('time', 0);
  material.setFloat('flickerIntensity', 1.0);
  material.setFloat('staticIntensity', 0.05);

  return material;
}
