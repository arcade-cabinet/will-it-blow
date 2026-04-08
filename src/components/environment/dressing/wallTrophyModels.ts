/**
 * Wall trophy placement data — horror masks, weapons, and graffiti
 * mounted on the kitchen walls as SAW-style set dressing (T2.B).
 *
 * Each entry references a GLB from public/models/ that is NOT already
 * used by any gameplay station. Positions are in world-space relative
 * to the kitchen origin.
 */

export interface DressingModel {
  /** Relative path from public/ (fed to asset()). */
  path: string;
  /** World-space [x, y, z] position. */
  position: [number, number, number];
  /** Euler [x, y, z] rotation in radians. */
  rotation?: [number, number, number];
  /** Uniform scale factor. */
  scale?: number;
}

export const WALL_TROPHY_MODELS: DressingModel[] = [
  // ── Horror masks on the back wall ──
  {
    path: '/models/horror_mask_mx_1.glb',
    position: [-2.5, 2.6, -2.9],
    rotation: [0, 0, 0.1],
    scale: 0.8,
  },
  {
    path: '/models/horror_mask_mx_2.glb',
    position: [-1.2, 2.8, -2.9],
    rotation: [0, 0, -0.15],
    scale: 0.7,
  },
  {
    path: '/models/horror_mask_mx_3.glb',
    position: [0.5, 2.5, -2.9],
    rotation: [0, 0, 0.05],
    scale: 0.9,
  },
  {
    path: '/models/horror_mask_mx_4.glb',
    position: [1.8, 2.7, -2.9],
    rotation: [0, Math.PI * 0.1, -0.1],
    scale: 0.75,
  },
  {
    path: '/models/horror_mask_mx_5.glb',
    position: [2.6, 2.4, -2.9],
    rotation: [0, 0, 0.2],
    scale: 0.85,
  },

  // ── Weapons on the side walls ──
  {
    path: '/models/horror_machete_mx_1.glb',
    position: [-3.4, 2.0, -1.5],
    rotation: [0, Math.PI / 2, Math.PI / 6],
    scale: 1.0,
  },
  {
    path: '/models/horror_saw_blade_1.glb',
    position: [-3.4, 1.5, 0.5],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.6,
  },
  {
    path: '/models/cutlery_cleaver.glb',
    position: [3.4, 2.1, -1.0],
    rotation: [0, -Math.PI / 2, -Math.PI / 8],
    scale: 1.2,
  },
  {
    path: '/models/cutlery_knife.glb',
    position: [3.4, 1.8, 0.8],
    rotation: [0, -Math.PI / 2, Math.PI / 4],
    scale: 1.1,
  },

  // ── Graffiti / posters ──
  {
    path: '/models/horror_graffiti_mx_1.glb',
    position: [-3.35, 1.2, -0.3],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.9,
  },
  {
    path: '/models/horror_graffiti_mx_2.glb',
    position: [3.35, 1.4, 1.5],
    rotation: [0, -Math.PI / 2, 0],
    scale: 0.8,
  },
  {
    path: '/models/horror_poster_cx_4.glb',
    position: [-3.35, 2.2, 1.8],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.7,
  },

  // ── Fishing hooks dangling from nails ──
  {
    path: '/models/horror_fishing_hook_mx_1.glb',
    position: [-2.0, 2.9, -2.85],
    rotation: [0, 0, 0],
    scale: 0.5,
  },
  {
    path: '/models/horror_fishing_hook_mx_2.glb',
    position: [1.0, 2.9, -2.85],
    rotation: [0, Math.PI, 0],
    scale: 0.5,
  },
];
