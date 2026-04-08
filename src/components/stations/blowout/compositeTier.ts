/**
 * @module compositeTier
 * Maps the composite mix profile to a named tier that determines the
 * quality of the "Will It Blow?" splatter moment.
 *
 * The tier combines density, fat, and moisture from the CompositeMix
 * to produce one of four outcomes. Higher-quality mixes (denser, fattier,
 * wetter) blow harder and score higher. This creates a feedback loop
 * where the player's ingredient choices (driven by the deduction clue)
 * directly affect the climax of the round.
 *
 * Pure function, no side effects, easily testable.
 */
import type {CompositeMix} from '../../../engine/IngredientComposition';

/** Named tiers for the blowout outcome. */
export type BlowoutTier = 'massive' | 'clean' | 'weak' | 'dud';

export interface TierResult {
  readonly tier: BlowoutTier;
  /** Flair points awarded for this tier. */
  readonly points: number;
  /** Label shown in the surreal text flash. */
  readonly label: string;
  /** Mr. Sausage reaction to trigger. */
  readonly reaction: 'excitement' | 'nod' | 'disgust' | 'laugh';
  /** 0-1 power multiplier for particle velocity/count. */
  readonly power: number;
}

/**
 * Compute a single 0-1 "blow potential" score from the composite mix.
 * Density drives the core explosion, fat amplifies it, and moisture
 * adds a spray factor. The weights were tuned so that a 3-ingredient
 * "all meat" mix (high density + fat, moderate moisture) hits ~0.75,
 * while a "all trash" mix (low everything) sits around ~0.25.
 */
export function blowPotential(mix: CompositeMix): number {
  return Math.min(1, mix.density * 0.5 + mix.fat * 0.3 + mix.moisture * 0.2);
}

/**
 * Map a composite mix to a tier result. The thresholds are deliberately
 * forgiving — a player who "reads" the casing colour and picks
 * complementary ingredients should clear 'clean' comfortably. 'massive'
 * requires deliberate stacking of density + fat + moisture.
 */
export function getCompositeTier(mix: CompositeMix): TierResult {
  const potential = blowPotential(mix);

  if (potential > 0.7) {
    return {
      tier: 'massive',
      points: 15,
      label: 'MASSIVE EXPLOSION',
      reaction: 'excitement',
      power: 0.9 + potential * 0.1,
    };
  }
  if (potential > 0.45) {
    return {
      tier: 'clean',
      points: 10,
      label: 'CLEAN BURST',
      reaction: 'nod',
      power: 0.5 + potential * 0.3,
    };
  }
  if (potential > 0.15) {
    return {
      tier: 'weak',
      points: 3,
      label: 'WEAK POP',
      reaction: 'disgust',
      power: 0.2 + potential * 0.2,
    };
  }
  return {
    tier: 'dud',
    points: 0,
    label: 'DUD',
    reaction: 'laugh',
    power: 0.05,
  };
}
