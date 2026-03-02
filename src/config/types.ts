/**
 * @module config/types
 * Type definitions for all centralized JSON config files.
 *
 * These types enforce compile-time safety over game-tuning data.
 * JSON values are pre-computed (e.g., Math.PI/2 = 1.5708) since JSON
 * cannot express JavaScript math. All angles are in radians unless
 * explicitly noted otherwise.
 */

import type {BindingTransform} from '../ecs/inputTypes';
import type {MaterialPreset} from '../ecs/materialPresets';
import type {GeometryType} from '../ecs/types';

// ---------------------------------------------------------------------------
// Machine Configs (Tier 3 — replaces hardcoded archetype files)
// ---------------------------------------------------------------------------

/** Geometry definition for a named component. */
export interface GeometryDef {
  type: GeometryType;
  args: number[];
}

/** Material definition for a named component. */
export interface MaterialDef {
  type: 'standard' | 'basic' | 'physical';
  preset?: MaterialPreset;
  color: number | string;
  roughness?: number;
  metalness?: number;
}

/** A housing component (part of the machine body). */
export interface HousingComponentDef {
  slot: string;
  findableTier?: string;
  geometry: GeometryDef;
  material: MaterialDef;
  position: [number, number, number];
  rotation?: [number, number, number];
  isStatic?: boolean;
}

/** Behavior annotations that can be attached to extras. */
export interface BehaviorsDef {
  rotation?: {axis: 'x' | 'y' | 'z'; speed: number};
  fillDriven?: {minY: number; maxY: number; fillLevel: number};
}

/** An extra component beyond the template (machine-specific parts). */
export interface ExtraComponentDef {
  slot: string;
  findableTier?: string;
  geometry: GeometryDef;
  material: MaterialDef;
  position: [number, number, number];
  rotation?: [number, number, number];
  isStatic?: boolean;
  behaviors?: BehaviorsDef;
}

/** Switch control config (for powered machines). */
export interface SwitchControlDef {
  type: 'switch';
  prefix: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  bodyGeometry: GeometryDef;
  bodyColor: number | string;
  bodyPreset?: MaterialPreset;
  notch?: {
    geometry: GeometryDef;
    color: number | string;
    offset: [number, number, number];
    rotationRange: number;
  };
}

/** Dial control config (for heat machines). */
export interface DialControlDef {
  type: 'dial';
  prefix: string;
  segments: string[];
  wraps: boolean;
  position: [number, number, number];
  bodyGeometry: GeometryDef;
  bodyColor: number | string;
}

/** Crank control config (for mechanical machines). */
export interface CrankControlDef {
  type: 'crank';
  prefix: string;
  position: [number, number, number];
  sensitivity: number;
  damping: number;
  handleGeometry: GeometryDef;
  handleColor: number | string;
  armGeometry: GeometryDef;
  armColor: number | string;
  armOffset: [number, number, number];
}

export type ControlDef = SwitchControlDef | DialControlDef | CrankControlDef;

/** Plunger assembly config. */
export interface PlungerDef {
  prefix: string;
  position: [number, number, number];
  axis: 'x' | 'y' | 'z';
  minWorld: number;
  maxWorld: number;
  sensitivity: number;
  springBack: boolean;
  hitbox: GeometryDef;
  parts: Array<{
    name: string;
    geometry: GeometryDef;
    color: number | string;
    preset?: MaterialPreset;
    offset: [number, number, number];
  }>;
}

/** Burner config for heat machines. */
export interface BurnerDef {
  geometry: GeometryDef;
  color: number | string;
  preset?: MaterialPreset;
  position: [number, number, number];
}

/** Input contract binding (JSON-serializable). */
export interface ContractBindingDef {
  source: {entity: string; field: string};
  targets: Array<{entity: string; field: string}>;
  transform: BindingTransform;
}

/** Vibration config for powered/mechanical machines. */
export interface VibrationDef {
  frequency: number;
  amplitude: number;
  axes: ('x' | 'y' | 'z')[];
}

/** Vibration config specific to mechanical machines (proportional to crank). */
export interface MechanicalVibrationDef {
  frequencyBase: number;
  amplitudeScale: number;
  axes: ('x' | 'y' | 'z')[];
}

/**
 * Complete machine configuration (Tier 3).
 * Replaces grinderArchetype.ts, stufferArchetype.ts, stoveArchetype.ts.
 */
export interface MachineConfig {
  machineId: string;
  template: 'powered' | 'mechanical' | 'heat';
  housing: HousingComponentDef[];
  control: ControlDef;
  vibration?: VibrationDef;
  mechanicalVibration?: MechanicalVibrationDef;
  burner?: BurnerDef;
  extras: ExtraComponentDef[];
  plunger?: PlungerDef;
  contract: ContractBindingDef[];
}

// ---------------------------------------------------------------------------
// Gameplay Configs
// ---------------------------------------------------------------------------

export interface GrindingGameplayConfig {
  emaAlpha: number;
  slowTimerMultiplier: number;
  scorePenaltyPerStrike: number;
  dialogueDurationMs: number;
  successDelayMs: number;
  maxParticles: number;
  chunkCount: number;
  chunkBowlAngleDivisor: number;
  chunkBowlRadiusBase: number;
  chunkBowlRadiusStep: number;
  particleGravity: number;
  velocityDecay: number;
  hapticProgressInterval: number;
}

export interface StuffingGameplayConfig {
  numBones: number;
  sausageLength: number;
  sausageRadius: number;
  pinchScale: number;
  segmentsPerBone: number;
  nozzleTip: [number, number, number];
  scorePenaltyPerBurst: number;
  fillDropOnBurst: number;
  completeDelayMs: number;
  crankDragThreshold: number;
  burstCooldownMs: number;
}

export interface CookingGameplayConfig {
  panY: number;
  panHeight: number;
  sausageRadius: number;
  sausageHalfLength: number;
  burnerParams: Record<string, {color: [number, number, number]; emissive: number}>;
  colorRaw: [number, number, number];
  colorCooked: [number, number, number];
  colorCharred: [number, number, number];
  colorBurnt: [number, number, number];
  burnThreshold: number;
  smokeThreshold: number;
  steamCount: number;
  smokeCount: number;
  flipDuration: number;
  coolingRate: number;
  roomTemp: number;
  scorePenaltyPerOverheat: number;
  scoreBonusNoOverheat: number;
  completeDelaySec: number;
  sizzleThrottleMs: number;
}

// ---------------------------------------------------------------------------
// Physics Configs
// ---------------------------------------------------------------------------

export interface SausagePhysicsConfig {
  coil: {
    defaultLoops: number;
    defaultThickness: number;
    defaultPathSegments: number;
    defaultRadialSegments: number;
    radiusStart: number;
    radiusEnd: number;
    taperThreshold: number;
  };
  links: {
    defaultNumLinks: number;
    defaultLinkLength: number;
    pinchMinFactor: number;
  };
  spring: {
    defaultK: number;
    defaultDamping: number;
  };
  cooking: {
    shrinkageYFactor: number;
    edgeCurlFactor: number;
    sizzleAmplitude: number;
    sizzleFreqX: number;
    sizzleFreqZ: number;
  };
}

export interface GreasePhysicsConfig {
  waveSimSize: number;
  waveDamping: number;
  normalScale: number;
  material: {
    color: number;
    roughness: number;
    metalness: number;
    transmission: number;
    ior: number;
    displacementScale: number;
  };
  opacityBase: number;
  opacityScale: number;
  shimmerBaseRoughness: number;
  shimmerHeatRoughnessScale: number;
}

export interface PlungerPhysicsConfig {
  springRate: number;
}

// ---------------------------------------------------------------------------
// Scoring Config
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  cookTargets: Record<string, number>;
  cookTolerance: number;
  formMatch: number;
  formMismatch: number;
  cookMatch: number;
  cookMismatch: number;
  ingredientDesired: number;
  ingredientHated: number;
}

// ---------------------------------------------------------------------------
// Scene Configs
// ---------------------------------------------------------------------------

export interface FridgeSceneConfig {
  fridgeWidth: number;
  fridgeHeight: number;
  fridgeDepth: number;
  shelfYPositions: [number, number, number];
  ingredientDiameter: number;
  ingredientColliderPadding: number;
  shelfTiers: Record<string, number>;
  maxSpacing: number;
  zOffset: number;
}

export interface CasingSceneConfig {
  casingLength: number;
  casingBaseRadius: number;
  maxInflate: number;
  pulseThreshold: number;
  pulseSpeed: number;
  pulseAmplitude: number;
}

export interface BasementSceneConfig {
  pipes: {
    xFractions: [number, number, number];
    yOffsetFromCeiling: number;
    lengthFraction: number;
    radius: number;
    elbowPipeIndex: number;
    elbowZFraction: number;
    elbowLengthFraction: number;
    dripGrowRate: number;
  };
  window: {
    xEdgeOffset: number;
    yFraction: number;
    frameWidth: number;
    frameHeight: number;
    barCount: number;
    barRadius: number;
  };
  door: {
    xFraction: number;
    width: number;
    height: number;
    deadboltColor: string;
  };
  drain: {
    xFraction: number;
    zFraction: number;
    innerRadius: number;
    outerRadius: number;
  };
}

// ---------------------------------------------------------------------------
// Variants Config
// ---------------------------------------------------------------------------

export interface IngredientCriteria {
  tags: string[];
  description: string;
}

export interface IngredientVariant {
  criteria: IngredientCriteria;
  requiredCount: number;
  mrSausageDemand: string;
}

export interface GrindingVariant {
  targetSpeed: number;
  tolerance: number;
  targetProgress: number;
  timerSeconds: number;
}

export interface StuffingVariant {
  fillRate: number;
  pressureRate: number;
  pressureDecay: number;
  burstThreshold: number;
  timerSeconds: number;
}

export interface CookingVariant {
  targetTemp: number;
  tempTolerance: number;
  holdSeconds: number;
  heatRate: number;
  timerSeconds: number;
}

export interface VariantsConfig {
  ingredients: IngredientVariant[];
  grinding: GrindingVariant[];
  stuffing: StuffingVariant[];
  cooking: CookingVariant[];
}
