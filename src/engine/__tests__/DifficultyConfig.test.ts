import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TIERS,
  type DifficultyTier,
  loadDifficultyTier,
} from '../DifficultyConfig';

describe('DifficultyConfig', () => {
  it('loads all 5 difficulty tiers', () => {
    expect(DIFFICULTY_TIERS).toHaveLength(5);
  });

  it('tiers have expected IDs in order', () => {
    const ids = DIFFICULTY_TIERS.map(t => t.id);
    expect(ids).toEqual(['rare', 'medium-rare', 'medium', 'medium-well', 'well-done']);
  });

  it('each tier has all required fields', () => {
    const requiredKeys: (keyof DifficultyTier)[] = [
      'id',
      'name',
      'color',
      'hints',
      'timePressure',
      'maxStrikes',
      'permadeath',
      'hiddenObjects',
      'cleanup',
      'assembly',
      'enemyChance',
    ];

    for (const tier of DIFFICULTY_TIERS) {
      for (const key of requiredKeys) {
        expect(tier).toHaveProperty(key);
      }
    }
  });

  describe('loadDifficultyTier', () => {
    it('loads each tier by ID', () => {
      for (const tier of DIFFICULTY_TIERS) {
        const loaded = loadDifficultyTier(tier.id);
        expect(loaded.id).toBe(tier.id);
        expect(loaded.name).toBe(tier.name);
      }
    });

    it('falls back to medium for unknown ID', () => {
      const tier = loadDifficultyTier('nonexistent');
      expect(tier.id).toBe('medium');
    });
  });

  describe('DEFAULT_DIFFICULTY', () => {
    it('is "medium"', () => {
      expect(DEFAULT_DIFFICULTY).toBe('medium');
    });

    it('loads a valid tier', () => {
      const tier = loadDifficultyTier(DEFAULT_DIFFICULTY);
      expect(tier.id).toBe('medium');
      expect(tier.hints).toBe(2);
      expect(tier.timePressure).toBe(1.0);
      expect(tier.maxStrikes).toBe(3);
    });
  });

  describe('tier scaling', () => {
    it('timePressure increases with difficulty', () => {
      const pressures = DIFFICULTY_TIERS.map(t => t.timePressure);
      for (let i = 1; i < pressures.length; i++) {
        expect(pressures[i]).toBeGreaterThanOrEqual(pressures[i - 1]);
      }
    });

    it('hints decrease with difficulty', () => {
      const hints = DIFFICULTY_TIERS.map(t => t.hints);
      for (let i = 1; i < hints.length; i++) {
        expect(hints[i]).toBeLessThanOrEqual(hints[i - 1]);
      }
    });

    it('maxStrikes decrease with difficulty', () => {
      const strikes = DIFFICULTY_TIERS.map(t => t.maxStrikes);
      for (let i = 1; i < strikes.length; i++) {
        expect(strikes[i]).toBeLessThanOrEqual(strikes[i - 1]);
      }
    });

    it('permadeath only applies to medium-well and well-done', () => {
      expect(loadDifficultyTier('rare').permadeath).toBe(false);
      expect(loadDifficultyTier('medium-rare').permadeath).toBe(false);
      expect(loadDifficultyTier('medium').permadeath).toBe(false);
      expect(loadDifficultyTier('medium-well').permadeath).toBe(true);
      expect(loadDifficultyTier('well-done').permadeath).toBe(true);
    });

    it('enemyChance increases with difficulty', () => {
      const chances = DIFFICULTY_TIERS.map(t => t.enemyChance);
      for (let i = 1; i < chances.length; i++) {
        expect(chances[i]).toBeGreaterThanOrEqual(chances[i - 1]);
      }
    });
  });

  describe('timer scaling via timePressure', () => {
    it('rare gives 2x more time (timePressure = 0.5)', () => {
      const baseTime = 60;
      const tier = loadDifficultyTier('rare');
      // Lower timePressure = more time available (inverse scaling)
      expect(baseTime / tier.timePressure).toBe(120);
    });

    it('medium has baseline timing (timePressure = 1.0)', () => {
      const baseTime = 60;
      const tier = loadDifficultyTier('medium');
      expect(baseTime / tier.timePressure).toBe(60);
    });

    it('well-done cuts time drastically (timePressure = 2.5)', () => {
      const baseTime = 60;
      const tier = loadDifficultyTier('well-done');
      expect(baseTime / tier.timePressure).toBe(24);
    });
  });

  describe('strike limits from difficulty', () => {
    it('rare allows 5 strikes', () => {
      expect(loadDifficultyTier('rare').maxStrikes).toBe(5);
    });

    it('medium allows 3 strikes', () => {
      expect(loadDifficultyTier('medium').maxStrikes).toBe(3);
    });

    it('well-done allows only 1 strike', () => {
      expect(loadDifficultyTier('well-done').maxStrikes).toBe(1);
    });
  });
});
