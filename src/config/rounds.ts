/**
 * @module config/rounds
 * Typed accessor for rounds.json -- multi-round game configuration.
 */

import data from './rounds.json';

export interface ReactionQuipEntry {
  threshold: number;
  text: string;
}

export interface RoundsConfig {
  picksPerRound: number;
  roundsByDifficulty: Record<string, number>;
  defaultRounds: number;
  reactionQuips: Record<string, ReactionQuipEntry>;
  emptyScoresQuip: string;
}

export const roundsConfig: RoundsConfig = data as unknown as RoundsConfig;

/** Get the number of rounds for a given difficulty tier ID. */
export function getRoundsForDifficulty(difficultyId: string): number {
  return roundsConfig.roundsByDifficulty[difficultyId] ?? roundsConfig.defaultRounds;
}

/** Get a reaction quip based on average score. */
export function getReactionQuip(averageScore: number): string {
  const quips = roundsConfig.reactionQuips;
  if (averageScore >= quips.excellent.threshold) return quips.excellent.text;
  if (averageScore >= quips.good.threshold) return quips.good.text;
  if (averageScore >= quips.mediocre.threshold) return quips.mediocre.text;
  return quips.terrible.text;
}
