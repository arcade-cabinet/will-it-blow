/**
 * @module dialogueRunner
 * Bridge between DialogueEngine.applyEffects() and the game store (T2.D).
 *
 * The DialogueEngine accumulates effects from player choices (hint, taunt,
 * stall, anger) and computes EffectDeltas via applyEffects(). This module
 * translates those deltas into concrete gameplay state changes that other
 * systems consume.
 *
 * WHY a separate module: The DialogueEngine is a pure data class with no
 * knowledge of the ECS/store. The DialogueOverlay is a React component
 * that shouldn't own gameplay logic. This runner bridges the gap, keeping
 * both the engine and the overlay clean.
 */

import type {EffectDeltas} from './DialogueEngine';

/**
 * Translates EffectDeltas from DialogueEngine.applyEffects() into a
 * patch object that callers can apply to the game store.
 *
 * This is intentionally a pure function (no side effects) so it can be
 * unit tested without mocking the store.
 */
export function applyDialogueDeltas(deltas: EffectDeltas): EffectDeltas {
  // Currently a pass-through; the caller applies the patch to the store.
  // This indirection exists so we can add clamping, scaling by difficulty,
  // or logging in one place without touching DialogueEngine or the store.
  return {
    timeBonusSec: deltas.timeBonusSec,
    scorePenalty: deltas.scorePenalty,
    strikeAdd: deltas.strikeAdd,
    timeDeductSec: deltas.timeDeductSec,
  };
}
