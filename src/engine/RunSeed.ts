/**
 * @module RunSeed
 * Per-run seeded deterministic RNG.
 *
 * The whole game is built on a save-scummed reload contract: a player
 * who reloads the same save and re-enters the same inputs MUST see the
 * same fridge layout, the same clue text, the same Mr. Sausage mood,
 * the same particle scatter — everything that affects judgment, every
 * piece of feedback the player learns from. Without this, the deduction
 * loop is unfair: the player can't form a hypothesis on run N and test
 * it on run N+1, because the universe shifts beneath them.
 *
 * The build principle (AGENTS.md #9) makes the rule explicit: zero
 * non-seeded random calls in gameplay subtrees. This module is the
 * *only* sanctioned source of randomness for those subtrees.
 *
 * Cosmetic-only randomness (the fluorescent ballast flicker, dev
 * fixtures, test mocks) is allowed to keep the platform RNG because it
 * doesn't affect player decisions. The grep gate enforces the boundary
 * by scanning specific directories, not the whole tree.
 *
 * Algorithm: **Mulberry32** — a 32-bit linear-congruential-style RNG
 * fitting in six lines of code with no dependencies. Quality is
 * "uniformly distributed integers across 2^32, no obvious patterns at
 * 1M draws". It is **not** a CSPRNG and must never be used for any
 * security-sensitive code path.
 *
 * Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */

// ─── Module-level run seed ────────────────────────────────────────────

/**
 * The current run's seed string. `null` while the player is on the
 * title screen and no run is in flight. Set by the new-game flow,
 * cleared by `returnToMenu`.
 *
 * We keep this as a module-level singleton (rather than a Koota trait)
 * for two reasons:
 *  1. It's read from `useFrame` callbacks where Koota subscriptions
 *     would force re-renders we don't want.
 *  2. It's set once per run and effectively immutable for the run's
 *     duration — there's no value in flowing it through React state.
 */
let currentRunSeed: string | null = null;

/** Read the current run seed (or `null` outside a run). */
export function getRunSeed(): string | null {
  return currentRunSeed;
}

/**
 * Set the run seed. Pass `null` to clear (e.g., on `returnToMenu`).
 * Callers in the new-game flow should generate a fresh seed via
 * `Date.now().toString()` or similar — the seed string is opaque to
 * this module.
 */
export function setRunSeed(seed: string | null): void {
  currentRunSeed = seed;
}

// ─── Mulberry32 ───────────────────────────────────────────────────────

/**
 * Hash a UTF-8 string into a 32-bit unsigned integer. The classic
 * "djb2"-style hash; deterministic, fast, and adequate for seeding
 * Mulberry32. Same string in → same integer out, every time.
 */
export function hashSeed(seed: string): number {
  let h = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    // FNV-1a prime; equivalent to (h * 16777619) | 0 in 32-bit space.
    h = Math.imul(h, 16777619);
  }
  // Force unsigned 32-bit so the value is always in [0, 2^32).
  return h >>> 0;
}

/**
 * Build a deterministic RNG closure from a seed string.
 *
 * Returns a `() => number` that yields uniformly-distributed floats
 * in `[0, 1)`. The closure carries its own internal state, so two
 * separate `createSeededRng('foo')` calls produce two independent
 * generators with identical sequences — useful for "fork the RNG so
 * the visual jitter doesn't desync gameplay decisions".
 *
 * The Mulberry32 magic constant `0x6D2B79F5` is the canonical
 * increment for this algorithm; the unit test asserts its presence
 * so a future "let me just swap in a different RNG" PR has to break
 * the test deliberately.
 */
export function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    // Mulberry32 — six lines of magic.
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────

/**
 * Inclusive integer range `[min, max]` from a seeded RNG.
 * Mirrors the floor-times-rng-times-span+min idiom routed through the
 * seeded source.
 */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Pick a random element from a non-empty array. Throws on empty
 * input — empty-array handling is a caller bug, not something this
 * helper should silently paper over.
 */
export function pickFrom<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error('pickFrom: cannot pick from empty array');
  }
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Convenience access to "the current run's RNG" ────────────────────

/**
 * Build an RNG from the current run seed. Throws if no run is active
 * — calling this from gameplay code outside a run is a bug.
 *
 * Most callers want this rather than `createSeededRng` directly: they
 * just want "random numbers tied to the current run", and they don't
 * want to thread the seed string through every component.
 *
 * Note: each call returns a NEW closure with the same starting state.
 * If you need a single sequence shared across frames, cache the
 * closure in a `useRef` or a module-level variable.
 */
export function createRunRng(): () => number {
  if (currentRunSeed === null) {
    throw new Error('createRunRng: no active run seed (call setRunSeed first)');
  }
  return createSeededRng(currentRunSeed);
}

/**
 * Like `createRunRng` but never throws. If no run is active, falls
 * back to a fixed dev seed so test fixtures and storybook-style
 * mounts still get a deterministic stream. Production gameplay code
 * should prefer `createRunRng` so missing-seed bugs surface loudly.
 */
export function createRunRngOrFallback(fallbackSeed = 'dev-fallback-seed'): () => number {
  return createSeededRng(currentRunSeed ?? fallbackSeed);
}
