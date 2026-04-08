/**
 * @module CanvasTextureSplatter
 * Dynamic 2D canvas that paints splatter stains on the cereal box face.
 *
 * The cereal box target is a 3D plane whose diffuse map is a Canvas2D
 * texture. When the stuffing tube "blows", particles land on the box
 * face and this module paints a composite-colour splatter at the impact
 * UV coordinate. The result is a persistent, readable record of the
 * blow quality — massive explosions paint the whole box, duds leave a
 * sad dribble.
 *
 * The canvas also serves as visual feedback: the player sees the
 * composite mix colour splattered on a surreal cereal-box drawing,
 * tying the composition pillar (ingredient colours blended) to the
 * climax moment.
 *
 * Implementation: a 512x512 canvas with a radial-gradient brush.
 * `paintSplat` drops N blobs based on the tier power; `getTexture`
 * returns a THREE.CanvasTexture that auto-updates on each paint call.
 */
import * as THREE from 'three';

const CANVAS_SIZE = 512;

export interface SplatOptions {
  /** Normalised UV centre [0-1, 0-1]. */
  readonly u: number;
  readonly v: number;
  /** Splat radius in canvas pixels. */
  readonly radius: number;
  /** CSS colour string (hex or rgb). */
  readonly color: string;
  /** 0-1 opacity of this splat. */
  readonly alpha: number;
}

/**
 * Create a splatter canvas and return its API.
 *
 * The caller typically creates one per CerealBoxTarget mount and
 * discards it when the round ends (the canvas and texture are GC'd).
 */
export function createSplatterCanvas(): {
  /** Paint a single splat blob. */
  paintSplat: (opts: SplatOptions) => void;
  /** Paint a burst of splats from a blow event. */
  paintBurst: (color: string, power: number, rng: () => number) => void;
  /** Get the Three.js CanvasTexture (create-once, auto-updates). */
  getTexture: () => THREE.CanvasTexture;
  /** Clear the canvas for a new round. */
  clear: () => void;
} {
  // Guard for SSR/jsdom — no canvas in non-browser environments.
  const canvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : ({
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          getContext: () => null,
        } as unknown as HTMLCanvasElement);

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');

  // Pre-fill with a dark cereal-box brown.
  if (ctx) {
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  let texture: THREE.CanvasTexture | null = null;

  function paintSplat(opts: SplatOptions): void {
    if (!ctx) return;
    const cx = opts.u * CANVAS_SIZE;
    const cy = (1 - opts.v) * CANVAS_SIZE; // Flip V for canvas coords.
    const r = opts.radius;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, opts.color);
    gradient.addColorStop(0.6, opts.color);
    gradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = gradient;

    // Irregular splat shape: overlapping ellipses.
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (texture) {
      texture.needsUpdate = true;
    }
  }

  function paintBurst(color: string, power: number, rng: () => number): void {
    // Number of splats proportional to blow power.
    const count = Math.max(1, Math.floor(power * 20));
    for (let i = 0; i < count; i++) {
      const u = 0.2 + rng() * 0.6; // Keep within box face.
      const v = 0.2 + rng() * 0.6;
      const radius = 10 + rng() * power * 60;
      const alpha = 0.4 + rng() * 0.5;
      paintSplat({u, v, radius, color, alpha});
    }
  }

  function getTexture(): THREE.CanvasTexture {
    if (!texture) {
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    return texture;
  }

  function clear(): void {
    if (!ctx) return;
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (texture) {
      texture.needsUpdate = true;
    }
  }

  return {paintSplat, paintBurst, getTexture, clear};
}
