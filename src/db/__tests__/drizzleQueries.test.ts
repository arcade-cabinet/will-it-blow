import {describe, expect, it} from '@jest/globals';
import {
  getUsedCombos,
  hydrateSession,
  loadSettings,
  persistSession,
  recordCombo,
  saveSettings,
} from '../drizzleQueries';

/**
 * These tests verify graceful fallback behavior when SQLite is unavailable.
 * In Jest/Node, expo-sqlite is not available, so getDb() returns null.
 * All query functions must handle this gracefully.
 */
describe('drizzleQueries — graceful fallback (no SQLite)', () => {
  describe('hydrateSession', () => {
    it('returns null when db unavailable', async () => {
      const result = await hydrateSession();
      expect(result).toBeNull();
    });
  });

  describe('persistSession', () => {
    it('returns null when db unavailable', async () => {
      const result = await persistSession({difficulty: 'medium'});
      expect(result).toBeNull();
    });

    it('returns null for update when db unavailable', async () => {
      const result = await persistSession({
        id: 1,
        difficulty: 'hard',
        finalScore: 85,
        rank: 'A',
      });
      expect(result).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('does not throw when db unavailable', async () => {
      await expect(saveSettings('musicVolume', '0.8')).resolves.toBeUndefined();
    });
  });

  describe('loadSettings', () => {
    it('returns null when db unavailable', async () => {
      const result = await loadSettings('musicVolume');
      expect(result).toBeNull();
    });
  });

  describe('recordCombo', () => {
    it('does not throw when db unavailable', async () => {
      await expect(recordCombo(1, ['banana', 'steak', 'pepper'])).resolves.toBeUndefined();
    });
  });

  describe('getUsedCombos', () => {
    it('returns empty array when db unavailable', async () => {
      const result = await getUsedCombos(1);
      expect(result).toEqual([]);
    });
  });
});

describe('drizzleQueries — API shape', () => {
  it('hydrateSession is a function', () => {
    expect(typeof hydrateSession).toBe('function');
  });

  it('persistSession is a function', () => {
    expect(typeof persistSession).toBe('function');
  });

  it('saveSettings is a function', () => {
    expect(typeof saveSettings).toBe('function');
  });

  it('loadSettings is a function', () => {
    expect(typeof loadSettings).toBe('function');
  });

  it('recordCombo is a function', () => {
    expect(typeof recordCombo).toBe('function');
  });

  it('getUsedCombos is a function', () => {
    expect(typeof getUsedCombos).toBe('function');
  });
});
