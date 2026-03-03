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
  emissive?: number | string;
  emissiveIntensity?: number;
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
  flicker?: {dimIntensity: number; intervalMin: number; intervalMax: number; duration: number};
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
  lightDef?: {type: 'point'; color: number; intensity: number; distance: number; decay?: number};
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

/** Tube layout within a light box — positions computed from box fractions. */
export interface TubeLayoutDef {
  /** Number of tubes (must match depthFractions length) */
  count: number;
  /** Where each tube sits along the depth axis (0=front, 1=back) */
  depthFractions: number[];
  /** Fraction of box width to inset from each wall (e.g., 0.05 = 5% shorter each side) */
  wallInsetFraction: number;
  /** Tube cylinder radius */
  radius: number;
  /** Y offset from housing center (negative = below ceiling) */
  yOffset: number;
  /** Tube material (should have emissive for glow) */
  material: MaterialDef;
  /** Endcap cylinder radius */
  endcapRadius: number;
  /** Endcap cylinder length */
  endcapLength: number;
  /** Endcap material */
  endcapMaterial: MaterialDef;
}

/** Light box definition — auto-generates tube housing components from fractions. */
export interface LightBoxDef {
  /** Internal box width (X axis) for computing tube lengths */
  width: number;
  /** Internal box depth (Z axis) for computing tube positions */
  depth: number;
  /** Tube auto-placement rules */
  tubeLayout: TubeLayoutDef;
}

/** CRT display config — screen geometry, character placement, and reaction intensity. */
export interface CrtDisplayConfig {
  screen: {width: number; height: number; z: number};
  bezel: {width: number; height: number; z: number};
  character: {scale: number; yOffset: number};
  reactionIntensity: Record<string, number>;
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
 *
 * All machines use the same config shape — the template determines default
 * composition (what gets auto-added), but control/contract/vibration are
 * always optional. A 'bare' machine is just housing + extras with no
 * template-specific composition. This means any machine can gain controls,
 * state-driven behaviors, or input contracts without changing template type.
 */
export interface MachineConfig {
  machineId: string;
  template: 'powered' | 'mechanical' | 'heat' | 'bare';
  housing: HousingComponentDef[];
  control?: ControlDef;
  vibration?: VibrationDef;
  mechanicalVibration?: MechanicalVibrationDef;
  burner?: BurnerDef;
  extras: ExtraComponentDef[];
  plunger?: PlungerDef;
  contract?: ContractBindingDef[];
  display?: CrtDisplayConfig;
  lightBox?: LightBoxDef;
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
  hopperChunkCount: number;
  hopperTopY: number;
  hopperBottomY: number;
  hopperSpreadX: number;
  hopperSpreadZ: number;
  hopperChunkScale: number;
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

export interface ChoppingGameplayConfig {
  chopTarget: number;
  sweetSpotWindow: number;
  goodChopProgress: number;
  badChopProgress: number;
  knifeBaseFrequency: number;
  knifeAmplitude: number;
  knifeRestY: number;
  dialogueDurationMs: number;
  successDelayMs: number;
  scorePenaltyPerStrike: number;
  streakBonusThreshold: number;
  streakFlairPoints: number;
  missStrikeCooldownMs: number;
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
  maxFlips: number;
  flipFlairPoints: number;
  flipHoldTimerPenalty: number;
}

export interface BlowoutGameplayConfig {
  timerSeconds: number;
  maxPressure: number;
  pressureDecayRate: number;
  pressureBuildRate: number;
  particleCount: number;
  particleGravity: number;
  particleSpread: number;
  particleInitialSpeed: number;
  coveragePerHit: number;
  floorPenaltyPerHit: number;
  fastTieThresholdMs: number;
  fastTieFlairPoints: number;
  completeDelaySec: number;
  boxPosition: [number, number, number];
  boxHalfWidth: number;
  boxHalfHeight: number;
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

export interface ChoppingVariant {
  chopCount: number;
  knifeSpeed: number;
  sweetSpotSize: number;
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
  chopping: ChoppingVariant[];
  grinding: GrindingVariant[];
  stuffing: StuffingVariant[];
  cooking: CookingVariant[];
}

// ---------------------------------------------------------------------------
// Display Housing Config
// ---------------------------------------------------------------------------

export interface DisplayHousingConfig {
  housingId: string;
  mountType: 'ceiling' | 'wall';
  width: number;
  depth: number;
  thickness: number;
  bracketColor: string;
  bracketRoughness?: number;
  bracketMetalness?: number;
}

// ---------------------------------------------------------------------------
// Lighting Scene Config
// ---------------------------------------------------------------------------

export interface LightingSceneConfig {
  panels: Array<{position: [number, number, number]; rotationY?: number}>;
  ambient: {hemisphere: number; centerFill: number};
  horror: {
    redEmergency: {position: [number, number, number]; intensity: number};
    underCounter: {intensity: number};
  };
}

// ---------------------------------------------------------------------------
// Challenge Sequence Config
// ---------------------------------------------------------------------------

export interface ChallengeSequenceConfig {
  stations: Array<{
    stationName: string;
    challengeType: string;
  }>;
}

// ---------------------------------------------------------------------------
// Horror Props Config
// ---------------------------------------------------------------------------

export interface HorrorPropDef {
  id: string;
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  tier: 1 | 2;
  /**
   * If set, this prop is a flickering PSX lamp. The value is the `_on` variant
   * model path. The component alternates between `model` (_off) and `modelOn`
   * using a randomized timer — no ECS entity needed.
   */
  modelOn?: string;
  /** Flicker interval range in seconds [min, max]. Defaults to [1.5, 4.0]. */
  flickerInterval?: [number, number];
}

export interface HorrorPropsConfig {
  props: HorrorPropDef[];
}

// ---------------------------------------------------------------------------
// Enemy / Combat Config
// ---------------------------------------------------------------------------

export interface EnemyDef {
  id: string;
  name: string;
  /** GLB model path relative to models/, or null for procedural (living sausage). */
  model: string | null;
  hp: number;
  speed: number;
  damage: number;
  spawnLocation: string;
  /** Milliseconds the player has to react before the enemy starts attacking. */
  reactionWindowMs: number;
  /** Ingredient name dropped when defeated. */
  deathDropIngredient: string;
  /** Mr. Sausage commentary lines for this enemy type. */
  commentary: string[];
}

export interface WeaponDef {
  id: string;
  name: string;
  model: string;
  damage: number;
  range: number;
  knockback: number;
  swingSpeedThreshold: number;
  hitSfx: string;
}

export interface SpawnCabinetDef {
  id: string;
  position: [number, number, number];
  doorRotationAxis: string;
  doorHinge: [number, number, number];
}

export interface EnemiesConfig {
  enemies: EnemyDef[];
  weapons: WeaponDef[];
  spawnCabinets: SpawnCabinetDef[];
}

// ---------------------------------------------------------------------------
// Audio Config
// ---------------------------------------------------------------------------

export interface ChallengeTrackDef {
  file: string;
  volume: number;
}

export interface SpatialSoundDef {
  file: string;
  volume: number;
  position: [number, number, number];
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
  loop: boolean;
}

export interface AudioConfig {
  challengeTracks: Record<string, ChallengeTrackDef>;
  enemyTrack: ChallengeTrackDef;
  defeatTrack: ChallengeTrackDef;
  crossfadeDuration: number;
  spatialSounds: Record<string, SpatialSoundDef>;
}
