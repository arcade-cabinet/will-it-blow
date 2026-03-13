/**
 * Ingredients tests — verifies the ingredient model pool, categories,
 * and data integrity.
 */

import {getIngredientById, INGREDIENT_MODELS} from '../Ingredients';

describe('Ingredients — INGREDIENT_MODELS pool', () => {
  it('has at least 10 ingredients', () => {
    expect(INGREDIENT_MODELS.length).toBeGreaterThanOrEqual(10);
  });

  it('each ingredient has required fields', () => {
    for (const ing of INGREDIENT_MODELS) {
      expect(ing.id).toBeTruthy();
      expect(ing.name).toBeTruthy();
      expect(ing.path).toBeTruthy();
      expect(typeof ing.scale).toBe('number');
      expect(ing.category).toBeTruthy();
      expect(typeof ing.tasteMod).toBe('number');
      expect(typeof ing.textureMod).toBe('number');
      expect(typeof ing.blowPower).toBe('number');
      expect(Array.isArray(ing.tags)).toBe(true);
    }
  });

  it('ingredient IDs are unique', () => {
    const ids = INGREDIENT_MODELS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tasteMod values are in valid range (-1 to 5)', () => {
    for (const ing of INGREDIENT_MODELS) {
      expect(ing.tasteMod).toBeGreaterThanOrEqual(-1);
      expect(ing.tasteMod).toBeLessThanOrEqual(5);
    }
  });

  it('textureMod values are in valid range (0 to 5)', () => {
    for (const ing of INGREDIENT_MODELS) {
      expect(ing.textureMod).toBeGreaterThanOrEqual(0);
      expect(ing.textureMod).toBeLessThanOrEqual(5);
    }
  });

  it('blowPower values are in valid range (0 to 5)', () => {
    for (const ing of INGREDIENT_MODELS) {
      expect(ing.blowPower).toBeGreaterThanOrEqual(0);
      expect(ing.blowPower).toBeLessThanOrEqual(5);
    }
  });

  it('covers all 3 categories', () => {
    const categories = new Set(INGREDIENT_MODELS.map(i => i.category));
    expect(categories).toContain('food');
    expect(categories).toContain('weird');
    expect(categories).toContain('trash');
  });

  it('all paths start with /models/', () => {
    for (const ing of INGREDIENT_MODELS) {
      expect(ing.path).toMatch(/^\/models\//);
    }
  });
});

describe('Ingredients — getIngredientById', () => {
  it('returns the correct ingredient by ID', () => {
    const first = INGREDIENT_MODELS[0];
    const found = getIngredientById(first.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(first.id);
    expect(found!.name).toBe(first.name);
  });

  it('returns undefined for unknown ID', () => {
    expect(getIngredientById('nonexistent')).toBeUndefined();
  });
});
