/**
 * @module config/scoring
 * Typed accessors for the scoring configuration.
 *
 * Provides lookup functions for scoring parameters, rank thresholds,
 * and verdict labels used by DemandScoring and the tasting verdict.
 */

import scoringData from './scoring.json';

/** Scoring configuration loaded from scoring.json. */
export interface ScoringConfig {
  rankThresholds: Record<string, number>;
  weights: {
    tasteMultiplier: number;
    textureMultiplier: number;
    desiredTagBonus: number;
    hatedTagPenalty: number;
    cookMatchBonus: number;
    cookMismatchPenalty: number;
    blowPowerMultiplier: number;
  };
  scoreRange: {min: number; max: number};
  verdicts: Record<string, string>;
}

const cfg = scoringData as ScoringConfig;

/** Get the full scoring configuration object. */
export function getScoringConfig(): ScoringConfig {
  return cfg;
}

/** Get the rank threshold for a given rank letter. */
export function getRankThreshold(rank: string): number | undefined {
  return cfg.rankThresholds[rank];
}

/** Get the verdict title for a given rank letter. */
export function getVerdict(rank: string): string | undefined {
  return cfg.verdicts[rank];
}

/** Get all rank letters in descending order of threshold. */
export function getRankOrder(): string[] {
  return Object.entries(cfg.rankThresholds)
    .sort(([, a], [, b]) => b - a)
    .map(([rank]) => rank);
}
