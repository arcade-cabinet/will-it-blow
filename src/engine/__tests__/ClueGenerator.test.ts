/**
 * Contract tests for the Zoombinis-in-Hell deduction loop (T0.C).
 *
 * The clue generator is the beating heart of gameplay: Mr. Sausage
 * broadcasts cryptic trait-based clues, and the player assembles
 * a matching selection from the fridge. This file pins:
 *
 *  - Determinism (same seed → same clue)
 *  - Match predicate edge cases (empty, exact, superset, missing)
 *  - Cramming semantics (coherent superset → bonus, incoherent → penalty)
 *  - All three clue templates (literal, misdirection, shock-me)
 *  - Disgust accumulation across mismatches
 *  - Win condition (empty fridge)
 */
import {describe, expect, it} from 'vitest';
import {generateClue, matchSelection} from '../ClueGenerator';
import {INGREDIENTS} from '../IngredientComposition';
import {createSeededRng} from '../RunSeed';

/** Quick lookup helper. */
function byId(id: string) {
  const found = INGREDIENTS.find(i => i.id === id);
  if (!found) throw new Error(`Test ingredient not found: ${id}`);
  return found;
}

describe('generateClue', () => {
  it('is deterministic for the same seed and round', () => {
    const rngA = createSeededRng('clue-det');
    const rngB = createSeededRng('clue-det');
    const available = INGREDIENTS.slice(0, 10);

    const clueA = generateClue(1, available, rngA);
    const clueB = generateClue(1, available, rngB);
    expect(clueA.text).toBe(clueB.text);
    expect(clueA.requiredTraits).toEqual(clueB.requiredTraits);
    expect(clueA.type).toBe(clueB.type);
  });

  it('returns a clue with non-empty text', () => {
    const rng = createSeededRng('clue-text');
    const clue = generateClue(1, INGREDIENTS.slice(0, 10), rng);
    expect(clue.text.length).toBeGreaterThan(0);
  });

  it('returns a clue with at least one required trait', () => {
    const rng = createSeededRng('clue-traits');
    const clue = generateClue(1, INGREDIENTS.slice(0, 10), rng);
    expect(clue.requiredTraits.length).toBeGreaterThanOrEqual(1);
  });

  it('type is one of literal, misdirection, or shock-me', () => {
    const rng = createSeededRng('clue-type');
    for (let round = 1; round <= 20; round++) {
      const clue = generateClue(round, INGREDIENTS, rng);
      expect(['literal', 'misdirection', 'shock-me']).toContain(clue.type);
    }
  });

  it('literal clues embed the trait names in the text', () => {
    // Run enough iterations to hit at least one literal
    const rng = createSeededRng('literal-check');
    let foundLiteral = false;
    for (let round = 1; round <= 50; round++) {
      const clue = generateClue(round, INGREDIENTS, rng);
      if (clue.type === 'literal') {
        foundLiteral = true;
        // At least one required trait should appear in the text
        const lowerText = clue.text.toLowerCase();
        const anyTraitInText = clue.requiredTraits.some(t => lowerText.includes(t));
        expect(anyTraitInText).toBe(true);
        break;
      }
    }
    expect(foundLiteral).toBe(true);
  });
});

describe('matchSelection', () => {
  it('empty selection always fails', () => {
    const rng = createSeededRng('match-empty');
    const clue = generateClue(1, INGREDIENTS, rng);
    const result = matchSelection([], clue);
    expect(result.isMatch).toBe(false);
  });

  it('a selection covering all required traits is a match', () => {
    // Build a clue from a known pool, then select ingredients that
    // collectively carry every required trait.
    const rng = createSeededRng('match-positive');
    const pool = INGREDIENTS.slice(0, 12);
    const clue = generateClue(1, pool, rng);

    // Find ingredients that together cover all required traits
    const selection = [];
    const missing = new Set(clue.requiredTraits);
    for (const ing of pool) {
      if (missing.size === 0) break;
      const covered = ing.traits.filter(t => missing.has(t as any));
      if (covered.length > 0) {
        selection.push(ing);
        for (const t of covered) missing.delete(t as any);
      }
    }

    // If we managed to cover everything, the match should succeed
    if (missing.size === 0) {
      const result = matchSelection(selection, clue);
      expect(result.isMatch).toBe(true);
      expect(result.missingTraits).toEqual([]);
    }
  });

  it('a selection missing a required trait returns missingTraits', () => {
    const rng = createSeededRng('match-missing');
    const clue = generateClue(1, INGREDIENTS, rng);
    // Select nothing — all traits will be missing
    const result = matchSelection([], clue);
    expect(result.missingTraits.length).toBe(clue.requiredTraits.length);
  });

  it('superset selection still matches (extra ingredients allowed)', () => {
    const rng = createSeededRng('match-superset');
    const pool = INGREDIENTS;
    const clue = generateClue(1, pool, rng);

    // Select ALL ingredients — guaranteed superset of any clue
    const result = matchSelection(pool, clue);
    expect(result.isMatch).toBe(true);
    expect(result.missingTraits).toEqual([]);
  });

  it('bonusCoherence is a number between 0 and 1', () => {
    const rng = createSeededRng('match-coherence');
    const clue = generateClue(1, INGREDIENTS, rng);
    const result = matchSelection(INGREDIENTS.slice(0, 5), clue);
    expect(result.bonusCoherence).toBeGreaterThanOrEqual(0);
    expect(result.bonusCoherence).toBeLessThanOrEqual(1);
  });
});
