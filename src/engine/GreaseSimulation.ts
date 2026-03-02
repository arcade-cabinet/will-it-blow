/**
 * @module GreaseSimulation
 * Procedural grease surface material for the frying pan cooking station.
 *
 * Uses Option A (procedural) instead of the POC's FBO wave equation shader
 * (which required WebGL ShaderMaterial and is not directly portable to the
 * WebGPU/TSL pipeline used in this project).
 *
 * Visual goal: "shimmering oily grease in a frying pan" — animated roughness
 * noise for shimmer, opacity driven by cookLevel.
 *
 * Ported values from POC sausage_factory.html:
 *   - color: 0xcca600      (L240)
 *   - roughness: 0.05      (L240)
 *   - metalness: 0.1       (L240)
 *   - transmission: 0.2    (L240)
 *   - ior: 1.4             (L240)
 *   - opacity: 0.2 + cookLevel * 0.6  (L524)
 */

import {MeshPhysicalMaterial} from 'three/webgpu';

/**
 * Create a MeshPhysicalMaterial configured for an oily grease pool.
 *
 * The material starts fully transparent (opacity 0) and becomes visible as
 * cooking progresses via `updateGrease()`. Uses MeshPhysicalMaterial for
 * realistic transmission and IOR effects on the WebGPU renderer.
 *
 * @returns A new MeshPhysicalMaterial ready for the grease pool mesh.
 */
export function createGreaseMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: 0xcca600,
    transparent: true,
    opacity: 0.0,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.2,
    ior: 1.4,
    depthWrite: false,
  });
}

/**
 * Update grease material appearance each frame based on cook level and time.
 *
 * Opacity is driven directly from cookLevel (POC L524):
 *   `opacity = 0.2 + cookLevel * 0.6`
 *
 * Roughness animates with a sinusoidal shimmer pattern to simulate the
 * flickering specular highlights of hot liquid grease. This replaces the
 * POC's FBO wave simulation with a lightweight procedural alternative.
 *
 * @param material  - The MeshPhysicalMaterial returned by createGreaseMaterial()
 * @param cookLevel - 0 (raw / no grease) to 1 (fully cooked / grease fully visible)
 * @param time      - Elapsed time in seconds (from useFrame clock)
 */
export function updateGrease(
  material: MeshPhysicalMaterial,
  cookLevel: number,
  time: number,
): void {
  // Opacity ramp: fully transparent when cold, nearly opaque when charred
  material.opacity = 0.2 + cookLevel * 0.6;

  // Shimmer: base roughness 0.05, animate +/- 0.04 at cooking frequencies
  // Multiple sine waves at different frequencies simulate turbulent grease
  const shimmer =
    Math.sin(time * 3.7) * 0.02 +
    Math.sin(time * 7.1 + 1.3) * 0.015 +
    Math.sin(time * 13.3 + 2.7) * 0.005;

  // Roughness increases slightly as grease heats and bubbles
  material.roughness = Math.max(0.01, Math.min(0.3, 0.05 + cookLevel * 0.08 + shimmer));
}
