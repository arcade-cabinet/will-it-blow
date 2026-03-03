/**
 * @module Ingredients
 * Defines the 25 ingredients available for sausage-making, along with their
 * gameplay stats, visual properties, and categories. This is the data layer
 * that drives ingredient selection, scoring (via SausagePhysics), and 3D
 * rendering (via Ingredient3D shape/color).
 */

/**
 * Describes the 3D mesh shape used to render an ingredient in the fridge.
 * The `base` determines the geometry primitive; `detail` adds a visual modifier
 * (e.g., 'wobbly' deforms the sphere, 'claws' adds appendages to elongated).
 */
export type IngredientShape =
  | {base: 'sphere'; detail?: 'wobbly'}
  | {base: 'box'; detail?: 'rounded'}
  | {base: 'cylinder'; detail?: 'flat'}
  | {base: 'elongated'; detail?: 'claws'}
  | {base: 'wedge'}
  | {base: 'cone'}
  | {base: 'small-sphere'}
  | {base: 'irregular'};

/**
 * A single ingredient with gameplay stats and visual properties.
 * Stats drive scoring in SausagePhysics; visual props drive 3D rendering.
 */
export interface Ingredient {
  /** Display name shown in the fridge UI and results screen */
  name: string;
  /** Emoji used in 2D overlay displays */
  emoji: string;
  /** Flavor category — used by IngredientMatcher for tag-based matching */
  category:
    | 'fast food'
    | 'canned'
    | 'fancy'
    | 'absurd'
    | 'sweet'
    | 'spicy'
    | 'comfort'
    | 'international';
  /** Flavor quality 0-5 (or -1 for repulsive). Higher = better taste score. */
  tasteMod: number;
  /** Texture quality 0-5. Higher = better mouthfeel. Affects 40% of taste rating. */
  textureMod: number;
  /** Probability 0-1 that the casing bursts. Water=0.9, Lobster=0.1. */
  burstRisk: number;
  /** Explosive power 0-5. Drives the "Blow Ruffalos" score. */
  blowPower: number;
  /** Hex color for the 3D ingredient mesh material */
  color: string;
  /** 3D shape descriptor used by Ingredient3D to select the mesh geometry */
  shape: IngredientShape;
  /** Optional path to a GLB model (relative to public/models/ingredients/). Falls back to procedural shape if absent. */
  glbPath?: string;
  /** Whether this ingredient works better as coil, link, or either */
  formAffinity: 'coil' | 'link' | 'neutral';
  /** How the ingredient decomposes when ground */
  decomposition: {
    /** Color of chunks when broken apart in the grinder */
    chunkColor: string;
    /** Size multiplier for chunks (1.0 = standard) */
    chunkScale: number;
    /** How many chunks the ingredient breaks into (4-12) */
    chunkCount: number;
    /** Color contribution to the ground meat blend */
    groundColor: string;
    /** Fat ratio (0-1) for ground meat texture appearance */
    fatRatio: number;
  };
}

/**
 * The full pool of 25 ingredients spanning 8 categories.
 * Each game session draws a random subset via {@link getRandomIngredientPool}.
 *
 * Category distribution: fast food (5), absurd (7), fancy (3), sweet (5),
 * spicy (2), comfort (2), canned (1), international (1).
 *
 * Design: "absurd" ingredients are intentional trap picks — they look
 * funny but have terrible stats (tasteMod 0, high burstRisk).
 */
export const INGREDIENTS: Ingredient[] = [
  {
    name: 'Big Mac',
    emoji: '🍔',
    category: 'fast food',
    tasteMod: 3,
    textureMod: 3,
    burstRisk: 0.2,
    blowPower: 2,
    color: '#D4A017',
    shape: {base: 'box', detail: 'rounded'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#D4A017',
      chunkScale: 1.0,
      chunkCount: 8,
      groundColor: '#B8860B',
      fatRatio: 0.6,
    },
  },
  {
    name: 'SpaghettiOs',
    emoji: '🍝',
    category: 'canned',
    tasteMod: 2,
    textureMod: 1,
    burstRisk: 0.5,
    blowPower: 4,
    color: '#E85D2C',
    shape: {base: 'sphere', detail: 'wobbly'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#E85D2C',
      chunkScale: 0.5,
      chunkCount: 10,
      groundColor: '#D4654A',
      fatRatio: 0.3,
    },
  },
  {
    name: 'Lobster',
    emoji: '🦞',
    category: 'fancy',
    tasteMod: 5,
    textureMod: 4,
    burstRisk: 0.1,
    blowPower: 1,
    color: '#C41E3A',
    shape: {base: 'elongated', detail: 'claws'},
    formAffinity: 'coil',
    decomposition: {
      chunkColor: '#C41E3A',
      chunkScale: 1.5,
      chunkCount: 6,
      groundColor: '#D4796B',
      fatRatio: 0.2,
    },
  },
  {
    name: 'Water',
    emoji: '💧',
    category: 'absurd',
    tasteMod: 0,
    textureMod: 0,
    burstRisk: 0.9,
    blowPower: 5,
    color: '#4FC3F7',
    shape: {base: 'sphere', detail: 'wobbly'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#4FC3F7',
      chunkScale: 0.3,
      chunkCount: 12,
      groundColor: '#A0C4E0',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Air',
    emoji: '💨',
    category: 'absurd',
    tasteMod: 0,
    textureMod: 0,
    burstRisk: 0.1,
    blowPower: 0,
    color: '#E0E0E0',
    shape: {base: 'sphere'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#E0E0E0',
      chunkScale: 0.2,
      chunkCount: 12,
      groundColor: '#D0D0D0',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Candy Cane',
    emoji: '🍬',
    category: 'sweet',
    tasteMod: 3,
    textureMod: 2,
    burstRisk: 0.3,
    blowPower: 2,
    color: '#FF1744',
    shape: {base: 'cone'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#FF1744',
      chunkScale: 0.8,
      chunkCount: 6,
      groundColor: '#E8A0A0',
      fatRatio: 0.1,
    },
  },
  {
    name: 'Carolina Reaper',
    emoji: '🌶️',
    category: 'spicy',
    tasteMod: 1,
    textureMod: 2,
    burstRisk: 0.6,
    blowPower: 3,
    color: '#B71C1C',
    shape: {base: 'small-sphere'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#B71C1C',
      chunkScale: 0.6,
      chunkCount: 8,
      groundColor: '#C43030',
      fatRatio: 0.1,
    },
  },
  {
    name: 'Chicken Soup',
    emoji: '🍲',
    category: 'comfort',
    tasteMod: 4,
    textureMod: 3,
    burstRisk: 0.4,
    blowPower: 3,
    color: '#FFC107',
    shape: {base: 'sphere', detail: 'wobbly'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#FFC107',
      chunkScale: 0.7,
      chunkCount: 10,
      groundColor: '#D4A860',
      fatRatio: 0.4,
    },
  },
  {
    name: "Elmer's Glue",
    emoji: '🧴',
    category: 'absurd',
    tasteMod: 0,
    textureMod: 1,
    burstRisk: 0.7,
    blowPower: 1,
    color: '#FAFAFA',
    shape: {base: 'cylinder'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#FAFAFA',
      chunkScale: 0.5,
      chunkCount: 10,
      groundColor: '#E8E8E8',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Beef Wellington',
    emoji: '🥩',
    category: 'fancy',
    tasteMod: 5,
    textureMod: 5,
    burstRisk: 0.15,
    blowPower: 2,
    color: '#8D6E63',
    shape: {base: 'box', detail: 'rounded'},
    formAffinity: 'coil',
    decomposition: {
      chunkColor: '#8D6E63',
      chunkScale: 1.2,
      chunkCount: 6,
      groundColor: '#9C7A6E',
      fatRatio: 0.5,
    },
  },
  {
    name: 'Habanero',
    emoji: '🫑',
    category: 'spicy',
    tasteMod: 1,
    textureMod: 2,
    burstRisk: 0.4,
    blowPower: 3,
    color: '#FF6D00',
    shape: {base: 'small-sphere'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#FF6D00',
      chunkScale: 0.5,
      chunkCount: 8,
      groundColor: '#D4800A',
      fatRatio: 0.1,
    },
  },
  {
    name: 'Jawbreaker',
    emoji: '🔴',
    category: 'absurd',
    tasteMod: 1,
    textureMod: 0,
    burstRisk: 0.5,
    blowPower: 1,
    color: '#E040FB',
    shape: {base: 'small-sphere'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#E040FB',
      chunkScale: 0.4,
      chunkCount: 4,
      groundColor: '#C070D0',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Pad Thai',
    emoji: '🍜',
    category: 'international',
    tasteMod: 4,
    textureMod: 3,
    burstRisk: 0.3,
    blowPower: 3,
    color: '#FF8A65',
    shape: {base: 'sphere', detail: 'wobbly'},
    formAffinity: 'coil',
    decomposition: {
      chunkColor: '#FF8A65',
      chunkScale: 0.8,
      chunkCount: 8,
      groundColor: '#D4946A',
      fatRatio: 0.3,
    },
  },
  {
    name: 'Taco Bell Crunchwrap',
    emoji: '🌮',
    category: 'fast food',
    tasteMod: 3,
    textureMod: 2,
    burstRisk: 0.3,
    blowPower: 2,
    color: '#7B1FA2',
    shape: {base: 'cylinder', detail: 'flat'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#7B1FA2',
      chunkScale: 1.0,
      chunkCount: 8,
      groundColor: '#8A5090',
      fatRatio: 0.5,
    },
  },
  {
    name: 'Cotton Candy',
    emoji: '🍭',
    category: 'sweet',
    tasteMod: 2,
    textureMod: 1,
    burstRisk: 0.6,
    blowPower: 4,
    color: '#F48FB1',
    shape: {base: 'sphere'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#F48FB1',
      chunkScale: 0.3,
      chunkCount: 12,
      groundColor: '#E8B0C0',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Vanilla Cake',
    emoji: '🎂',
    category: 'sweet',
    tasteMod: 4,
    textureMod: 3,
    burstRisk: 0.25,
    blowPower: 2,
    color: '#FFF9C4',
    shape: {base: 'cylinder'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#FFF9C4',
      chunkScale: 0.8,
      chunkCount: 8,
      groundColor: '#E8D8A0',
      fatRatio: 0.3,
    },
  },
  {
    name: 'Pizza',
    emoji: '🍕',
    category: 'fast food',
    tasteMod: 4,
    textureMod: 3,
    burstRisk: 0.3,
    blowPower: 3,
    color: '#F57C00',
    shape: {base: 'cylinder', detail: 'flat'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#F57C00',
      chunkScale: 1.0,
      chunkCount: 8,
      groundColor: '#D48030',
      fatRatio: 0.5,
    },
  },
  {
    name: 'Dirt',
    emoji: '🟤',
    category: 'absurd',
    tasteMod: 0,
    textureMod: 1,
    burstRisk: 0.2,
    blowPower: 1,
    color: '#5D4037',
    shape: {base: 'irregular'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#5D4037',
      chunkScale: 2.0,
      chunkCount: 4,
      groundColor: '#555555',
      fatRatio: 0.1,
    },
  },
  {
    name: 'Rice Crispy Treat',
    emoji: '🍚',
    category: 'sweet',
    tasteMod: 5,
    textureMod: 4,
    burstRisk: 0.15,
    blowPower: 2,
    color: '#FFE082',
    shape: {base: 'box'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#FFE082',
      chunkScale: 0.6,
      chunkCount: 10,
      groundColor: '#D8C870',
      fatRatio: 0.2,
    },
  },
  {
    name: 'Sushi Party Tray',
    emoji: '🍣',
    category: 'fancy',
    tasteMod: 5,
    textureMod: 4,
    burstRisk: 0.2,
    blowPower: 2,
    color: '#EF5350',
    shape: {base: 'box', detail: 'rounded'},
    formAffinity: 'coil',
    decomposition: {
      chunkColor: '#EF5350',
      chunkScale: 1.0,
      chunkCount: 8,
      groundColor: '#D06060',
      fatRatio: 0.3,
    },
  },
  {
    name: 'Hot Pocket',
    emoji: '📦',
    category: 'fast food',
    tasteMod: 2,
    textureMod: 2,
    burstRisk: 0.5,
    blowPower: 3,
    color: '#1565C0',
    shape: {base: 'box', detail: 'rounded'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#1565C0',
      chunkScale: 1.0,
      chunkCount: 6,
      groundColor: '#6080B0',
      fatRatio: 0.5,
    },
  },
  {
    name: 'Menthol Cough Drop',
    emoji: '💊',
    category: 'absurd',
    tasteMod: -1,
    textureMod: 1,
    burstRisk: 0.3,
    blowPower: 2,
    color: '#00BFA5',
    shape: {base: 'small-sphere'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#00BFA5',
      chunkScale: 0.3,
      chunkCount: 6,
      groundColor: '#60A090',
      fatRatio: 0.0,
    },
  },
  {
    name: 'Mac & Cheese',
    emoji: '🧀',
    category: 'comfort',
    tasteMod: 4,
    textureMod: 2,
    burstRisk: 0.4,
    blowPower: 3,
    color: '#FFCA28',
    shape: {base: 'sphere', detail: 'wobbly'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#FFCA28',
      chunkScale: 0.7,
      chunkCount: 10,
      groundColor: '#D4A830',
      fatRatio: 0.5,
    },
  },
  {
    name: 'Corn Dog',
    emoji: '🌽',
    category: 'fast food',
    tasteMod: 3,
    textureMod: 3,
    burstRisk: 0.2,
    blowPower: 2,
    color: '#F9A825',
    shape: {base: 'elongated'},
    formAffinity: 'coil',
    decomposition: {
      chunkColor: '#F9A825',
      chunkScale: 1.2,
      chunkCount: 6,
      groundColor: '#C89020',
      fatRatio: 0.4,
    },
  },
  {
    name: 'A Shoe',
    emoji: '👟',
    category: 'absurd',
    tasteMod: 0,
    textureMod: 0,
    burstRisk: 0.8,
    blowPower: 1,
    color: '#616161',
    shape: {base: 'irregular'},
    formAffinity: 'neutral',
    decomposition: {
      chunkColor: '#616161',
      chunkScale: 2.0,
      chunkCount: 4,
      groundColor: '#555555',
      fatRatio: 0.1,
    },
  },
  {
    name: 'Gummy Bears',
    emoji: '🐻',
    category: 'sweet',
    tasteMod: 3,
    textureMod: 2,
    burstRisk: 0.5,
    blowPower: 3,
    color: '#E53935',
    shape: {base: 'small-sphere'},
    formAffinity: 'link',
    decomposition: {
      chunkColor: '#E53935',
      chunkScale: 0.4,
      chunkCount: 10,
      groundColor: '#D06060',
      fatRatio: 0.1,
    },
  },
];

/** Fisher-Yates shuffle — returns a new shuffled copy, does not mutate input. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draws a random subset of ingredients from the full INGREDIENTS pool.
 * Used at the start of each game to populate the fridge with a fresh selection.
 *
 * @param count - Number of ingredients to include (default 12, the fridge capacity)
 * @returns A shuffled subset of INGREDIENTS with `count` items
 */
export function getRandomIngredientPool(count = 12): Ingredient[] {
  const shuffled = shuffle(INGREDIENTS);
  return shuffled.slice(0, count);
}

/** Hex color associated with each ingredient category, used for UI badges and labels. */
export const CATEGORY_COLORS: Record<string, string> = {
  'fast food': '#FF6B35',
  canned: '#E85D2C',
  fancy: '#FFD700',
  absurd: '#E040FB',
  sweet: '#F48FB1',
  spicy: '#FF1744',
  comfort: '#FFC107',
  international: '#4FC3F7',
};
