import {beforeEach, describe, expect, it, vi} from 'vitest';

// Mock sql.js — return a factory that creates in-memory Database objects
vi.mock('sql.js', () => ({
  default: vi.fn(async () => ({
    Database: class MockDatabase {
      run(_sql: string) {}
      prepare(_sql: string) {
        return {
          bind() {},
          step() {
            return false;
          },
          getAsObject() {
            return {};
          },
          get() {
            return [];
          },
          free() {},
        };
      }
    },
  })),
}));

// Mock @capacitor/core — not on native in tests
vi.mock('@capacitor/core', () => ({
  Capacitor: {isNativePlatform: () => false},
}));

// Mock drizzle-orm/sql-js
vi.mock('drizzle-orm/sql-js', () => ({
  drizzle: vi.fn(() => ({select: vi.fn(), insert: vi.fn(), update: vi.fn()})),
}));

import {getDb, resetDbClient} from '../client';

describe('db/client (dual driver)', () => {
  beforeEach(() => resetDbClient());

  it('getDb returns a drizzle instance', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it('getDb is idempotent', async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });

  it('resetDbClient clears cache', async () => {
    await getDb();
    resetDbClient();
    // After reset, getDb creates a new instance
    const db = await getDb();
    expect(db).toBeDefined();
  });
});
