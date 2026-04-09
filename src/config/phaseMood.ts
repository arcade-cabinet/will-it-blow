/**
 * @module config/phaseMood
 * Typed accessor for phaseMood.json — per-phase lighting color
 * temperature, intensity, and fog density targets used by
 * PhaseLighting and PhaseFog.
 *
 * D.4: Added fogDensity per phase. BLOWOUT gets dense fog (smoke/dust),
 * SELECT_INGREDIENTS gets lighter fog (clearer fridge view).
 */

import type {GamePhase} from '../ecs/hooks';
import data from './phaseMood.json';

export interface PhaseMoodEntry {
  color: string;
  intensity: number;
  fogDensity: number;
}

const phaseMoodMap = data as Record<string, PhaseMoodEntry>;

/** Default mood when the current phase has no explicit entry. */
export const DEFAULT_MOOD: PhaseMoodEntry = {color: '#c8c8c8', intensity: 4, fogDensity: 0.018};

/** Get the mood entry for a given game phase (falls back to DEFAULT_MOOD). */
export function getPhaseMood(phase: GamePhase | string): PhaseMoodEntry {
  return phaseMoodMap[phase] ?? DEFAULT_MOOD;
}

/** Get the full phase mood map. */
export function getAllPhaseMoods(): Record<string, PhaseMoodEntry> {
  return phaseMoodMap;
}
