/**
 * @module IngredientComposition
 * The Zoombinis-in-Hell data pillar.
 *
 * Every ingredient in Mr. Sausage's basement fridge is a creature with
 * queryable attributes. The deduction loop is built on top of this file:
 *
 *   1. **Traits** are boolean-ish tags that describe what an ingredient
 *      FEELS and LOOKS like from the outside — squishy, pointy, sweet,
 *      meaty, cursed, etc. Mr. Sausage generates his hunger clues by
 *      sampling N traits from the intersection of "still in the fridge"
 *      ingredients, where N also telegraphs the required ingredient
 *      count for the round.
 *
 *   2. **Composition** is the mechanical profile of what the ingredient
 *      BECOMES after the grinder — a chunk-pile, a paste, a powder, a
 *      shard-cloud, or a liquid. Composition drives every downstream
 *      visual: grinder particle count + colour, stuffer casing inner
 *      tint (visible through the translucent casing), sausage link
 *      rendering, stove grease / sizzle / burst behaviour, and the
 *      cereal-box splatter at the Will-It-Blow moment.
 *
 * The game tells its whole story through this data structure. If the
 * player can't read the composition through the translucent casing,
 * the deduction loop is broken. If the clue generator can't query the
 * traits, there's no puzzle. Keep this file tight.
 */
import rawIngredients from '../config/ingredients.json';

// ─── Traits ──────────────────────────────────────────────────────────

/**
 * Flat trait vocabulary — deliberately overlapping so the clue
 * generator can pick 1..4 traits from a target ingredient and have
 * MULTIPLE valid matches in the fridge. Narrower vocabularies make
 * the puzzle trivial ("pick the thing whose exact name I said");
 * wider ones make it impossible. This set is tuned for the existing
 * 16 food + 5 weird + 4 trash ingredient roster.
 *
 * Categories (non-exclusive — an ingredient may carry traits from
 * several groups):
 *
 *   TEXTURE  — how it feels in the mouth / to the touch
 *   TASTE    — dominant flavour axis
 *   STATE    — physical state before processing
 *   ORIGIN   — what kind of THING it is, existentially
 *   HORROR   — Mr. Sausage's cursed-category taxonomy
 */
export type IngredientTrait =
  // Texture
  | 'squishy'
  | 'pointy'
  | 'chunky'
  | 'smooth'
  | 'fibrous'
  | 'brittle'
  | 'slimy'
  | 'crunchy'
  | 'soft'
  | 'hard'
  // Taste
  | 'sweet'
  | 'sour'
  | 'salty'
  | 'bitter'
  | 'umami'
  | 'metallic'
  | 'fatty'
  | 'spicy'
  | 'bland'
  // State
  | 'wet'
  | 'dry'
  | 'shiny'
  | 'dull'
  | 'bright'
  | 'pale'
  | 'warm'
  | 'cold'
  | 'raw'
  | 'cooked'
  | 'frozen'
  // Origin / existential
  | 'meat'
  | 'alive'
  | 'dead'
  | 'once-alive'
  | 'never-alive'
  | 'processed'
  | 'natural'
  | 'plant'
  | 'liquid-form'
  // Horror / Mr. Sausage's vocabulary
  | 'wholesome'
  | 'unsettling'
  | 'cursed'
  | 'absurd';

/** Convenience set so `.has()` lookups stay O(1) when filtering. */
export type TraitSet = ReadonlySet<IngredientTrait>;

// ─── Composition ─────────────────────────────────────────────────────

/**
 * After the grinder chews through an ingredient, what does it become?
 * The five modes cover the decomposition space from "still kind of a
 * thing" to "a cloud of dust".
 *
 *   chunks  — lumpy, cohesive, reads as MEAT in the casing
 *   paste   — smooth, uniform, reads as WET SOFT THING
 *   powder  — dry, fine, reads as DESSICATED
 *   shards  — sharp, particulate, reads as GLASS/BONE/METAL
 *   liquid  — flows, pools, reads as RUNNY
 */
export type DecompositionType = 'chunks' | 'paste' | 'powder' | 'shards' | 'liquid';

/**
 * The composition profile drives all downstream rendering. Every
 * field is normalised to [0, 1] where sensible — this keeps blends
 * (see `compositeMix` below) trivial to compute.
 */
export interface CompositionProfile {
  /** How the grinder decomposes this ingredient. */
  readonly decomposition: DecompositionType;
  /** Dominant colour as hex (e.g., `#c85a5a`). Drives casing tint, particle tint, splatter tint. */
  readonly color: string;
  /** 0-1. How shiny / wet-looking. Drives casing transmission + particle emissive. */
  readonly shine: number;
  /** 0-1. Post-grinder mass per unit volume. Drives grinder particle count. */
  readonly density: number;
  /** 0-1. How much liquid comes off in the pan. Drives stove grease pool + sizzle. */
  readonly moisture: number;
  /** 0-1. Fat content. Drives sizzle loudness + pan burst risk. */
  readonly fat: number;
  /** 0-1. Size of the individual particles/chunks when ground. */
  readonly particleScale: number;
}

// ─── Ingredient definition ───────────────────────────────────────────

/**
 * The authoritative ingredient shape. Combines the legacy game-balance
 * fields (tasteMod / textureMod / blowPower) with the new trait-query
 * axis (`traits`) and the composition-pipeline axis (`composition`).
 *
 * Legacy fields stay around because the scoring code still reads them.
 * New callers should prefer the trait + composition paths.
 */
export interface IngredientDef {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly node?: string;
  readonly scale: number;
  readonly category: 'food' | 'weird' | 'trash';
  readonly tasteMod: number;
  readonly textureMod: number;
  readonly blowPower: number;
  /** Flat trait vocabulary entries. Mr. Sausage's clue generator queries this. */
  readonly traits: readonly IngredientTrait[];
  /** Composition profile — drives every visual downstream of the grinder. */
  readonly composition: CompositionProfile;
  /** Free-form string tags left over from the legacy schema. Kept for back-compat. */
  readonly tags?: readonly string[];
}

interface IngredientsJsonShape {
  readonly ingredients: readonly IngredientDef[];
  readonly tagDerivation?: unknown;
}

/** The parsed, typed ingredient roster. Use this everywhere that was `INGREDIENT_MODELS`. */
export const INGREDIENTS: readonly IngredientDef[] = (rawIngredients as IngredientsJsonShape)
  .ingredients;

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Index an ingredient's traits as a Set for fast `.has()` checks.
 * Memoised per-ingredient so the same Set instance is returned on
 * repeated calls — callers can use reference equality to detect
 * "same ingredient" without string comparison.
 */
const traitSetCache = new WeakMap<IngredientDef, TraitSet>();
export function traitSetOf(ingredient: IngredientDef): TraitSet {
  let cached = traitSetCache.get(ingredient);
  if (!cached) {
    cached = new Set(ingredient.traits);
    traitSetCache.set(ingredient, cached);
  }
  return cached;
}

/**
 * Does `ingredient` satisfy all `requiredTraits`? An ingredient may
 * carry EXTRA traits beyond the requirement — the clue is only a
 * lower bound, not an exact match.
 *
 * Used by the deduction loop: for each clue trait, at least one of
 * the player's chosen ingredients must have that trait. Pass this
 * helper a single candidate ingredient; the outer loop in
 * `ClueGenerator.matchSelection` handles the "at least one of each"
 * quantifier across the selection.
 */
export function hasAllTraits(
  ingredient: IngredientDef,
  requiredTraits: readonly IngredientTrait[],
): boolean {
  const set = traitSetOf(ingredient);
  for (const t of requiredTraits) {
    if (!set.has(t)) return false;
  }
  return true;
}

/**
 * Does `ingredient` satisfy ANY of `requiredTraits`? Used when the
 * clue generator wants a one-of-N match (e.g., "something meaty" is
 * satisfied by any ingredient carrying the `meat` trait).
 */
export function hasAnyTrait(
  ingredient: IngredientDef,
  requiredTraits: readonly IngredientTrait[],
): boolean {
  const set = traitSetOf(ingredient);
  for (const t of requiredTraits) {
    if (set.has(t)) return true;
  }
  return false;
}

/**
 * Does a SELECTION of ingredients satisfy a clue's trait list? For
 * each required trait, at least one ingredient in the selection must
 * carry it. Extra ingredients and extra traits are allowed.
 *
 * This is the core match predicate for the deduction loop. Mr.
 * Sausage's disgust accumulates on `false`; his satisfaction builds
 * on `true`.
 */
export function selectionSatisfiesClue(
  selection: readonly IngredientDef[],
  clueTraits: readonly IngredientTrait[],
): boolean {
  for (const required of clueTraits) {
    let found = false;
    for (const ing of selection) {
      if (traitSetOf(ing).has(required)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

// ─── Composition blending ────────────────────────────────────────────

/** Parse a `#rrggbb` hex colour into `[r, g, b]` floats in `[0, 1]`. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/** Convert `[r, g, b]` floats back to `#rrggbb`. */
function rgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255)));
  const toHex = (c: number) => to255(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * The result of mixing N ingredient compositions together. Unlike a
 * single composition, a mix has MULTIPLE decomposition types present
 * simultaneously — you can have chunks AND powder AND liquid in the
 * same casing. The renderer uses `decompositionWeights` to decide how
 * many of each kind of particle to spawn.
 */
export interface CompositeMix {
  /** Volume-weighted average colour of the mix. */
  readonly color: string;
  /** Volume-weighted average shine. */
  readonly shine: number;
  /** Volume-weighted average density. */
  readonly density: number;
  /** Volume-weighted average moisture. */
  readonly moisture: number;
  /** Volume-weighted average fat. */
  readonly fat: number;
  /** Volume-weighted average particle scale. */
  readonly particleScale: number;
  /**
   * Per-decomposition-type weight in `[0, 1]`, summing to 1. Drives
   * how many particles of each kind the grinder + splatter system
   * should spawn. E.g., `{chunks: 0.6, paste: 0.4}` means 60% of the
   * particle budget spawns as chunks, 40% as paste splats.
   */
  readonly decompositionWeights: Readonly<Record<DecompositionType, number>>;
  /** Which ingredients went into the mix, in selection order. */
  readonly sources: readonly IngredientDef[];
}

/**
 * Blend the compositions of a selection of ingredients into a single
 * composite. Every ingredient is weighted equally — the player mixes
 * whole ingredients, not partial ones. If you need unequal weights
 * later (e.g., one steak + two bananas), thread a `weights` arg.
 */
export function compositeMix(selection: readonly IngredientDef[]): CompositeMix {
  if (selection.length === 0) {
    // Empty selection → sensible null-mix the caller can still render.
    return {
      color: '#444444',
      shine: 0,
      density: 0,
      moisture: 0,
      fat: 0,
      particleScale: 0.5,
      decompositionWeights: {chunks: 0, paste: 0, powder: 0, shards: 0, liquid: 0},
      sources: [],
    };
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let shine = 0;
  let density = 0;
  let moisture = 0;
  let fat = 0;
  let particleScale = 0;
  const weights: Record<DecompositionType, number> = {
    chunks: 0,
    paste: 0,
    powder: 0,
    shards: 0,
    liquid: 0,
  };

  for (const ing of selection) {
    const [ir, ig, ib] = hexToRgb(ing.composition.color);
    r += ir;
    g += ig;
    b += ib;
    shine += ing.composition.shine;
    density += ing.composition.density;
    moisture += ing.composition.moisture;
    fat += ing.composition.fat;
    particleScale += ing.composition.particleScale;
    weights[ing.composition.decomposition] += 1;
  }

  const n = selection.length;
  for (const k of Object.keys(weights) as DecompositionType[]) {
    weights[k] /= n;
  }

  return {
    color: rgbToHex(r / n, g / n, b / n),
    shine: shine / n,
    density: density / n,
    moisture: moisture / n,
    fat: fat / n,
    particleScale: particleScale / n,
    decompositionWeights: weights,
    sources: selection,
  };
}

/**
 * Sample `count` decomposition types from a mix, respecting the
 * per-type weights. Useful for particle spawners: "I need 300
 * particles, give me the right proportion of chunks / paste / powder
 * / shards / liquid based on the composite."
 *
 * Returns a flat array of decomposition types of length `count`. The
 * caller maps each entry to its particle geometry + material.
 */
export function sampleDecomposition(
  mix: CompositeMix,
  count: number,
): readonly DecompositionType[] {
  if (count <= 0) return [];
  const types: DecompositionType[] = ['chunks', 'paste', 'powder', 'shards', 'liquid'];
  // Walk the weights and round to integer counts. Any rounding error
  // gets dumped onto the dominant bucket so the total is exact.
  const result: DecompositionType[] = [];
  let assigned = 0;
  let dominant: DecompositionType = types[0];
  let dominantWeight = -1;
  for (const t of types) {
    const w = mix.decompositionWeights[t];
    if (w > dominantWeight) {
      dominantWeight = w;
      dominant = t;
    }
    const share = Math.floor(w * count);
    for (let i = 0; i < share; i += 1) {
      result.push(t);
    }
    assigned += share;
  }
  while (assigned < count) {
    result.push(dominant);
    assigned += 1;
  }
  return result;
}

// ─── Re-exports for callers that only care about the data roster ────

/**
 * Legacy alias. Old imports used `INGREDIENT_MODELS` from
 * `src/engine/Ingredients.ts`. New code should import `INGREDIENTS`
 * from this module, but we re-export the old name so the migration
 * can be done incrementally.
 */
export {INGREDIENTS as INGREDIENT_MODELS};
