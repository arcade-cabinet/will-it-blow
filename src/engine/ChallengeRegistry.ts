/**
 * @module ChallengeRegistry
 * Maps GamePhase values to challenge configs, provides seeded variant
 * selection and final verdict calculation.
 */

import scoringConfig from '../config/scoring.json';
import type {GamePhase} from '../ecs/hooks';

export interface ChallengeConfig {
  phase: GamePhase;
  name: string;
  station: string;
  hasScoring: boolean;
}

const CHALLENGE_CONFIGS: ChallengeConfig[] = [
  {
    phase: 'SELECT_INGREDIENTS',
    name: 'Select Ingredients',
    station: 'ChestFreezer',
    hasScoring: false,
  },
  {phase: 'CHOPPING', name: 'Chopping', station: 'ChoppingBlock', hasScoring: true},
  {phase: 'FILL_GRINDER', name: 'Fill Grinder', station: 'Grinder', hasScoring: false},
  {phase: 'GRINDING', name: 'Grinding', station: 'Grinder', hasScoring: true},
  {phase: 'MOVE_BOWL', name: 'Move Bowl', station: 'Grinder', hasScoring: false},
  {phase: 'ATTACH_CASING', name: 'Attach Casing', station: 'Stuffer', hasScoring: false},
  {phase: 'STUFFING', name: 'Stuffing', station: 'Stuffer', hasScoring: true},
  {phase: 'TIE_CASING', name: 'Tie Casing', station: 'BlowoutStation', hasScoring: true},
  {phase: 'BLOWOUT', name: 'Blowout', station: 'BlowoutStation', hasScoring: true},
  {phase: 'MOVE_SAUSAGE', name: 'Move Sausage', station: 'Stove', hasScoring: false},
  {phase: 'MOVE_PAN', name: 'Move Pan', station: 'Stove', hasScoring: false},
  {phase: 'COOKING', name: 'Cooking', station: 'Stove', hasScoring: true},
  {phase: 'DONE', name: 'Tasting', station: 'TV', hasScoring: true},
];

const phaseToConfig = new Map(CHALLENGE_CONFIGS.map(c => [c.phase, c]));

/** Get the challenge config for a given phase. */
export function getChallengeConfig(phase: GamePhase): ChallengeConfig | undefined {
  return phaseToConfig.get(phase);
}

/** Get all challenge configs. */
export function getAllChallenges(): ChallengeConfig[] {
  return [...CHALLENGE_CONFIGS];
}

/** Deterministic variant selection using a seed. */
export function seededVariant(seed: number, length: number): number {
  if (length <= 0) return 0;
  return ((seed * 2654435761) >>> 0) % length;
}

export type Rank = 'S' | 'A' | 'B' | 'F';

export interface VerdictResult {
  rank: Rank;
  totalScore: number;
  title: string;
}

/** Calculate the final verdict from scores and demand bonus. */
export function calculateFinalVerdict(scores: number[], demandBonus: number): VerdictResult {
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = scores.length > 0 ? sum / scores.length : 0;
  const totalScore = Math.min(100, Math.max(0, avg + demandBonus));

  const thresholds = scoringConfig.rankThresholds;
  const verdicts = scoringConfig.verdicts;

  let rank: Rank;
  if (totalScore >= thresholds.S) rank = 'S';
  else if (totalScore >= thresholds.A) rank = 'A';
  else if (totalScore >= thresholds.B) rank = 'B';
  else rank = 'F';

  return {rank, totalScore: Math.round(totalScore), title: verdicts[rank]};
}
