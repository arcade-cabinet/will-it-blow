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

void main() {
  vec2 uv = vUV;

  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  uv = 0.5 + centered * (1.0 + 0.18 * dist * dist);

  // Horizontal roll distortion
  float rollSpeed = 0.8 + reactionIntensity * 1.5;
  float rollY = fract(time * rollSpeed * 0.1);
  float rollBand = smoothstep(0.0, 0.08, abs(uv.y - rollY)) *
                   smoothstep(0.0, 0.08, abs(uv.y - rollY - 1.0));
  float rollShift = (1.0 - rollBand) * 0.02 * (1.0 + reactionIntensity * 3.0);
  uv.x += rollShift;

  // Horizontal tear
  float tearLine = step(0.995, rand(vec2(floor(time * 8.0), 0.0)));
  float tearY = rand(vec2(floor(time * 8.0), 1.0));
  float tearActive = tearLine * step(abs(uv.y - tearY), 0.01);
  uv.x += tearActive * 0.05 * (1.0 + reactionIntensity * 2.0);

  // Base CRT phosphor glow
  vec3 baseGreen = vec3(0.04, 0.14, 0.06);
  vec3 warmAmber = vec3(0.12, 0.08, 0.02);
  float amberPulse = reactionIntensity * 0.5 + 0.15 * sin(time * 1.5);
  vec3 color = mix(baseGreen, warmAmber, clamp(amberPulse, 0.0, 1.0));

  // Brighter center glow
  float centerGlow = 1.0 + 0.3 * exp(-dist * dist * 8.0);
  color *= centerGlow;

  // Scanlines
  float scanFreq = 320.0;
  float scanWobble = sin(time * 0.7 + uv.x * 20.0) * 0.5;
  float scanline = sin(uv.y * scanFreq + time * 2.0 + scanWobble) * 0.06;
  color += scanline;

  // RGB phosphor separation
  float chromaOffset = 0.003 + reactionIntensity * 0.004;
  float rShift = rand(vec2(floor(uv.y * scanFreq), time * 0.01)) * chromaOffset;
  color.r += 0.02 * sin(uv.x * 100.0 + rShift);
  color.b += 0.015 * sin(uv.x * 100.0 - chromaOffset * 50.0);

  // Phosphor dot pattern
  float dotX = mod(uv.x * 600.0, 3.0);
  float dotMask = 0.92 + 0.08 * step(1.0, dotX) * step(dotX, 2.0);
  color *= dotMask;

  // Flicker
  float flicker = 1.0 - flickerIntensity * rand(vec2(time * 0.1, 0.0)) * 0.12;
  flicker -= reactionIntensity * 0.05 * sin(time * 30.0);

  // Static noise
  float noiseAmount = staticIntensity + reactionIntensity * 0.08;
  float noise = rand(uv + time) * noiseAmount;

  // Vignette
  float vignette = 1.0 - 0.7 * dist * dist;

  // Screen edge glow
  float edgeDist = max(abs(centered.x), abs(centered.y));
  float edgeGlow = smoothstep(0.42, 0.48, edgeDist) * 0.08;
  color += vec3(0.0, edgeGlow * 0.5, edgeGlow * 0.3);

  // Combine
  color = color * flicker * vignette + noise * vec3(0.1, 0.12, 0.08);

  // CRT color temperature
  color *= vec3(0.75, 1.0, 0.82);

  // Boost brightness
  color *= 1.3 + reactionIntensity * 0.4;

  // Out-of-bounds
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createCrtMaterial(name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CRT_VERTEX,
    fragmentShader: CRT_FRAGMENT,
    uniforms: {
      time: { value: 0 },
      flickerIntensity: { value: 1.0 },
      staticIntensity: { value: 0.05 },
      reactionIntensity: { value: 0.0 },
    },
  });
}
