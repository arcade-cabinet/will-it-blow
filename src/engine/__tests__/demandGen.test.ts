/**
 * Determinism contract for the Mr. Sausage demand generator.
 *
 * Pinning this is a side-product of T0.A — once gameplay RNG is seeded,
 * the same run-seed must produce the same demands every time the player
 * reloads, otherwise save-scumming the deduction puzzle goes back to
 * being unfair.
 */
import {describe, expect, it} from 'vitest';
import {generateDemand} from '../demandGen';
import {createSeededRng} from '../RunSeed';

describe('generateDemand', () => {
  it('is deterministic for the same seeded RNG', () => {
    const rngA = createSeededRng('demand-determinism');
    const rngB = createSeededRng('demand-determinism');
    expect(generateDemand(rngA)).toEqual(generateDemand(rngB));
  });

  it('produces a desired pair distinct from the hated tag', () => {
    const rng = createSeededRng('disjoint');
    const demand = generateDemand(rng);
    expect(demand.desiredTags).toHaveLength(2);
    expect(demand.hatedTags).toHaveLength(1);
    expect(demand.desiredTags).not.toContain(demand.hatedTags[0]);
    expect(demand.desiredTags[0]).not.toBe(demand.desiredTags[1]);
  });

  it('cycles through different demands across draws', () => {
    const rng = createSeededRng('variance');
    const draws = Array.from({length: 50}, () => generateDemand(rng));
    // Across 50 draws we should see at least 5 distinct cook preferences
    // OR a variety of desired-tag pairs. Sanity check that the generator
    // isn't returning a constant.
    const distinctCooks = new Set(draws.map(d => d.cookPreference));
    const distinctDesired = new Set(draws.map(d => d.desiredTags.join(',')));
    expect(distinctCooks.size).toBeGreaterThanOrEqual(2);
    expect(distinctDesired.size).toBeGreaterThanOrEqual(10);
  });

  it('uses only legal cook preferences', () => {
    const rng = createSeededRng('legal-cook');
    const legal = ['rare', 'medium', 'well-done', 'charred'];
    for (let i = 0; i < 30; i += 1) {
      const demand = generateDemand(rng);
      expect(legal).toContain(demand.cookPreference);
    }
  });
});
