/**
 * IngredientMatcher tests — verifies tag derivation, criteria matching,
 * and ingredient filtering using the IngredientDef type.
 */

import {filterMatchingIngredients, getIngredientTags, matchesCriteria} from '../IngredientMatcher';
import type {IngredientDef} from '../Ingredients';

/** Helper to create a minimal test ingredient. */
function makeIngredient(overrides: Partial<IngredientDef> = {}): IngredientDef {
  return {
    id: 'test',
    name: 'Test Item',
    path: '/models/test.glb',
    scale: 1,
    category: 'food',
    tasteMod: 3,
    textureMod: 2,
    blowPower: 2,
    tags: [],
    // New fields carried by `IngredientDef` since the Zoombinis-in-Hell
    // composition pillar landed. IngredientMatcher tests don't exercise
    // traits or composition — they test tag derivation — so we use the
    // safest empty/neutral values that still satisfy the type.
    traits: [],
    composition: {
      decomposition: 'chunks',
      color: '#888888',
      shine: 0,
      density: 0.5,
      moisture: 0.5,
      fat: 0.5,
      particleScale: 0.5,
    },
    ...overrides,
  };
}

describe('IngredientMatcher — getIngredientTags', () => {
  it('preserves explicit tags from ingredient definition', () => {
    const ingredient = makeIngredient({tags: ['sweet', 'smooth']});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('sweet');
    expect(tags).toContain('smooth');
  });

  it('adds fancy tag when tasteMod >= 4', () => {
    const ingredient = makeIngredient({tasteMod: 4, tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('fancy');
  });

  it('adds chunky tag when textureMod >= 3', () => {
    const ingredient = makeIngredient({textureMod: 3, tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('chunky');
  });

  it('adds smooth tag when textureMod <= 1', () => {
    const ingredient = makeIngredient({textureMod: 1, tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('smooth');
  });

  it('adds savory for food category with tasteMod >= 3', () => {
    const ingredient = makeIngredient({category: 'food', tasteMod: 3, tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('savory');
  });

  it('does not add savory when sweet tag is already present', () => {
    const ingredient = makeIngredient({category: 'food', tasteMod: 4, tags: ['sweet']});
    const tags = getIngredientTags(ingredient);
    // sweet is present, so savory should not be auto-added
    expect(tags).toContain('sweet');
  });

  it('adds absurd tag for weird category', () => {
    const ingredient = makeIngredient({category: 'weird', tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('absurd');
  });

  it('adds absurd tag for trash category', () => {
    const ingredient = makeIngredient({category: 'trash', tags: []});
    const tags = getIngredientTags(ingredient);
    expect(tags).toContain('absurd');
  });

  it('deduplicates tags', () => {
    const ingredient = makeIngredient({tasteMod: 5, tags: ['fancy']});
    const tags = getIngredientTags(ingredient);
    const fancyCount = tags.filter(t => t === 'fancy').length;
    expect(fancyCount).toBe(1);
  });
});

describe('IngredientMatcher — matchesCriteria', () => {
  it('matches when ingredient has all required tags', () => {
    const ingredient = makeIngredient({tags: ['sweet', 'smooth']});
    expect(matchesCriteria(ingredient, {tags: ['sweet']})).toBe(true);
  });

  it('matches AND logic — all tags must be present', () => {
    const ingredient = makeIngredient({tags: ['sweet'], textureMod: 0});
    expect(matchesCriteria(ingredient, {tags: ['sweet', 'smooth']})).toBe(true);
    expect(matchesCriteria(ingredient, {tags: ['sweet', 'meat']})).toBe(false);
  });

  it('matches empty criteria (everything matches)', () => {
    const ingredient = makeIngredient();
    expect(matchesCriteria(ingredient, {tags: []})).toBe(true);
  });

  it('fails when ingredient is missing a required tag', () => {
    const ingredient = makeIngredient({tags: []});
    expect(matchesCriteria(ingredient, {tags: ['fancy']})).toBe(false);
  });
});

describe('IngredientMatcher — filterMatchingIngredients', () => {
  it('filters ingredients by criteria', () => {
    const ingredients = [
      makeIngredient({id: 'a', tags: ['sweet']}),
      makeIngredient({id: 'b', tags: []}),
      makeIngredient({id: 'c', tags: ['sweet']}),
    ];
    const matches = filterMatchingIngredients(ingredients, {tags: ['sweet']});
    expect(matches).toHaveLength(2);
  });

  it('returns empty array when nothing matches', () => {
    const ingredients = [makeIngredient({tags: []}), makeIngredient({tags: []})];
    const matches = filterMatchingIngredients(ingredients, {tags: ['fancy']});
    expect(matches).toHaveLength(0);
  });

  it('returns all when criteria is empty', () => {
    const ingredients = [makeIngredient({tags: []}), makeIngredient({tags: ['sweet']})];
    const matches = filterMatchingIngredients(ingredients, {tags: []});
    expect(matches).toHaveLength(2);
  });
});
