/**
 * @module assets/registry
 * Central asset registry — single source of truth for ALL game assets.
 *
 * Every GLB model, OGG audio file, and texture is registered here.
 * Components import from this registry instead of using scattered require() calls.
 *
 * Usage:
 *   import { MODELS, AUDIO, TEXTURES } from '../assets/registry';
 *   <Model source={MODELS.meatGrinder} />
 *   audioEngine.play(AUDIO.chop);
 */

// ─── 3D Models ────────────────────────────────────────────────────

export const MODELS = {
  // Kitchen furniture
  workplan: require('../../assets/models/workplan.glb'),
  workplan001: require('../../assets/models/workplan_001.glb'),
  ovenLarge: require('../../assets/models/kitchen_oven_large.glb'),
  fridge: require('../../assets/models/fridge.glb'),
  cabinet1: require('../../assets/models/kitchen_cabinet1.glb'),
  cabinet2: require('../../assets/models/kitchen_cabinet2.glb'),
  shelfSmall: require('../../assets/models/shelf_small.glb'),
  knifeHolder: require('../../assets/models/knife_holder.glb'),
  utensilHolder: require('../../assets/models/utensil_holder.glb'),
  cuttingBoard: require('../../assets/models/cutting_board.glb'),
  mixingBowl: require('../../assets/models/mixing_bowl.glb'),
  meatGrinder: require('../../assets/models/meat_grinder.glb'),
  fryingPan: require('../../assets/models/frying_pan.glb'),
  pot: require('../../assets/models/pot.glb'),
  table: require('../../assets/models/table_styloo.glb'),
  chair: require('../../assets/models/chair_styloo.glb'),
  trashcan: require('../../assets/models/trashcan_cylindric.glb'),
  toaster: require('../../assets/models/toaster.glb'),
  washingMachine: require('../../assets/models/washing_machine.glb'),
  islandCounter: require('../../assets/models/island_counter.glb'),
  plateBig: require('../../assets/models/plate_big.glb'),
  bandages: require('../../assets/models/bandages.glb'),

  // Room
  basementRoom: require('../../assets/models/basement_room.glb'),

  // Character + body
  hands: require('../../assets/models/hands.glb'),
  flesh: require('../../assets/models/Flesh.glb'),

  // Horror props
  barrel1: require('../../assets/models/horror/metal_barrel_hr_1.glb'),
  barrel2: require('../../assets/models/horror/metal_barrel_hr_2.glb'),
  cage: require('../../assets/models/horror/cage_mx_1.glb'),
  sawBlade: require('../../assets/models/horror/saw_blade_1.glb'),
  machete: require('../../assets/models/horror/machete_mx_1.glb'),
  mask1: require('../../assets/models/horror/mask_mx_1.glb'),
  mask3: require('../../assets/models/horror/mask_mx_3.glb'),
  hook1: require('../../assets/models/horror/fishing_hook_mx_1.glb'),
  hook2: require('../../assets/models/horror/fishing_hook_mx_2.glb'),
  plank: require('../../assets/models/horror/wooden_plank_1.glb'),
  pipes: require('../../assets/models/horror/pipes_hr_1.glb'),
  wires: require('../../assets/models/horror/wires_hr_1.glb'),
  poster: require('../../assets/models/horror/poster_cx_4.glb'),
  lamp: require('../../assets/models/horror/lamp_mx_3_on.glb'),
  cardboardBox: require('../../assets/models/horror/cardboard_box_1.glb'),
  brick1: require('../../assets/models/horror/brick_mx_1.glb'),
  brick2: require('../../assets/models/horror/brick_mx_2.glb'),
  graffiti1: require('../../assets/models/horror/graffiti_mx_1.glb'),
  graffiti2: require('../../assets/models/horror/graffiti_mx_2.glb'),
} as const;

// ─── Audio ────────────────────────────────────────────────────────

export const AUDIO = {
  chop: require('../../assets/audio/chop_1.ogg'),
  grind: require('../../assets/audio/mix_dry_1.ogg'),
  squelch: require('../../assets/audio/mix_wet_1.ogg'),
  sizzle: require('../../assets/audio/sizzle_1.ogg'),
  pressure: require('../../assets/audio/boiling_1.ogg'),
  burst: require('../../assets/audio/pots_and_pans_1.ogg'),
  tie: require('../../assets/audio/peel_1.ogg'),
  strike: require('../../assets/audio/pots_and_pans_2.ogg'),
  success: require('../../assets/audio/pour_1.ogg'),
  error: require('../../assets/audio/pots_and_pans_3.ogg'),
  click: require('../../assets/audio/peel_2.ogg'),
  phaseAdvance: require('../../assets/audio/pour_2.ogg'),
  rankReveal: require('../../assets/audio/verdict-unsettling.ogg'),
  ambient: require('../../assets/audio/ambient-horror.ogg'),
} as const;
