import {
  filterMatchingIngredients,
  getIngredientTags,
  type IngredientCriteria,
  matchesCriteria,
} from '../src/engine/IngredientMatcher';
import {INGREDIENT_MODELS} from '../src/engine/Ingredients';

const findByName = (name: string) => INGREDIENT_MODELS.find(i => i.name === name)!;

describe('getIngredientTags', () => {
  it('returns a tags array for any ingredient', () => {
    for (const ing of INGREDIENT_MODELS) {
      const tags = getIngredientTags(ing);
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    }
  });

  it('Steak has fancy and meat tags', () => {
    const tags = getIngredientTags(findByName('Raw Steak'));
    expect(tags).toContain('fancy');
    expect(tags).toContain('meat');
  });

  it('Cake has sweet and comfort tags', () => {
    const tags = getIngredientTags(findByName('Cake'));
    expect(tags).toContain('sweet');
    expect(tags).toContain('comfort');
  });

  it('Burger has savory and fast-food tags', () => {
    const tags = getIngredientTags(findByName('Burger'));
    expect(tags).toContain('savory');
    expect(tags).toContain('fast-food');
  });
});

describe('matchesCriteria', () => {
  it('matches when ingredient has all required tags', () => {
    const steak = findByName('Raw Steak');
    const criteria: IngredientCriteria = {tags: ['fancy']};
    expect(matchesCriteria(steak, criteria)).toBe(true);
  });

  it('does not match when missing a tag', () => {
    const cake = findByName('Cake');
    const criteria: IngredientCriteria = {tags: ['savory']};
    expect(matchesCriteria(cake, criteria)).toBe(false);
  });

  it('works with multi-tag criteria', () => {
    const steak = findByName('Raw Steak');
    const criteria: IngredientCriteria = {
      tags: ['fancy', 'meat', 'chunky'],
    };
    expect(matchesCriteria(steak, criteria)).toBe(true);

    const missingCriteria: IngredientCriteria = {
      tags: ['fancy', 'sweet'],
    };
    expect(matchesCriteria(steak, missingCriteria)).toBe(false);
  });
});

describe('filterMatchingIngredients', () => {
  it('returns only matching ingredients', () => {
    const criteria: IngredientCriteria = {tags: ['absurd', 'chunky']};
    const results = filterMatchingIngredients(INGREDIENT_MODELS, criteria);
    for (const ing of results) {
      const tags = getIngredientTags(ing);
      expect(tags).toContain('absurd');
      expect(tags).toContain('chunky');
    }
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns fewer than total for any specific criteria', () => {
    const criteria: IngredientCriteria = {tags: ['fancy']};
    const results = filterMatchingIngredients(INGREDIENT_MODELS, criteria);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(INGREDIENT_MODELS.length);
  });
});
