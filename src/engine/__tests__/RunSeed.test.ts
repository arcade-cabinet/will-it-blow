/**
 * Contract tests for the per-run seeded RNG.
 *
 * This file is the **pin** for the seeded-determinism build principle
 * (AGENTS.md #9). Every gameplay-affecting random call routes through
 * `createSeededRng` so a save-scummed reload replays the same sequence
 * of decisions. If any of these tests weaken or vanish, the no-platform-RNG
 * grep gate becomes meaningless and the deduction loop loses its primary
 * fairness guarantee.
 *
 * Algorithm: Mulberry32 — 32-bit, 6-line implementation, no deps. Chosen
 * for smallest bundle impact and "good enough" quality for game-state RNG
 * (NOT cryptographic).
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {beforeEach, describe, expect, it} from 'vitest';
import {createSeededRng, getRunSeed, hashSeed, pickFrom, randInt, setRunSeed} from '../RunSeed';

describe('createSeededRng', () => {
  it('returns identical sequences for the same string seed', () => {
    const a = createSeededRng('hello-world');
    const b = createSeededRng('hello-world');
    for (let i = 0; i < 1000; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('returns different sequences for different seeds', () => {
    const a = createSeededRng('seed-a');
    const b = createSeededRng('seed-b');
    let differences = 0;
    for (let i = 0; i < 100; i += 1) {
      if (a() !== b()) differences += 1;
    }
    // Two different seeds should produce mostly-different sequences.
    // 100% would be suspiciously perfect; >90 is the practical threshold.
    expect(differences).toBeGreaterThan(90);
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng('range-check');
    for (let i = 0; i < 5000; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('passes a basic uniformity smoke test (10 buckets, 10k draws)', () => {
    const rng = createSeededRng('uniformity');
    const buckets = new Array(10).fill(0);
    const N = 10_000;
    for (let i = 0; i < N; i += 1) {
      buckets[Math.floor(rng() * 10)] += 1;
    }
    // Each bucket should be roughly N/10 = 1000. Allow ±25% slack
    // because we're not running a full statistical test, just a
    // sanity check that no bucket is empty or dominant.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(750);
      expect(count).toBeLessThan(1250);
    }
  });

  it('source file contains the canonical Mulberry32 magic constant', () => {
    // Source-level pin: the 0x6D2B79F5 increment is Mulberry32's
    // signature. The TS compiler may rewrite the literal to its
    // decimal form when extracting `createSeededRng.toString()`, so
    // we grep the actual source file rather than the compiled fn.
    // If a future PR swaps the algorithm, this assertion fires.
    const src = readFileSync(join(__dirname, '..', 'RunSeed.ts'), 'utf8');
    expect(src).toContain('0x6D2B79F5');
  });

  it('replays identical sequences across re-instantiations', () => {
    // Belt-and-braces determinism check that doesn't depend on the
    // source file: same seed → same first three draws, even if you
    // instantiate the closure twice.
    const rng1 = createSeededRng('replay');
    const draws = [rng1(), rng1(), rng1()];
    const rng2 = createSeededRng('replay');
    expect(rng2()).toBe(draws[0]);
    expect(rng2()).toBe(draws[1]);
    expect(rng2()).toBe(draws[2]);
  });
});

describe('hashSeed', () => {
  it('hashes a string deterministically', () => {
    expect(hashSeed('foo')).toBe(hashSeed('foo'));
    expect(hashSeed('bar')).toBe(hashSeed('bar'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashSeed('foo')).not.toBe(hashSeed('bar'));
  });

  it('returns a 32-bit unsigned integer', () => {
    const h = hashSeed('test-string');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('setRunSeed / getRunSeed', () => {
  beforeEach(() => {
    setRunSeed(null);
  });

  it('starts as null', () => {
    expect(getRunSeed()).toBeNull();
  });

  it('can be set and read back', () => {
    setRunSeed('my-run');
    expect(getRunSeed()).toBe('my-run');
  });

  it('can be cleared with null', () => {
    setRunSeed('something');
    expect(getRunSeed()).toBe('something');
    setRunSeed(null);
    expect(getRunSeed()).toBeNull();
  });
});

describe('randInt', () => {
  it('returns integers in [min, max] inclusive', () => {
    const rng = createSeededRng('intrange');
    for (let i = 0; i < 1000; i += 1) {
      const v = randInt(rng, 5, 10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('handles single-value range (min === max)', () => {
    const rng = createSeededRng('single');
    expect(randInt(rng, 7, 7)).toBe(7);
    expect(randInt(rng, 7, 7)).toBe(7);
  });
});

describe('pickFrom', () => {
  it('returns an element from the array', () => {
    const rng = createSeededRng('pick');
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i += 1) {
      const v = pickFrom(rng, arr);
      expect(arr).toContain(v);
    }
  });

  it('eventually picks every element with enough draws', () => {
    const rng = createSeededRng('coverage');
    const arr = ['a', 'b', 'c'];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      seen.add(pickFrom(rng, arr));
    }
    expect(seen.size).toBe(3);
  });

  it('throws on empty array', () => {
    const rng = createSeededRng('empty');
    expect(() => pickFrom(rng, [])).toThrow();
  });
});
