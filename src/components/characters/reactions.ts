export type Reaction =
  | 'idle'
  | 'flinch'
  | 'laugh'
  | 'disgust'
  | 'excitement'
  | 'nervous'
  | 'nod'
  | 'talk';

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

export const REACTIONS: Record<Reaction, ReactionTargets> = {
  idle: {duration: 2000, loop: true},
  flinch: {bodyRotZ: -0.2, armLRotZ: -0.8, armRRotZ: 0.8, duration: 400},
  laugh: {shakeIntensity: 0.15, bodyY: 0.2, duration: 800, loop: true},
  disgust: {bodyRotZ: 0.15, headRotX: -0.3, duration: 600},
  excitement: {bodyY: 0.5, armLRotZ: -1.2, armRRotZ: 1.2, duration: 500},
  nervous: {bodyRotZ: 0.05, shakeIntensity: 0.03, duration: 1000, loop: true},
  nod: {headRotX: 0.3, duration: 300},
  talk: {shakeIntensity: 0.02, duration: 400, loop: true},
};
