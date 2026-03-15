/**
 * @module IngredientMatcher
 * Matches ingredients against tag-based criteria for the ingredient selection
 * challenge. Derives tags from both explicit definitions and stat thresholds.
 */
import type {IngredientDef} from './Ingredients';

/** All recognized ingredient tags, including stat-derived ones. */
export type IngredientTag =
  | 'sweet'
  | 'savory'
  | 'spicy'
  | 'meat'
  | 'fancy'
  | 'comfort'
  | 'absurd'
  | 'fast-food'
  | 'international'
  | 'smooth'
  | 'chunky';

export interface IngredientCriteria {
  tags: string[];
  description?: string;
}

/**
 * Derives all applicable tags for an ingredient based on its intrinsic tags and stats.
 * Adds stat-derived tags: 'fancy' (tasteMod >= 4), 'chunky' (textureMod >= 3),
 * 'smooth' (textureMod <= 1), 'savory' (food + tasteMod >= 3), 'absurd' (weird/trash).
 * @param ingredient - The ingredient definition to tag.
 * @returns Deduplicated array of all applicable tags.
 */
export function getIngredientTags(ingredient: IngredientDef): IngredientTag[] {
  const tagSet = new Set<IngredientTag>(ingredient.tags as IngredientTag[]);

  // Stat-based tags
  if (ingredient.tasteMod >= 4) {
    tagSet.add('fancy');
  }
  if (ingredient.textureMod >= 3) {
    tagSet.add('chunky');
  }
  if (ingredient.textureMod <= 1) {
    tagSet.add('smooth');
  }

  // Auto-tagging based on category if not already present
  if (ingredient.category === 'food' && ingredient.tasteMod >= 3 && !tagSet.has('sweet')) {
    tagSet.add('savory');
  }
  if (ingredient.category === 'weird' || ingredient.category === 'trash') {
    tagSet.add('absurd');
  }

  return Array.from(tagSet);
}

/**
 * Tests whether an ingredient satisfies all tags in the given criteria.
 * @param ingredient - The ingredient to check.
 * @param criteria - Tag-based criteria (all tags must match).
 * @returns `true` if the ingredient has every required tag.
 */
export function matchesCriteria(ingredient: IngredientDef, criteria: IngredientCriteria): boolean {
  const tags = getIngredientTags(ingredient);
  return criteria.tags.every(tag => tags.includes(tag as IngredientTag));
}

/**
 * Filters a list of ingredients to only those matching all criteria tags.
 * @param ingredients - The full ingredient pool to filter.
 * @param criteria - Tag-based criteria that each result must satisfy.
 * @returns Subset of ingredients where every criteria tag is present.
 */
export function filterMatchingIngredients(
  ingredients: IngredientDef[],
  criteria: IngredientCriteria,
): IngredientDef[] {
  return ingredients.filter(ingredient => matchesCriteria(ingredient, criteria));
}
