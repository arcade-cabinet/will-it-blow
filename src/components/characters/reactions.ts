/**
 * @module reactions
 * Procedural animation targets for Mr. Sausage's emotional reactions.
 *
 * Each {@link Reaction} maps to a {@link ReactionTargets} record of transform
 * offsets (body Y, rotations, arm angles, shake intensity) that MrSausage3D
 * interpolates toward. Dialogue lines reference reactions by name so the
 * 3D character emotes in sync with the text.
 */

/**
 * Named emotional states Mr. Sausage can express.
 * Set by dialogue lines via the `reaction` field on {@link DialogueLine}.
 */
export type Reaction =
  | 'idle'
  | 'flinch'
  | 'laugh'
  | 'disgust'
  | 'excitement'
  | 'nervous'
  | 'nod'
  | 'talk'
  | 'eating'
  | 'judging';

/**
 * Procedural animation target values for a single reaction.
 * MrSausage3D lerps from current pose to these offsets over `duration` ms.
 * If `loop` is true the animation cycles continuously (e.g., idle bob, laughing shake).
 */
export interface ReactionTargets {
  bodyY?: number;
  bodyRotZ?: number;
  headRotX?: number;
  armLRotZ?: number;
  armRRotZ?: number;
  shakeIntensity?: number;
  duration: number;
  loop?: boolean;
}

/** Lookup table from reaction name to procedural animation targets. */
export const REACTIONS: Record<Reaction, ReactionTargets> = {
  idle: {duration: 2000, loop: true},
  flinch: {bodyRotZ: -0.2, armLRotZ: -0.8, armRRotZ: 0.8, duration: 400},
  laugh: {shakeIntensity: 0.15, bodyY: 0.2, duration: 800, loop: true},
  disgust: {bodyRotZ: 0.15, headRotX: -0.3, duration: 600},
  excitement: {bodyY: 0.5, armLRotZ: -1.2, armRRotZ: 1.2, duration: 500},
  nervous: {bodyRotZ: 0.05, shakeIntensity: 0.03, duration: 1000, loop: true},
  nod: {headRotX: 0.3, duration: 300},
  talk: {shakeIntensity: 0.02, duration: 400, loop: true},
  eating: {bodyY: -0.1, headRotX: -0.2, shakeIntensity: 0.1, duration: 600, loop: true},
  judging: {bodyRotZ: 0.1, headRotX: 0.1, armLRotZ: -0.5, duration: 1500},
};
