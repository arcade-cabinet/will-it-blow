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
 * All tunable values sourced from config.physics.grease (physics/grease.json).
 */

import {CanvasTexture, MeshPhysicalMaterial, RepeatWrapping} from 'three/webgpu';
import {config} from '../config';

// ---------------------------------------------------------------------------
// Config shorthand
// ---------------------------------------------------------------------------

const greaseConfig = config.physics.grease;

// ---------------------------------------------------------------------------
// GreaseWaveSimulation — 2D wave equation on CPU canvas
// ---------------------------------------------------------------------------

/**
 * CPU-based 2D wave equation simulation that outputs displacement and normal
 * maps as CanvasTextures. This avoids raw GLSL ShaderMaterial (which is
 * incompatible with the WebGPU/TSL pipeline) by running the wave math on the
 * CPU and uploading results as standard textures each frame.
 *
 * Usage:
 *   1. `addSplat()` to inject ripples
 *   2. `step()` to advance the wave equation
 *   3. `computeNormals()` to derive a normal map from the heightfield
 *   4. `update()` to write buffers to canvas textures
 *
 * The resulting displacement and normal maps can be applied to any
 * MeshPhysicalMaterial via displacementMap / normalMap.
 */
export class GreaseWaveSimulation {
  readonly size: number;
  curr: Float32Array;
  prev: Float32Array;
  private next: Float32Array;
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;
  private texture: CanvasTexture | null;
  private normalCanvas: HTMLCanvasElement | null;
  private normalCtx: CanvasRenderingContext2D | null;
  private normalTexture: CanvasTexture | null;

  constructor(size: number = greaseConfig.waveSimSize) {
    this.size = size;
    const n = size * size;
    this.curr = new Float32Array(n);
    this.prev = new Float32Array(n);
    this.next = new Float32Array(n);

    // Canvas-dependent resources — only available in browser environments
    if (typeof document !== 'undefined') {
      // Displacement canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = size;
      this.canvas.height = size;
      this.ctx = this.canvas.getContext('2d')!;
      this.texture = new CanvasTexture(this.canvas);
      this.texture.wrapS = RepeatWrapping;
      this.texture.wrapT = RepeatWrapping;

      // Normal canvas
      this.normalCanvas = document.createElement('canvas');
      this.normalCanvas.width = size;
      this.normalCanvas.height = size;
      this.normalCtx = this.normalCanvas.getContext('2d')!;
      this.normalTexture = new CanvasTexture(this.normalCanvas);
      this.normalTexture.wrapS = RepeatWrapping;
      this.normalTexture.wrapT = RepeatWrapping;
    } else {
      this.canvas = null;
      this.ctx = null;
      this.texture = null;
      this.normalCanvas = null;
      this.normalCtx = null;
      this.normalTexture = null;
    }
  }

  /** Add a ripple at (u,v) coordinates [0,1]. */
  addSplat(u: number, v: number, radius: number, strength: number): void {
    const cx = Math.floor(u * this.size);
    const cy = Math.floor(v * this.size);
    const r = Math.ceil(radius * this.size);
    if (r <= 0) return;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px < 0 || px >= this.size || py < 0 || py >= this.size) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        if (dist > 1) continue;

        // Gaussian bump
        const falloff = Math.exp(-dist * dist * 3);
        this.curr[py * this.size + px] += strength * falloff;
      }
    }
  }

  /** Step the wave equation (damped 2D wave propagation). */
  step(damping: number = greaseConfig.waveDamping): void {
    const s = this.size;
    this.next.fill(0);

    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const i = y * s + x;
        // 2D wave equation: average of 4 neighbors
        const avg =
          (this.curr[i - 1] + this.curr[i + 1] + this.curr[i - s] + this.curr[i + s]) / 2 -
          this.prev[i];

        this.next[i] = avg * damping;
      }
    }

    const temp = this.prev;
    this.prev = this.curr;
    this.curr = this.next;
    this.next = temp;
  }

  /** Compute normal map from the heightfield via finite differences. */
  computeNormals(scale: number = greaseConfig.normalScale): void {
    if (!this.normalCtx) return;
    const s = this.size;
    const imgData = this.normalCtx.createImageData(s, s);
    const data = imgData.data;

    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const i = y * s + x;
        // Finite differences
        const dhdx = (this.curr[i + 1] - this.curr[i - 1]) * scale;
        const dhdy = (this.curr[i + s] - this.curr[i - s]) * scale;

        // Normal vector (normalized, encoded to [0,255])
        const len = Math.sqrt(dhdx * dhdx + dhdy * dhdy + 1);
        const nx = (-dhdx / len + 1) * 0.5 * 255;
        const ny = (-dhdy / len + 1) * 0.5 * 255;
        const nz = (1 / len + 1) * 0.5 * 255;

        const pi = i * 4;
        data[pi] = nx;
        data[pi + 1] = ny;
        data[pi + 2] = nz;
        data[pi + 3] = 255;
      }
    }

    this.normalCtx.putImageData(imgData, 0, 0);
  }

  /** Upload curr buffer to canvas textures. Call after step() + computeNormals(). */
  update(): void {
    if (!this.ctx || !this.texture || !this.normalTexture) return;

    const s = this.size;
    const imgData = this.ctx.createImageData(s, s);
    const data = imgData.data;

    for (let i = 0; i < s * s; i++) {
      const v = Math.max(0, Math.min(255, (this.curr[i] + 0.5) * 255));
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }

    this.ctx.putImageData(imgData, 0, 0);
    this.texture.needsUpdate = true;
    this.normalTexture.needsUpdate = true;
  }

  getDisplacementMap(): CanvasTexture | null {
    return this.texture;
  }

  getNormalMap(): CanvasTexture | null {
    return this.normalTexture;
  }
}

/**
 * Create a MeshPhysicalMaterial configured for an oily grease pool.
 *
 * The material starts fully transparent (opacity 0) and becomes visible as
 * cooking progresses via `updateGrease()`. Uses MeshPhysicalMaterial for
 * realistic transmission and IOR effects on the WebGPU renderer.
 *
 * @returns A new MeshPhysicalMaterial ready for the grease pool mesh.
 */
export function createGreaseMaterial(sim?: GreaseWaveSimulation): MeshPhysicalMaterial {
  const displacementMap = sim?.getDisplacementMap() ?? undefined;
  const normalMap = sim?.getNormalMap() ?? undefined;
  const mat = greaseConfig.material;

  return new MeshPhysicalMaterial({
    color: mat.color,
    transparent: true,
    opacity: 0.0,
    roughness: mat.roughness,
    metalness: mat.metalness,
    transmission: mat.transmission,
    ior: mat.ior,
    depthWrite: false,
    ...(displacementMap
      ? {
          displacementMap,
          displacementScale: mat.displacementScale,
          normalMap,
        }
      : {}),
  });
}

/**
 * Update grease material appearance each frame based on cook level and time.
 *
 * Opacity ramp and roughness shimmer driven by config.physics.grease values.
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
  const clamped = Math.max(0, Math.min(1, cookLevel));

  // Opacity ramp: fully transparent when cold, nearly opaque when charred
  material.opacity = greaseConfig.opacityBase + clamped * greaseConfig.opacityScale;

  // Shimmer: animate roughness at cooking frequencies
  // Multiple sine waves at different frequencies simulate turbulent grease
  const shimmer =
    Math.sin(time * 3.7) * 0.02 +
    Math.sin(time * 7.1 + 1.3) * 0.015 +
    Math.sin(time * 13.3 + 2.7) * 0.005;

  // Roughness increases slightly as grease heats and bubbles
  material.roughness = Math.max(
    0.01,
    Math.min(
      0.3,
      greaseConfig.shimmerBaseRoughness +
        clamped * greaseConfig.shimmerHeatRoughnessScale +
        shimmer,
    ),
  );
}
