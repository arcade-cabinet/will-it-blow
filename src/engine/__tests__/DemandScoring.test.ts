import {calculateDemandBonus, COOK_TARGETS} from '../DemandScoring';

describe('DemandScoring', () => {
  const defaultDemands = {
    desiredTags: ['meat'],
    hatedTags: ['absurd'],
    cookPreference: 'medium'
  };

  it('calculates a high score for perfect matches', () => {
    // Steak has 'meat' tag, no 'absurd' tag
    const result = calculateDemandBonus(defaultDemands, ['steak'], 0.45);
    expect(result.totalScore).toBeGreaterThan(50);
    expect(result.breakdown).toContain('Perfect Cook');
    expect(result.breakdown).toContain('Hit Desired Tags');
  });

  it('penalizes for hated tags', () => {
    // Worm has 'meat' BUT also 'absurd'
    const result = calculateDemandBonus(defaultDemands, ['worm'], 0.45);
    // Should be lower than steak
    const steakResult = calculateDemandBonus(defaultDemands, ['steak'], 0.45);
    expect(result.totalScore).toBeLessThan(steakResult.totalScore);
    expect(result.breakdown).toContain('Hit Hated Tags');
  });

  it('penalizes for wrong cook level', () => {
    const result = calculateDemandBonus(defaultDemands, ['steak'], 0.95); // charred instead of medium
    expect(result.breakdown).toContain('Wrong Cook');
  });

  it('handles multiple ingredients', () => {
    const result = calculateDemandBonus(defaultDemands, ['steak', 'bacon', 'burger'], 0.45);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.breakdown).toContain('Base Flavor');
  });

  describe('COOK_TARGETS', () => {
    it('has correct values', () => {
      expect(COOK_TARGETS.rare).toBe(0.15);
      expect(COOK_TARGETS.medium).toBe(0.45);
      expect(COOK_TARGETS['well-done']).toBe(0.75);
      expect(COOK_TARGETS.charred).toBe(0.95);
    });
  });
});
