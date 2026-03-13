/**
 * @module config/sausage
 * Typed accessor for sausage.json -- sausage scoring and verdict parameters.
 */

import data from './sausage.json';

export interface ScoringParams {
  tasteWeight: number;
  textureWeight: number;
  burstPenalty: number;
  jitterRange: number;
  maxRuffalos: number;
  maxHoldDuration: number;
  tasteMaxPoints: number;
  blowMaxPoints: number;
  burstBonusPoints: number;
  maxScore: number;
}

export interface TitleTierEntry {
  threshold: number;
  title: string;
}

export interface VerdictThresholds {
  S: number;
  A: number;
  B: number;
}

export interface SausageConfig {
  scoring: ScoringParams;
  titleTiers: TitleTierEntry[];
  verdictThresholds: VerdictThresholds;
}

export const sausageConfig: SausageConfig = data as unknown as SausageConfig;

/** Get the title tier for a given score. */
export function getTitleTierForScore(score: number): string {
  const tiers = sausageConfig.titleTiers;
  let result = tiers[0].title;
  for (const tier of tiers) {
    if (score >= tier.threshold) {
      result = tier.title;
    }
  }
  return result;
}

/** Get the verdict rank letter for a given average score. */
export function getVerdictRank(averageScore: number): 'S' | 'A' | 'B' | 'F' {
  const t = sausageConfig.verdictThresholds;
  if (averageScore >= t.S) return 'S';
  if (averageScore >= t.A) return 'A';
  if (averageScore >= t.B) return 'B';
  return 'F';
}
