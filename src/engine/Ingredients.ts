/** Simple asset path builder — on native, paths are resolved via require() at the component level. */
function getAssetUrl(dir: string, file: string): string {
  return `/${dir}/${file}`;
}

export type IngredientCategory = 'food' | 'weird' | 'trash';

export interface IngredientDef {
  id: string;
  name: string;
  path: string;
  node?: string;
  scale: number;
  category: IngredientCategory;
  tasteMod: number; // 0 to 5
  textureMod: number; // 0 to 5
  blowPower: number; // 0 to 5
  tags: string[];
}

// Our new data-driven roster based on the GLB models we actually loaded into the toy chest
export const INGREDIENT_MODELS: IngredientDef[] = [
  // Normal Food (Playwright cache)
  {
    id: 'banana',
    name: 'Banana',
    path: getAssetUrl('models/ingredients', 'banana.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 4,
    textureMod: 2,
    blowPower: 1,
    tags: ['sweet', 'smooth'],
  },
  {
    id: 'burger',
    name: 'Burger',
    path: getAssetUrl('models/ingredients', 'burger.glb'),
    scale: 1.2,
    category: 'food',
    tasteMod: 5,
    textureMod: 3,
    blowPower: 2,
    tags: ['savory', 'meat', 'fast-food'],
  },
  {
    id: 'cake',
    name: 'Cake',
    path: getAssetUrl('models/ingredients', 'cake.glb'),
    scale: 1.0,
    category: 'food',
    tasteMod: 5,
    textureMod: 1,
    blowPower: 1,
    tags: ['sweet', 'comfort'],
  },
  {
    id: 'fish',
    name: 'Raw Fish',
    path: getAssetUrl('models/ingredients', 'fish.glb'),
    scale: 1.8,
    category: 'food',
    tasteMod: 3,
    textureMod: 4,
    blowPower: 2,
    tags: ['savory', 'meat'],
  },
  {
    id: 'pepper',
    name: 'Hot Pepper',
    path: getAssetUrl('models/ingredients', 'pepper_red.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 2,
    textureMod: 2,
    blowPower: 4,
    tags: ['spicy'],
  },
  {
    id: 'pizza',
    name: 'Pizza Slice',
    path: getAssetUrl('models/ingredients', 'pizza_slice.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 4,
    textureMod: 3,
    blowPower: 2,
    tags: ['savory', 'fast-food', 'comfort'],
  },
  {
    id: 'steak',
    name: 'Raw Steak',
    path: getAssetUrl('models/ingredients', 'steak.glb'),
    scale: 1.2,
    category: 'food',
    tasteMod: 5,
    textureMod: 4,
    blowPower: 1,
    tags: ['savory', 'meat', 'fancy'],
  },

  // Normal Food (3DLowPoly extracts)
  {
    id: 'bacon',
    name: 'Bacon',
    path: getAssetUrl('models/ingredients', 'bacon.glb'),
    scale: 2.0,
    category: 'food',
    tasteMod: 5,
    textureMod: 3,
    blowPower: 2,
    tags: ['savory', 'meat', 'comfort'],
  },
  {
    id: 'ketchup',
    name: 'Ketchup',
    path: getAssetUrl('models/ingredients', 'bottle-ketchup.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 3,
    textureMod: 1,
    blowPower: 3,
    tags: ['sweet', 'smooth'],
  },
  {
    id: 'bread',
    name: 'Bread',
    path: getAssetUrl('models/ingredients', 'bread.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 2,
    textureMod: 2,
    blowPower: 1,
    tags: ['savory', 'comfort'],
  },
  {
    id: 'apple',
    name: 'Apple',
    path: getAssetUrl('models/ingredients', 'apple.glb'),
    scale: 1.5,
    category: 'food',
    tasteMod: 3,
    textureMod: 3,
    blowPower: 1,
    tags: ['sweet', 'chunky'],
  },

  // The "Weird" Stuff
  {
    id: 'worm',
    name: 'Giant Worm',
    path: getAssetUrl('models/ingredients', 'worm.glb'),
    scale: 2.0,
    category: 'weird',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 3,
    tags: ['meat', 'absurd', 'chunky'],
  },
  {
    id: 'arcade',
    name: 'Mini Arcade',
    path: getAssetUrl('models/ingredients', 'arcade-machine.glb'),
    scale: 0.2,
    category: 'weird',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 5,
    tags: ['absurd', 'chunky'],
  },
  {
    id: 'register',
    name: 'Cash Register',
    path: getAssetUrl('models/ingredients', 'cash-register.glb'),
    scale: 0.4,
    category: 'weird',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 5,
    tags: ['absurd', 'chunky'],
  },
  {
    id: 'vending',
    name: 'Vending Machine',
    path: getAssetUrl('models/ingredients', 'vending-machine.glb'),
    scale: 0.2,
    category: 'weird',
    tasteMod: 2,
    textureMod: 5,
    blowPower: 4,
    tags: ['absurd', 'sweet', 'chunky'],
  },
  {
    id: 'bottle',
    name: 'Glass Bottle',
    path: getAssetUrl('models/ingredients', 'bottle-large.glb'),
    scale: 1.0,
    category: 'weird',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 4,
    tags: ['absurd', 'chunky'],
  },

  // Trash & Horror (misc.glb nodes)
  {
    id: 'radio',
    name: 'Old Radio',
    path: getAssetUrl('models', 'misc.glb'),
    node: 'Radio',
    scale: 1.0,
    category: 'trash',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 4,
    tags: ['absurd', 'chunky'],
  },
  {
    id: 'meds',
    name: 'Mystery Pills',
    path: getAssetUrl('models', 'misc.glb'),
    node: 'Meds',
    scale: 1.5,
    category: 'trash',
    tasteMod: -1,
    textureMod: 2,
    blowPower: 3,
    tags: ['absurd'],
  },
  {
    id: 'tape',
    name: 'Duct Tape',
    path: getAssetUrl('models', 'misc.glb'),
    node: 'Tape',
    scale: 1.5,
    category: 'trash',
    tasteMod: 0,
    textureMod: 4,
    blowPower: 2,
    tags: ['absurd', 'chunky'],
  },
  {
    id: 'ps1',
    name: 'Retro Console',
    path: getAssetUrl('models', 'misc.glb'),
    node: 'PS1',
    scale: 0.5,
    category: 'trash',
    tasteMod: 0,
    textureMod: 5,
    blowPower: 5,
    tags: ['absurd', 'chunky'],
  },
];

export function getIngredientById(id: string): IngredientDef | undefined {
  return INGREDIENT_MODELS.find(i => i.id === id);
}
