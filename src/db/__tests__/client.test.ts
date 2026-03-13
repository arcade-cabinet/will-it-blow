import {beforeEach, describe, expect, it} from '@jest/globals';
import {getDb, resetDbClient} from '../client';

describe('db/client', () => {
  beforeEach(() => {
    resetDbClient();
  });

  it('getDb throws in test environment (no WASM)', () => {
    expect(() => getDb()).toThrow('test environment');
  });

  it('getDb throws with informative message on second call after failure', () => {
    expect(() => getDb()).toThrow();
    resetDbClient();
    expect(() => getDb()).toThrow();
  });

  it('resetDbClient allows retry', () => {
    expect(() => getDb()).toThrow();
    resetDbClient();
    // Should throw again (still in test env) but with fresh attempt
    expect(() => getDb()).toThrow('test environment');
  });

  it('exports getDb as a function', () => {
    expect(typeof getDb).toBe('function');
  });

  it('exports resetDbClient as a function', () => {
    expect(typeof resetDbClient).toBe('function');
  });
});
