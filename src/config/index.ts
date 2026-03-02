/**
 * @module config
 * Typed barrel for all centralized JSON config files.
 *
 * Single import point: `import { config } from '../../config'`
 *
 * JSON files are loaded statically by Metro's native import resolution
 * and cast to their TypeScript interfaces for compile-time safety.
 */

// --- Gameplay tunables ---
import cookingGameplay from './gameplay/cooking.json';
import grindingGameplay from './gameplay/grinding.json';
import stuffingGameplay from './gameplay/stuffing.json';
// --- Machine definitions (Tier 3) ---
import grinderMachine from './machines/grinder.json';
import stoveMachine from './machines/stove.json';
import stufferMachine from './machines/stuffer.json';
// --- Physics params ---
import greasePhysics from './physics/grease.json';
import plungerPhysics from './physics/plunger.json';
import sausagePhysics from './physics/sausage.json';
// --- Scene ---
import basementScene from './scene/basement.json';
import casingScene from './scene/casing.json';
import fridgeScene from './scene/fridge.json';
// --- Scoring ---
import scoringData from './scoring.json';
import type {
  BasementSceneConfig,
  CasingSceneConfig,
  CookingGameplayConfig,
  FridgeSceneConfig,
  GreasePhysicsConfig,
  GrindingGameplayConfig,
  MachineConfig,
  PlungerPhysicsConfig,
  SausagePhysicsConfig,
  ScoringConfig,
  StuffingGameplayConfig,
  VariantsConfig,
} from './types';

// --- Variants ---
import variantsData from './variants.json';

export const config = {
  machines: {
    grinder: grinderMachine as unknown as MachineConfig,
    stuffer: stufferMachine as unknown as MachineConfig,
    stove: stoveMachine as unknown as MachineConfig,
  },
  gameplay: {
    grinding: grindingGameplay as unknown as GrindingGameplayConfig,
    stuffing: stuffingGameplay as unknown as StuffingGameplayConfig,
    cooking: cookingGameplay as unknown as CookingGameplayConfig,
  },
  physics: {
    sausage: sausagePhysics as unknown as SausagePhysicsConfig,
    grease: greasePhysics as unknown as GreasePhysicsConfig,
    plunger: plungerPhysics as unknown as PlungerPhysicsConfig,
  },
  scoring: scoringData as unknown as ScoringConfig,
  scene: {
    fridge: fridgeScene as unknown as FridgeSceneConfig,
    casing: casingScene as unknown as CasingSceneConfig,
    basement: basementScene as unknown as BasementSceneConfig,
  },
  variants: variantsData as unknown as VariantsConfig,
} as const;

// Re-export types for consumers
export type {
  BasementSceneConfig,
  CasingSceneConfig,
  CookingGameplayConfig,
  FridgeSceneConfig,
  GreasePhysicsConfig,
  GrindingGameplayConfig,
  MachineConfig,
  PlungerPhysicsConfig,
  SausagePhysicsConfig,
  ScoringConfig,
  StuffingGameplayConfig,
  VariantsConfig,
} from './types';
