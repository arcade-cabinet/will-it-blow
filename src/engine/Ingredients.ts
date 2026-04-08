/**
 * @module engine/Ingredients
 * Back-compat re-export layer. The authoritative ingredient roster now
 * lives in `IngredientComposition.ts`, which reads directly from
 * `config/ingredients.json` and carries the full trait + composition
 * profile needed by the Zoombinis-in-Hell deduction loop.
 *
 * This module keeps its old export names so existing callers
 * (`RoundManager`, `IngredientMatcher`, `DemandScoring`,
 * `PhysicsFreezerChest`, tests) don't all need to update at once.
 * New code should prefer importing from `IngredientComposition`
 * directly.
 *
 * The old hand-maintained `INGREDIENT_MODELS` array — which was a
 * duplicate of `ingredients.json` and a synchronisation hazard — is
 * DELETED. If you came here looking for it, the data you want is in
 * `src/config/ingredients.json`, typed and enriched by
 * `IngredientComposition.ts`.
 */
import {type IngredientDef as FullIngredientDef, INGREDIENTS} from './IngredientComposition';

/** Legacy category union — identical to the one on the new IngredientDef. */
export type IngredientCategory = 'food' | 'weird' | 'trash';

/**
 * Legacy IngredientDef type. Callers that only need the core fields
 * (id, name, path, scale, category, tasteMod, textureMod, blowPower,
 * tags) can keep using this. Callers that want the new
 * `traits`/`composition` fields should import
 * `IngredientDef` from `./IngredientComposition` instead — the full
 * type is a superset of this one.
 */
export type IngredientDef = FullIngredientDef;

/** The roster, identical to what used to be the hand-written array. */
export const INGREDIENT_MODELS: readonly IngredientDef[] = INGREDIENTS;

/** Look up an ingredient by id. Returns undefined if not found. */
export function getIngredientById(id: string): IngredientDef | undefined {
  return INGREDIENT_MODELS.find(i => i.id === id);
}
