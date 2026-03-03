import {
  ALL_WASHABLE_ITEMS,
  getCleanupProgress,
  getRequiredCleanup,
  isKitchenClean,
  STATION_EQUIPMENT,
} from '../CleanupManager';
import {loadDifficultyTier} from '../DifficultyConfig';

describe('STATION_EQUIPMENT', () => {
  it('maps stove to frying-pan', () => {
    expect(STATION_EQUIPMENT.stove).toEqual(['frying-pan']);
  });

  it('maps grinder to grinder-plate and hopper', () => {
    expect(STATION_EQUIPMENT.grinder).toContain('grinder-plate');
    expect(STATION_EQUIPMENT.grinder).toContain('hopper');
  });

  it('maps stuffer to nozzle', () => {
    expect(STATION_EQUIPMENT.stuffer).toEqual(['nozzle']);
  });
});

describe('ALL_WASHABLE_ITEMS', () => {
  it('is a flat list of all equipment', () => {
    expect(ALL_WASHABLE_ITEMS).toContain('frying-pan');
    expect(ALL_WASHABLE_ITEMS).toContain('grinder-plate');
    expect(ALL_WASHABLE_ITEMS).toContain('hopper');
    expect(ALL_WASHABLE_ITEMS).toContain('nozzle');
  });
});

describe('getRequiredCleanup', () => {
  it('returns empty array for rare (no cleanup)', () => {
    const tier = loadDifficultyTier('rare');
    expect(getRequiredCleanup(tier)).toEqual([]);
  });

  it('returns only frying-pan for medium-rare', () => {
    const tier = loadDifficultyTier('medium-rare');
    const result = getRequiredCleanup(tier);
    expect(result).toEqual(['frying-pan']);
  });

  it('returns frying-pan and grinder-plate for medium', () => {
    const tier = loadDifficultyTier('medium');
    const result = getRequiredCleanup(tier);
    expect(result).toContain('frying-pan');
    expect(result).toContain('grinder-plate');
    expect(result).not.toContain('hopper');
    expect(result).not.toContain('nozzle');
  });

  it('returns all washable items for medium-well', () => {
    const tier = loadDifficultyTier('medium-well');
    const result = getRequiredCleanup(tier);
    expect(result).toContain('frying-pan');
    expect(result).toContain('grinder-plate');
    expect(result).toContain('hopper');
    expect(result).toContain('nozzle');
    expect(result.length).toBe(ALL_WASHABLE_ITEMS.length);
  });

  it('returns all washable items for well-done', () => {
    const tier = loadDifficultyTier('well-done');
    const result = getRequiredCleanup(tier);
    expect(result.length).toBe(ALL_WASHABLE_ITEMS.length);
  });
});

describe('isKitchenClean', () => {
  it('returns true when required array is empty', () => {
    expect(isKitchenClean([], {})).toBe(true);
  });

  it('returns false when no items are clean', () => {
    expect(isKitchenClean(['frying-pan'], {})).toBe(false);
    expect(isKitchenClean(['frying-pan'], {'frying-pan': 0})).toBe(false);
  });

  it('returns false when some items are partially clean', () => {
    const cleanliness = {'frying-pan': 1.0, 'grinder-plate': 0.5};
    expect(isKitchenClean(['frying-pan', 'grinder-plate'], cleanliness)).toBe(false);
  });

  it('returns true when all required items are fully clean (>= 1.0)', () => {
    const cleanliness = {'frying-pan': 1.0, 'grinder-plate': 1.0};
    expect(isKitchenClean(['frying-pan', 'grinder-plate'], cleanliness)).toBe(true);
  });

  it('ignores unrequired items that are dirty', () => {
    const cleanliness = {'frying-pan': 1.0, hopper: 0.0};
    expect(isKitchenClean(['frying-pan'], cleanliness)).toBe(true);
  });
});

describe('getCleanupProgress', () => {
  it('returns 1 when required is empty', () => {
    expect(getCleanupProgress([], {})).toBe(1);
  });

  it('returns 0 when no items are clean', () => {
    expect(getCleanupProgress(['frying-pan', 'hopper'], {})).toBe(0);
  });

  it('returns 0.5 when half the items are clean', () => {
    const cleanliness = {'frying-pan': 1.0, hopper: 0.0};
    expect(getCleanupProgress(['frying-pan', 'hopper'], cleanliness)).toBe(0.5);
  });

  it('returns 1 when all required items are fully clean', () => {
    const cleanliness = {'frying-pan': 1.0, 'grinder-plate': 1.0, hopper: 1.0, nozzle: 1.0};
    expect(getCleanupProgress(ALL_WASHABLE_ITEMS, cleanliness)).toBe(1);
  });

  it('treats items with level < 1.0 as not clean', () => {
    const cleanliness = {'frying-pan': 0.99};
    expect(getCleanupProgress(['frying-pan'], cleanliness)).toBe(0);
  });
});
