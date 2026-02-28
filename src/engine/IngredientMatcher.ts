import type {Ingredient} from './Ingredients';

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

const MEAT_KEYWORDS = ['lobster', 'beef', 'chicken', 'mac', 'corn dog', 'hot pocket', 'taco'];

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

export function matchesCriteria(ingredient: Ingredient, criteria: IngredientCriteria): boolean {
  const tags = getIngredientTags(ingredient);
  return criteria.tags.every(tag => tags.includes(tag as IngredientTag));
}

export function filterMatchingIngredients(
  ingredients: Ingredient[],
  criteria: IngredientCriteria,
): Ingredient[] {
  return ingredients.filter(ingredient => matchesCriteria(ingredient, criteria));
}
