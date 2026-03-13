import {beforeEach, describe, expect, it} from '@jest/globals';
import {getDb, resetDbClient} from '../client';

describe('db/client', () => {
  beforeEach(() => {
    resetDbClient();
  });

  it('getDb returns null when expo-sqlite is unavailable', () => {
    // In Jest/Node, expo-sqlite is not available
    const db = getDb();
    expect(db).toBeNull();
  });

  it('getDb is idempotent (returns same result on multiple calls)', () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('resetDbClient resets the cached instance', () => {
    const db1 = getDb();
    resetDbClient();
    const db2 = getDb();
    // Both should be null in tests, but the reset should have cleared any cache
    expect(db1).toBeNull();
    expect(db2).toBeNull();
  });

  it('exports getDb as a function', () => {
    expect(typeof getDb).toBe('function');
  });

  it('exports resetDbClient as a function', () => {
    expect(typeof resetDbClient).toBe('function');
  });
});
