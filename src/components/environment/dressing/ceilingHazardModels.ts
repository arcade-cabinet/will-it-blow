/**
 * Ceiling hazard placement data — pipes, wires, lamps, and hooks
 * dangling from the basement ceiling (T2.B).
 *
 * Each entry references a GLB from public/models/ that is NOT already
 * used by any gameplay station. Positions are in world-space relative
 * to the kitchen origin.
 */

import type {DressingModel} from './wallTrophyModels';

export const CEILING_HAZARD_MODELS: DressingModel[] = [
  // ── Exposed pipes running along the ceiling ──
  {
    path: '/models/horror_pipes_hr_1.glb',
    position: [0, 3.3, -1.5],
    rotation: [0, 0, 0],
    scale: 1.0,
  },

  // ── Wires dangling from the ceiling ──
  {
    path: '/models/horror_wires_hr_1.glb',
    position: [-1.5, 3.2, 0],
    rotation: [0, Math.PI / 4, 0],
    scale: 0.8,
  },

  // ── Lamps — mix of on and off for flickering horror feel ──
  {
    path: '/models/horror_lamp_mx_1_a_on.glb',
    position: [-1.0, 3.1, -1.0],
    rotation: [0, 0, 0],
    scale: 0.7,
  },
  {
    path: '/models/horror_lamp_mx_3_off.glb',
    position: [1.5, 3.1, 0.5],
    rotation: [0, Math.PI / 3, 0],
    scale: 0.65,
  },
  {
    path: '/models/horror_lamp_mx_4_off.glb',
    position: [0, 3.1, 1.5],
    rotation: [0, -Math.PI / 6, 0],
    scale: 0.6,
  },
  {
    path: '/models/horror_lamp_mx_1_a_off.glb',
    position: [2.0, 3.1, -2.0],
    rotation: [0, Math.PI, 0],
    scale: 0.7,
  },
  {
    path: '/models/horror_lamp_mx_3_on.glb',
    position: [-2.5, 3.1, 1.0],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.6,
  },
  {
    path: '/models/horror_lamp_mx_4_on.glb',
    position: [0.5, 3.1, -2.5],
    rotation: [0, -Math.PI / 4, 0],
    scale: 0.65,
  },
];
