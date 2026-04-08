/**
 * @module useRunRng
 * React hook that hands a component a stable seeded RNG for the
 * lifetime of the current run.
 *
 * The hook returns a single `() => number` closure cached in a `useRef`
 * — same component, same closure, same internal state across re-renders.
 * This means a `useFrame` callback can call `rng()` once per frame and
 * watch the sequence advance deterministically; React rerenders never
 * reset the stream.
 *
 * Why a hook instead of importing `createSeededRng` directly?
 *  1. The seed is implicit (read from `getRunSeed()`), so callers don't
 *     thread strings around.
 *  2. The closure is memoised — without that, every render would build
 *     a fresh RNG and reset to draw 0, defeating the whole point.
 *  3. The fallback path (no active run, e.g. storybook / micro-tests)
 *     is centralised here so production code never has to handle the
 *     null seed case.
 */
import {useRef} from 'react';
import {createSeededRng, getRunSeed} from './RunSeed';

/**
 * Optionally pass a `salt` so different consumers in the same run get
 * different streams. Without a salt, every consumer in the same run
 * sees the *same* sequence — fine for one consumer per run, but a
 * problem if N stations all draw from the same stream and starve
 * each other of bits in non-deterministic frame order.
 *
 * Convention: pass the component name as the salt
 * (`useRunRng('Grinder.particles')`).
 */
export function useRunRng(salt = 'default'): () => number {
  const ref = useRef<() => number | null>(null);
  if (ref.current === null) {
    const seed = getRunSeed() ?? 'dev-fallback-seed';
    ref.current = createSeededRng(`${seed}::${salt}`);
  }
  // The narrowing above tells TS it's non-null going forward.
  return ref.current as () => number;
}
