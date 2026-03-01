/**
 * @module IngredientMatcher
 * Tag-based matching system for the ingredient selection challenge.
 * Mr. Sausage demands ingredients with specific tags (e.g., "sweet", "meat").
 * This module derives tags from ingredient properties and checks whether
 * ingredients satisfy a given criteria — bridging the gap between the
 * Ingredient data model and the challenge variant's requirements.
 */

import type {Ingredient} from './Ingredients';

/**
 * Semantic tags derived from an ingredient's category and stats.
 * Tags are not stored on ingredients directly — they are computed
 * by {@link getIngredientTags} so the tag logic stays centralized here.
 */
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

/**
 * Criteria that an ingredient must satisfy to count as a "correct" pick.
 * All tags must match (AND logic) for the ingredient to qualify.
 */
export interface IngredientCriteria {
  /** Tags that the ingredient must have (all must match) */
  tags: string[];
  /** Human-readable description for UI display (e.g., "sweet", "meat") */
  description?: string;
}

/**
 * Maps ingredient categories to their inherent tags.
 * Some categories grant multiple tags (e.g., 'comfort' implies both 'comfort' and 'savory').
 */
const CATEGORY_TAG_MAP: Record<string, IngredientTag[]> = {
  'fast food': ['fast-food', 'savory'],
  canned: ['savory'],
  fancy: ['fancy'],
  absurd: ['absurd'],
  sweet: ['sweet'],
  spicy: ['spicy'],
  comfort: ['comfort', 'savory'],
  international: ['international', 'savory'],
};

/** Keywords in ingredient names that indicate the 'meat' tag (case-insensitive match). */
const MEAT_KEYWORDS = ['lobster', 'beef', 'chicken', 'mac', 'corn dog', 'hot pocket', 'taco'];

/**
 * Derives all applicable tags for an ingredient by combining three sources:
 * 1. **Category-based** — looked up from CATEGORY_TAG_MAP
 * 2. **Stat-based** — tasteMod >= 4 adds 'fancy', textureMod >= 3 adds 'chunky',
 *    textureMod <= 1 adds 'smooth'
 * 3. **Name-based** — keyword match against MEAT_KEYWORDS adds 'meat'
 *
 * @param ingredient - The ingredient to tag
 * @returns Deduplicated array of tags (order not guaranteed)
 *
 * @example
 * getIngredientTags(lobster) // ['fancy', 'chunky', 'meat']
 * getIngredientTags(water)   // ['absurd', 'smooth']
 */
export function getIngredientTags(ingredient: Ingredient): IngredientTag[] {
  const tagSet = new Set<IngredientTag>();

  // Category-based tags
  const categoryTags = CATEGORY_TAG_MAP[ingredient.category];
  if (categoryTags) {
    for (const tag of categoryTags) {
      tagSet.add(tag);
    }
  }

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

  // Meat detection by name
  const lowerName = ingredient.name.toLowerCase();
  for (const keyword of MEAT_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      tagSet.add('meat');
      break;
    }
  }

  return Array.from(tagSet);
}

/**
 * Tests whether a single ingredient satisfies the given criteria.
 * All tags in the criteria must be present on the ingredient (AND logic).
 *
 * @param ingredient - The ingredient to test
 * @param criteria - The tag requirements to check against
 * @returns `true` if the ingredient has every tag in the criteria
 */
export function matchesCriteria(ingredient: Ingredient, criteria: IngredientCriteria): boolean {
  const tags = getIngredientTags(ingredient);
  return criteria.tags.every(tag => tags.includes(tag as IngredientTag));
}

/**
 * Filters a list of ingredients down to only those matching the criteria.
 * Used during fridge pool generation to identify which indices are "correct"
 * picks for the current variant's demand.
 *
 * @param ingredients - Full pool of ingredients to filter
 * @param criteria - The tag requirements from the current challenge variant
 * @returns Subset of ingredients that satisfy all criteria tags
 */
export function filterMatchingIngredients(
  ingredients: Ingredient[],
  criteria: IngredientCriteria,
): Ingredient[] {
  return ingredients.filter(ingredient => matchesCriteria(ingredient, criteria));
}
