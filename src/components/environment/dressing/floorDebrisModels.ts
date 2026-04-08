/**
 * Floor debris placement data — barrels, boxes, planks, flesh,
 * bandages, bottles, and assorted detritus scattered across the
 * kitchen floor (T2.B).
 *
 * Each entry references a GLB from public/models/ that is NOT already
 * used by any gameplay station. Positions are in world-space relative
 * to the kitchen origin.
 */

import type {DressingModel} from './wallTrophyModels';

export const FLOOR_DEBRIS_MODELS: DressingModel[] = [
  // ── Metal barrels ──
  {
    path: '/models/horror_metal_barrel_hr_1.glb',
    position: [2.8, 0, -2.5],
    rotation: [0, 0.3, 0],
    scale: 0.8,
  },
  {
    path: '/models/horror_metal_barrel_hr_2.glb',
    position: [-2.7, 0, 2.0],
    rotation: [0, -0.5, 0],
    scale: 0.75,
  },

  // ── Cardboard box ──
  {
    path: '/models/horror_cardboard_box_1.glb',
    position: [2.5, 0, 2.2],
    rotation: [0, 0.8, 0],
    scale: 0.9,
  },

  // ── Wooden planks ──
  {
    path: '/models/horror_wooden_plank_1.glb',
    position: [-0.5, 0.01, 2.4],
    rotation: [0, 1.2, 0],
    scale: 0.7,
  },

  // ── Flesh chunk (horror) ──
  {
    path: '/models/horror_flesh.glb',
    position: [1.0, 0.02, -0.5],
    rotation: [0, 2.1, 0],
    scale: 0.5,
  },

  // ── Bandages ──
  {
    path: '/models/bandages.glb',
    position: [-1.8, 0.01, -2.0],
    rotation: [0, 0.4, 0],
    scale: 0.6,
  },

  // ── Bottle ──
  {
    path: '/models/bottle.glb',
    position: [0.3, 0, 1.8],
    rotation: [Math.PI / 2, 0, 0.7],
    scale: 0.8,
  },

  // ── Broken can ──
  {
    path: '/models/can_broken.glb',
    position: [-2.2, 0, 0.5],
    rotation: [0, 1.5, 0],
    scale: 0.7,
  },

  // ── Kitchen items scattered on the floor ──
  {
    path: '/models/pot.glb',
    position: [1.5, 0, 2.0],
    rotation: [0.3, 0.5, 0],
    scale: 0.6,
  },
  {
    path: '/models/pot_lid.glb',
    position: [1.7, 0.01, 1.7],
    rotation: [0, 2.0, 0],
    scale: 0.6,
  },
  {
    path: '/models/mixing_bowl.glb',
    position: [-0.8, 0, -1.8],
    rotation: [0, 0.9, 0],
    scale: 0.5,
  },
  {
    path: '/models/glass_big.glb',
    position: [0.8, 0, 0.9],
    rotation: [Math.PI / 2, 0, 1.3],
    scale: 0.6,
  },

  // ── Cutlery scattered ──
  {
    path: '/models/cutlery_fork.glb',
    position: [-1.5, 0.02, 1.2],
    rotation: [0, 0.7, 0],
    scale: 0.9,
  },
  {
    path: '/models/cutlery_ladle.glb',
    position: [2.0, 0.01, -1.0],
    rotation: [0, -0.4, 0],
    scale: 0.8,
  },
  {
    path: '/models/cutlery_spoon.glb',
    position: [-0.3, 0.02, -0.8],
    rotation: [0, 1.9, 0],
    scale: 0.9,
  },

  // ── Miscellaneous props ──
  {
    path: '/models/matchbox.glb',
    position: [0.6, 0.01, -2.3],
    rotation: [0, 0.5, 0],
    scale: 0.7,
  },
  {
    path: '/models/postit.glb',
    position: [-2.0, 0.02, -0.3],
    rotation: [0, 1.1, 0],
    scale: 0.8,
  },
  {
    path: '/models/roller.glb',
    position: [1.3, 0, -1.8],
    rotation: [0, 0.3, Math.PI / 2],
    scale: 0.6,
  },
  {
    path: '/models/tapetteamouche.glb',
    position: [-2.5, 0.01, -1.0],
    rotation: [0, -0.8, 0],
    scale: 0.7,
  },
];
