/**
 * Unit tests pinning the IngredientComposition schema + helpers.
 *
 * This test file is the **contract** for the Zoombinis-in-Hell
 * deduction pillar. If a future refactor breaks any of these, the
 * downstream clue generator + composition pipeline will silently
 * mis-render or mis-match. Treat failures here as CRITICAL — don't
 * weaken assertions to get back to green.
 */
import {describe, expect, it} from 'vitest';
import {
  compositeMix,
  type DecompositionType,
  hasAllTraits,
  hasAnyTrait,
  INGREDIENTS,
  type IngredientDef,
  type IngredientTrait,
  sampleDecomposition,
  selectionSatisfiesClue,
  traitSetOf,
} from '../IngredientComposition';

/** Helper — look up by id so tests read like gameplay. */
function byId(id: string): IngredientDef {
  const found = INGREDIENTS.find(i => i.id === id);
  if (!found) throw new Error(`Test ingredient not in roster: ${id}`);
  return found;
}

// ─── Schema sanity ───────────────────────────────────────────────────

describe('INGREDIENTS roster', () => {
  it('has at least the known 20 ingredients loaded from JSON', () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('every ingredient has a non-empty traits array', () => {
    for (const ing of INGREDIENTS) {
      expect(ing.traits.length, `${ing.id} has no traits`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every ingredient has a valid composition profile', () => {
    const validDecomp: DecompositionType[] = ['chunks', 'paste', 'powder', 'shards', 'liquid'];
    for (const ing of INGREDIENTS) {
      const c = ing.composition;
      expect(validDecomp, `${ing.id}.decomposition`).toContain(c.decomposition);
      expect(c.color, `${ing.id}.color`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.shine).toBeGreaterThanOrEqual(0);
      expect(c.shine).toBeLessThanOrEqual(1);
      expect(c.density).toBeGreaterThanOrEqual(0);
      expect(c.density).toBeLessThanOrEqual(1);
      expect(c.moisture).toBeGreaterThanOrEqual(0);
      expect(c.moisture).toBeLessThanOrEqual(1);
      expect(c.fat).toBeGreaterThanOrEqual(0);
      expect(c.fat).toBeLessThanOrEqual(1);
      expect(c.particleScale).toBeGreaterThanOrEqual(0);
      expect(c.particleScale).toBeLessThanOrEqual(1);
    }
  });

  it('has overlapping traits so any given trait matches multiple ingredients (anti-memorization)', () => {
    // Every core trait used by the clue generator should be carried by
    // at least two different ingredients in the food fridge. Otherwise
    // a clue that includes that trait becomes a one-answer lookup and
    // the puzzle devolves into memorization.
    const coreTraits: IngredientTrait[] = [
      'sweet',
      'meat',
      'squishy',
      'pointy',
      'crunchy',
      'fatty',
      'wet',
      'dry',
    ];
    for (const trait of coreTraits) {
      const carriers = INGREDIENTS.filter(i => i.traits.includes(trait));
      expect(
        carriers.length,
        `only ${carriers.length} ingredient carries '${trait}'`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('has at least one ingredient in every decomposition type so the composition pipeline has variety', () => {
    const seen = new Set<DecompositionType>();
    for (const ing of INGREDIENTS) {
      seen.add(ing.composition.decomposition);
    }
    expect(seen.has('chunks')).toBe(true);
    expect(seen.has('paste')).toBe(true);
    expect(seen.has('powder')).toBe(true);
    expect(seen.has('shards')).toBe(true);
    expect(seen.has('liquid')).toBe(true);
  });
});

// ─── Trait helpers ───────────────────────────────────────────────────

describe('traitSetOf', () => {
  it('returns a set containing every trait the ingredient carries', () => {
    const banana = byId('banana');
    const set = traitSetOf(banana);
    expect(set.has('sweet')).toBe(true);
    expect(set.has('squishy')).toBe(true);
    expect(set.has('wholesome')).toBe(true);
  });

  it('caches the set so repeated calls return reference-equal values', () => {
    const banana = byId('banana');
    expect(traitSetOf(banana)).toBe(traitSetOf(banana));
  });
});

describe('hasAllTraits', () => {
  it('returns true when ingredient carries every required trait', () => {
    const steak = byId('steak');
    expect(hasAllTraits(steak, ['meat', 'fatty', 'umami'])).toBe(true);
  });

  it('returns false when any required trait is missing', () => {
    const steak = byId('steak');
    expect(hasAllTraits(steak, ['meat', 'sweet'])).toBe(false);
  });

  it('returns true for empty requirement (vacuously satisfied)', () => {
    const steak = byId('steak');
    expect(hasAllTraits(steak, [])).toBe(true);
  });
});

describe('hasAnyTrait', () => {
  it('returns true if ingredient carries any one of the requested traits', () => {
    const bread = byId('bread');
    expect(hasAnyTrait(bread, ['meat', 'dry'])).toBe(true);
  });

  it('returns false when none of the requested traits are present', () => {
    const bread = byId('bread');
    expect(hasAnyTrait(bread, ['meat', 'spicy', 'metallic'])).toBe(false);
  });
});

// ─── Match predicate (the core deduction loop) ───────────────────────

describe('selectionSatisfiesClue', () => {
  it('single-ingredient single-trait clue: one matching ingredient satisfies', () => {
    expect(selectionSatisfiesClue([byId('steak')], ['meat'])).toBe(true);
    expect(selectionSatisfiesClue([byId('bread')], ['meat'])).toBe(false);
  });

  it('two-trait clue: different ingredients can each carry one trait', () => {
    // "Squishy and pointy" — satisfied by banana (squishy) + pepper (pointy)
    const selection = [byId('banana'), byId('pepper')];
    expect(selectionSatisfiesClue(selection, ['squishy', 'pointy'])).toBe(true);
  });

  it('rejects a selection missing one of the required traits', () => {
    // "Squishy and pointy" — banana alone is only squishy
    expect(selectionSatisfiesClue([byId('banana')], ['squishy', 'pointy'])).toBe(false);
  });

  it('allows extra ingredients beyond the requirement (cramming shortcut)', () => {
    // Player crams 4 ingredients into a "squishy and pointy" 2-trait clue.
    // Legal — the requirement is a lower bound, not an exact match.
    const selection = [byId('banana'), byId('pepper'), byId('worm'), byId('bacon')];
    expect(selectionSatisfiesClue(selection, ['squishy', 'pointy'])).toBe(true);
  });

  it('empty selection fails any non-empty clue', () => {
    expect(selectionSatisfiesClue([], ['meat'])).toBe(false);
  });

  it('empty clue is vacuously satisfied by any selection', () => {
    expect(selectionSatisfiesClue([byId('banana')], [])).toBe(true);
  });
});

// ─── Composite mixing ────────────────────────────────────────────────

describe('compositeMix', () => {
  it('empty selection returns a null-mix the renderer can still read', () => {
    const mix = compositeMix([]);
    expect(mix.sources).toHaveLength(0);
    expect(mix.decompositionWeights.chunks).toBe(0);
    expect(mix.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('single ingredient passes through decomposition weight of 1.0', () => {
    const mix = compositeMix([byId('steak')]);
    expect(mix.decompositionWeights.chunks).toBe(1);
    expect(mix.decompositionWeights.paste).toBe(0);
    expect(mix.decompositionWeights.liquid).toBe(0);
  });

  it('mixing two ingredients yields 50/50 decomposition weights when types differ', () => {
    // Steak is chunks, banana is paste
    const mix = compositeMix([byId('steak'), byId('banana')]);
    expect(mix.decompositionWeights.chunks).toBeCloseTo(0.5);
    expect(mix.decompositionWeights.paste).toBeCloseTo(0.5);
  });

  it('averages moisture / fat / shine across the selection', () => {
    const steak = byId('steak');
    const banana = byId('banana');
    const mix = compositeMix([steak, banana]);
    expect(mix.moisture).toBeCloseTo(
      (steak.composition.moisture + banana.composition.moisture) / 2,
    );
    expect(mix.fat).toBeCloseTo((steak.composition.fat + banana.composition.fat) / 2);
    expect(mix.shine).toBeCloseTo((steak.composition.shine + banana.composition.shine) / 2);
  });

  it('produces a colour that lies between the source colours', () => {
    const mix = compositeMix([byId('steak'), byId('banana')]);
    // Steak is dark red (#9a2121), banana is pale yellow (#ead77a). The
    // average should be a somewhere-in-between hue — assert the red
    // channel is between the two sources.
    const red = parseInt(mix.color.slice(1, 3), 16);
    expect(red).toBeGreaterThan(0x9a);
    expect(red).toBeLessThan(0xea);
  });
});

describe('sampleDecomposition', () => {
  it('returns zero-length array when count is 0', () => {
    const mix = compositeMix([byId('steak')]);
    expect(sampleDecomposition(mix, 0)).toHaveLength(0);
  });

  it('returns exactly `count` samples', () => {
    const mix = compositeMix([byId('steak'), byId('banana'), byId('pepper')]);
    expect(sampleDecomposition(mix, 10)).toHaveLength(10);
    expect(sampleDecomposition(mix, 100)).toHaveLength(100);
    expect(sampleDecomposition(mix, 301)).toHaveLength(301);
  });

  it('respects weight proportions roughly', () => {
    // Pure steak (chunks) → every sample should be chunks.
    const pure = compositeMix([byId('steak')]);
    const samples = sampleDecomposition(pure, 50);
    expect(samples.every(s => s === 'chunks')).toBe(true);
  });

  it('produces a mixed sample when multiple decomposition types are in the composite', () => {
    // Steak (chunks) + banana (paste) + pepper (shards) + bread (powder)
    const mix = compositeMix([byId('steak'), byId('banana'), byId('pepper'), byId('bread')]);
    const samples = sampleDecomposition(mix, 100);
    const seen = new Set(samples);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
