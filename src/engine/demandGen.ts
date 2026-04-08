/**
 * @module demandGen
 * Pure helper for generating Mr. Sausage's per-round legacy demands.
 *
 * The "demands" model (desired tags, hated tags, cook preference) is the
 * pre-Zoombinis scoring substrate that the round transition + verdict
 * screen still consume. T0.C will replace the deduction loop with
 * `ClueGenerator`, but until then we still need a deterministic source
 * for the existing demand fields.
 *
 * Splitting this out of `ecs/hooks.ts` and `ecs/actions.ts` lets both
 * call sites share the same logic AND lets the unit test pin determinism
 * at the helper level rather than going through Koota.
 */

/** Output shape consumed by the existing DemandTrait writers. */
export interface GeneratedDemand {
  readonly desiredTags: readonly [string, string];
  readonly hatedTags: readonly [string];
  readonly cookPreference: 'rare' | 'medium' | 'well-done' | 'charred';
}

/** The legacy tag pool. Mirrors the old hardcoded list in hooks.ts. */
const POSSIBLE_TAGS: readonly string[] = [
  'sweet',
  'savory',
  'meat',
  'spicy',
  'comfort',
  'absurd',
  'fast-food',
  'chunky',
  'smooth',
];

const COOK_PREFS = ['rare', 'medium', 'well-done', 'charred'] as const;

/**
 * Fisher-Yates shuffle in place. Stable across runs given a stable RNG.
 *
 * The old `sort(() => rng - 0.5)` idiom is both non-deterministic AND
 * non-uniform — sort comparators are required to be transitive, which
 * random comparators violate. Fisher-Yates is the correct fix in both
 * dimensions.
 */
function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a Mr. Sausage demand triple from a seeded RNG. Returns the
 * exact same triple every time the same RNG is fed in.
 */
export function generateDemand(rng: () => number): GeneratedDemand {
  const shuffled = shuffleInPlace([...POSSIBLE_TAGS], rng);
  const cookIdx = Math.floor(rng() * COOK_PREFS.length);
  return {
    desiredTags: [shuffled[0], shuffled[1]],
    hatedTags: [shuffled[2]],
    cookPreference: COOK_PREFS[cookIdx],
  };
}
