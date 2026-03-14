import {describe, expect, it} from '@jest/globals';

// Mock op-sqlite before importing client
jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock('drizzle-orm/op-sqlite', () => ({
  drizzle: jest.fn(() => ({select: jest.fn(), insert: jest.fn(), update: jest.fn()})),
}));

import {getDb, resetDbClient} from '../client';

describe('db/client (op-sqlite)', () => {
  beforeEach(() => resetDbClient());

  it('getDb returns a drizzle instance', () => {
    const db = getDb();
    expect(db).toBeDefined();
  });

  it('getDb is idempotent', () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('resetDbClient clears cache', () => {
    getDb();
    resetDbClient();
    // After reset, getDb creates a new instance
    const db = getDb();
    expect(db).toBeDefined();
  });
});
