/**
 * @module config
 * Typed barrel for all centralized JSON config files.
 *
 * Single import point: `import { config } from '../../config'`
 *
 * JSON files are loaded statically by Metro's native import resolution
 * and cast to their TypeScript interfaces for compile-time safety.
 */

import type {PlacementsConfig, RailsConfig, RoomConfig} from '../engine/layout/types';
// --- Fixture housings ---
import ceilingHousing from './fixtures/ceiling-housing.json';
import ceilingTrapdoorHousing from './fixtures/ceiling-trapdoor-housing.json';
import wallTvHousing from './fixtures/wall-tv-housing.json';
// --- Gameplay tunables ---
import choppingGameplay from './gameplay/chopping.json';
import cookingGameplay from './gameplay/cooking.json';
import grindingGameplay from './gameplay/grinding.json';
import stuffingGameplay from './gameplay/stuffing.json';
// --- Layout hierarchy (room → rails → placements) ---
import kitchenPlacements from './layout/placements.json';
import kitchenRails from './layout/rails.json';
import kitchenRoom from './layout/room.json';
// --- Machine definitions (Tier 3) ---
import crtTvMachine from './machines/crt-tv.json';
import fluorescentPanel from './machines/fluorescent-panel.json';
import grinderMachine from './machines/grinder.json';
import stoveMachine from './machines/stove.json';
import stufferMachine from './machines/stuffer.json';
import trapDoorMachine from './machines/trap-door.json';
// --- Physics params ---
import greasePhysics from './physics/grease.json';
import plungerPhysics from './physics/plunger.json';
import sausagePhysics from './physics/sausage.json';
// --- Scene ---
import basementScene from './scene/basement.json';
import casingScene from './scene/casing.json';
import challengeSequence from './scene/challenge-sequence.json';
import fridgeScene from './scene/fridge.json';
import horrorPropsScene from './scene/horror-props.json';
import lightingScene from './scene/lighting.json';
// --- Scoring ---
import scoringData from './scoring.json';
import type {
  BasementSceneConfig,
  CasingSceneConfig,
  ChallengeSequenceConfig,
  ChoppingGameplayConfig,
  CookingGameplayConfig,
  DisplayHousingConfig,
  FridgeSceneConfig,
  GreasePhysicsConfig,
  GrindingGameplayConfig,
  HorrorPropsConfig,
  LightingSceneConfig,
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
    'fluorescent-panel': fluorescentPanel as unknown as MachineConfig,
    'crt-tv': crtTvMachine as unknown as MachineConfig,
    'trap-door': trapDoorMachine as unknown as MachineConfig,
  },
  fixtures: {
    ceilingHousing: ceilingHousing as unknown as DisplayHousingConfig,
    wallTvHousing: wallTvHousing as unknown as DisplayHousingConfig,
    ceilingTrapdoorHousing: ceilingTrapdoorHousing as unknown as DisplayHousingConfig,
  },
  gameplay: {
    chopping: choppingGameplay as unknown as ChoppingGameplayConfig,
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
    horrorProps: horrorPropsScene as unknown as HorrorPropsConfig,
    lighting: lightingScene as unknown as LightingSceneConfig,
    challengeSequence: challengeSequence as unknown as ChallengeSequenceConfig,
  },
  variants: variantsData as unknown as VariantsConfig,
  layout: {
    room: kitchenRoom as unknown as RoomConfig,
    rails: kitchenRails as unknown as RailsConfig,
    placements: kitchenPlacements as unknown as PlacementsConfig,
  },
} as const;

// Re-export types for consumers
export type {
  BasementSceneConfig,
  CasingSceneConfig,
  ChallengeSequenceConfig,
  ChoppingGameplayConfig,
  CookingGameplayConfig,
  DisplayHousingConfig,
  FridgeSceneConfig,
  GreasePhysicsConfig,
  GrindingGameplayConfig,
  HorrorPropsConfig,
  LightingSceneConfig,
  MachineConfig,
  PlungerPhysicsConfig,
  SausagePhysicsConfig,
  ScoringConfig,
  StuffingGameplayConfig,
  VariantsConfig,
} from './types';
