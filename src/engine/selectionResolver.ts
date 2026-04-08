/**
 * @module selectionResolver
 * Bridge between the ID-based `SelectedIngredientsTrait` (which stores
 * a JSON array of strings on a Koota singleton) and the rich
 * `IngredientDef` objects that downstream consumers — `compositeMix`,
 * the casing tint, the splatter spawner — actually need.
 *
 * Lives in `engine/` (not `ecs/`) because it depends on
 * `IngredientComposition` and we want a one-way dependency arrow:
 * ECS hooks call into the engine, never the reverse.
 *
 * Cached by reference: the same input `ids` array (by structural
 * equality) always returns the same output array, so React selectors
 * downstream can use `===` to short-circuit re-renders.
 */
import {INGREDIENTS, type IngredientDef} from './IngredientComposition';

// ─── Lookup index ────────────────────────────────────────────────────

const INDEX_BY_ID: Map<string, IngredientDef> = (() => {
  const m = new Map<string, IngredientDef>();
  for (const ing of INGREDIENTS) {
    m.set(ing.id, ing);
  }
  return m;
})();

// ─── Memoised resolver ───────────────────────────────────────────────

/**
 * The cache is a single slot — the round selection mutates rarely
 * (once per ingredient drag) and the snapshot is recomputed whenever
 * the store version bumps, so we just want to avoid building a new
 * array on every read of the same JSON.
 */
let cacheKey = '';
let cacheValue: readonly IngredientDef[] = [];

/**
 * Resolve a list of ingredient IDs to their `IngredientDef` objects.
 * Unknown IDs are silently dropped (the freezer can theoretically
 * spawn IDs that don't appear in the typed roster — better to drop
 * than to crash the store snapshot).
 *
 * Returns a stable reference for repeated calls with the same `ids`,
 * so downstream React subscribers see referential equality.
 */
export function resolveSelection(ids: readonly string[]): readonly IngredientDef[] {
  // The key is the joined string of ids; cheaper than a hash and
  // safe because IDs are simple ASCII tokens with no commas.
  const key = ids.join(',');
  if (key === cacheKey) {
    return cacheValue;
  }
  const out: IngredientDef[] = [];
  for (const id of ids) {
    const def = INDEX_BY_ID.get(id);
    if (def !== undefined) {
      out.push(def);
    }
  }
  cacheKey = key;
  cacheValue = out;
  return out;
}

/**
 * Reset the cache. Tests that mutate the world between cases call
 * this so the next snapshot rebuilds from scratch — without this,
 * a test that adds 'banana' then resets the world then re-asks for
 * the resolution would get the stale "banana" array back.
 */
export function clearSelectionCache(): void {
  cacheKey = '';
  cacheValue = [];
}
