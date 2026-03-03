import type {MrSausageDemands, PlayerDecisions} from '../../store/gameStore';
import {COOK_TARGETS, calculateDemandBonus} from '../DemandScoring';

/** Helper to create a minimal valid MrSausageDemands object. */
function makeDemands(overrides: Partial<MrSausageDemands> = {}): MrSausageDemands {
  return {
    preferredForm: 'link',
    desiredLinkCount: 3,
    uniformity: 'any',
    desiredIngredients: ['Beef', 'Onion'],
    hatedIngredients: ['Dirt'],
    cookPreference: 'medium',
    moodProfile: 'cryptic',
    ...overrides,
  };
}

/** Helper to create a minimal valid PlayerDecisions object. */
function makeDecisions(overrides: Partial<PlayerDecisions> = {}): PlayerDecisions {
  return {
    selectedIngredients: [],
    twistPoints: [],
    chosenForm: null,
    finalCookLevel: 0,
    hintsViewed: [],
    flairTwists: 0,
    stageTimings: {},
    flairPoints: [],
    ...overrides,
  };
}

describe('DemandScoring', () => {
  describe('formMatch', () => {
    it('awards +15 when chosen form matches preferred form (link)', () => {
      const demands = makeDemands({preferredForm: 'link'});
      const decisions = makeDecisions({chosenForm: 'link'});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.formMatch.matched).toBe(true);
      expect(result.formMatch.points).toBe(15);
      expect(result.formMatch.wanted).toBe('link');
      expect(result.formMatch.got).toBe('link');
    });

    it('awards +15 when chosen form matches preferred form (coil)', () => {
      const demands = makeDemands({preferredForm: 'coil'});
      const decisions = makeDecisions({chosenForm: 'coil'});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.formMatch.matched).toBe(true);
      expect(result.formMatch.points).toBe(15);
    });

    it('penalizes -10 when form does not match', () => {
      const demands = makeDemands({preferredForm: 'link'});
      const decisions = makeDecisions({chosenForm: 'coil'});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.formMatch.matched).toBe(false);
      expect(result.formMatch.points).toBe(-10);
    });

    it('penalizes -10 when chosenForm is null (player never chose)', () => {
      const demands = makeDemands({preferredForm: 'coil'});
      const decisions = makeDecisions({chosenForm: null});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.formMatch.matched).toBe(false);
      expect(result.formMatch.points).toBe(-10);
      expect(result.formMatch.got).toBeNull();
    });
  });

  describe('cookMatch', () => {
    it.each([
      ['rare', 0.15],
      ['medium', 0.45],
      ['well-done', 0.75],
      ['charred', 0.95],
    ] as const)('awards +10 for %s at exact target %f', (pref, target) => {
      const demands = makeDemands({cookPreference: pref});
      const decisions = makeDecisions({finalCookLevel: target});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.cookMatch.matched).toBe(true);
      expect(result.cookMatch.points).toBe(10);
      expect(result.cookMatch.wanted).toBe(pref);
    });

    it.each([
      ['rare', 0.15],
      ['medium', 0.45],
      ['well-done', 0.75],
      ['charred', 0.95],
    ] as const)('awards +10 for %s near boundary (within 0.14)', (pref, target) => {
      const demands = makeDemands({cookPreference: pref});
      const decisions = makeDecisions({finalCookLevel: target + 0.14});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.cookMatch.matched).toBe(true);
      expect(result.cookMatch.points).toBe(10);
    });

    it.each([
      ['rare', 0.15, 0.5],
      ['medium', 0.45, 0.8],
      ['well-done', 0.75, 0.2],
      ['charred', 0.95, 0.5],
    ] as const)('penalizes -5 for %s far off (delta > tolerance)', (pref, _target, farValue) => {
      const demands = makeDemands({cookPreference: pref});
      // Use a value clearly beyond tolerance to avoid floating point edge cases
      const decisions = makeDecisions({finalCookLevel: farValue});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.cookMatch.matched).toBe(false);
      expect(result.cookMatch.points).toBe(-5);
    });

    it('penalizes -5 when cook level is way off', () => {
      const demands = makeDemands({cookPreference: 'rare'}); // target 0.15
      const decisions = makeDecisions({finalCookLevel: 0.95}); // charred
      const result = calculateDemandBonus(demands, decisions);
      expect(result.cookMatch.matched).toBe(false);
      expect(result.cookMatch.points).toBe(-5);
    });

    it('records actual cook level in result', () => {
      const demands = makeDemands({cookPreference: 'medium'});
      const decisions = makeDecisions({finalCookLevel: 0.72});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.cookMatch.actual).toBe(0.72);
    });
  });

  describe('ingredientMatch', () => {
    it('awards +8 per desired ingredient hit', () => {
      const demands = makeDemands({desiredIngredients: ['Beef', 'Onion', 'Garlic']});
      const decisions = makeDecisions({selectedIngredients: ['Beef', 'Onion']});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.desiredHits).toEqual(['Beef', 'Onion']);
      expect(result.ingredientMatch.points).toBe(16); // 2 * 8
    });

    it('penalizes -12 per hated ingredient hit', () => {
      const demands = makeDemands({
        desiredIngredients: [],
        hatedIngredients: ['Dirt', 'Spam'],
      });
      const decisions = makeDecisions({selectedIngredients: ['Dirt', 'Spam', 'Rice']});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.hatedHits).toEqual(['Dirt', 'Spam']);
      expect(result.ingredientMatch.points).toBe(-24); // 2 * -12
    });

    it('handles mixed desired and hated hits', () => {
      const demands = makeDemands({
        desiredIngredients: ['Beef', 'Onion'],
        hatedIngredients: ['Dirt'],
      });
      const decisions = makeDecisions({selectedIngredients: ['Beef', 'Dirt']});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.desiredHits).toEqual(['Beef']);
      expect(result.ingredientMatch.hatedHits).toEqual(['Dirt']);
      expect(result.ingredientMatch.points).toBe(-4); // 8 + (-12)
    });

    it('is case-insensitive', () => {
      const demands = makeDemands({desiredIngredients: ['Beef']});
      const decisions = makeDecisions({selectedIngredients: ['beef']});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.desiredHits).toEqual(['Beef']);
      expect(result.ingredientMatch.points).toBe(8);
    });

    it('scores 0 when no desired or hated ingredients are in selection', () => {
      const demands = makeDemands({
        desiredIngredients: ['Beef'],
        hatedIngredients: ['Dirt'],
      });
      const decisions = makeDecisions({selectedIngredients: ['Chicken', 'Rice']});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.desiredHits).toEqual([]);
      expect(result.ingredientMatch.hatedHits).toEqual([]);
      expect(result.ingredientMatch.points).toBe(0);
    });

    it('scores 0 when selectedIngredients is empty', () => {
      const demands = makeDemands({desiredIngredients: ['Beef']});
      const decisions = makeDecisions({selectedIngredients: []});
      const result = calculateDemandBonus(demands, decisions);
      expect(result.ingredientMatch.desiredHits).toEqual([]);
      expect(result.ingredientMatch.points).toBe(0);
    });
  });

  describe('flairBonus', () => {
    it('sums all flair points', () => {
      const decisions = makeDecisions({
        flairPoints: [
          {reason: 'twist-combo', points: 3},
          {reason: 'speed-bonus', points: 5},
          {reason: 'style-points', points: 2},
        ],
      });
      const demands = makeDemands();
      const result = calculateDemandBonus(demands, decisions);
      expect(result.flairBonus).toBe(10);
    });

    it('returns 0 when no flair points exist', () => {
      const decisions = makeDecisions({flairPoints: []});
      const demands = makeDemands();
      const result = calculateDemandBonus(demands, decisions);
      expect(result.flairBonus).toBe(0);
    });

    it('handles a single flair point', () => {
      const decisions = makeDecisions({
        flairPoints: [{reason: 'perfect-grind', points: 7}],
      });
      const demands = makeDemands();
      const result = calculateDemandBonus(demands, decisions);
      expect(result.flairBonus).toBe(7);
    });
  });

  describe('totalDemandBonus', () => {
    it('aggregates all category scores', () => {
      const demands = makeDemands({
        preferredForm: 'link',
        cookPreference: 'medium',
        desiredIngredients: ['Beef'],
        hatedIngredients: ['Dirt'],
      });
      const decisions = makeDecisions({
        chosenForm: 'link', // +15
        finalCookLevel: 0.45, // +10
        selectedIngredients: ['Beef'], // +8
        flairPoints: [{reason: 'style', points: 4}], // +4
      });
      const result = calculateDemandBonus(demands, decisions);
      expect(result.totalDemandBonus).toBe(15 + 10 + 8 + 4);
    });

    it('can be negative when penalties outweigh bonuses', () => {
      const demands = makeDemands({
        preferredForm: 'link',
        cookPreference: 'rare',
        desiredIngredients: [],
        hatedIngredients: ['Dirt', 'Spam'],
      });
      const decisions = makeDecisions({
        chosenForm: 'coil', // -10
        finalCookLevel: 0.95, // -5
        selectedIngredients: ['Dirt', 'Spam'], // -24
        flairPoints: [],
      });
      const result = calculateDemandBonus(demands, decisions);
      expect(result.totalDemandBonus).toBe(-10 + -5 + -24);
      expect(result.totalDemandBonus).toBeLessThan(0);
    });

    it('equals sum of individual parts', () => {
      const demands = makeDemands({
        preferredForm: 'coil',
        cookPreference: 'well-done',
        desiredIngredients: ['Onion', 'Garlic'],
        hatedIngredients: ['Spam'],
      });
      const decisions = makeDecisions({
        chosenForm: 'coil', // +15
        finalCookLevel: 0.5, // far from 0.75 → -5
        selectedIngredients: ['Onion', 'Spam'], // +8 - 12 = -4
        flairPoints: [{reason: 'a', points: 2}], // +2
      });
      const result = calculateDemandBonus(demands, decisions);
      const expectedTotal =
        result.formMatch.points +
        result.cookMatch.points +
        result.ingredientMatch.points +
        result.flairBonus;
      expect(result.totalDemandBonus).toBe(expectedTotal);
    });
  });

  describe('COOK_TARGETS', () => {
    it('has correct values for all preferences', () => {
      expect(COOK_TARGETS.rare).toBe(0.15);
      expect(COOK_TARGETS.medium).toBe(0.45);
      expect(COOK_TARGETS['well-done']).toBe(0.75);
      expect(COOK_TARGETS.charred).toBe(0.95);
    });
  });
});
