/**
 * Tests for the grailguard-pattern db/client.
 *
 * The real client uses @capacitor-community/sqlite + jeep-sqlite + drizzle
 * sqlite-proxy. In jsdom tests we mock the Capacitor layer and verify the
 * public API shape: getDb returns a drizzle instance, is idempotent, and
 * resets cleanly.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// Mock @capacitor/core — always report "web" platform in tests.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

// Mock @capacitor-community/sqlite — in-memory stubs.
const mockConnection = {
  open: vi.fn(async () => undefined),
  run: vi.fn(async () => ({changes: {values: []}})),
  query: vi.fn(async () => ({values: []})),
  executeSet: vi.fn(async () => ({changes: {values: []}})),
  execute: vi.fn(async () => ({changes: {values: []}})),
};

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn().mockImplementation(() => ({
    initWebStore: vi.fn(async () => undefined),
    isConnection: vi.fn(async () => ({result: false})),
    createConnection: vi.fn(async () => mockConnection),
    retrieveConnection: vi.fn(async () => mockConnection),
    saveToStore: vi.fn(async () => undefined),
  })),
}));

// Mock jeep-sqlite/loader — no-op in jsdom.
vi.mock('jeep-sqlite/loader', () => ({
  defineCustomElements: vi.fn(async () => undefined),
}));

// Mock drizzle-orm/sqlite-proxy.
vi.mock('drizzle-orm/sqlite-proxy', () => ({
  drizzle: vi.fn(() => ({select: vi.fn(), insert: vi.fn(), update: vi.fn()})),
}));

// Stub customElements.whenDefined for jsdom — always resolve instantly.
// jsdom has customElements but whenDefined may reject for unknown elements.
if (typeof globalThis.customElements !== 'undefined') {
  vi.spyOn(customElements, 'whenDefined').mockResolvedValue(undefined as any);
} else {
  // No customElements at all (Node without jsdom) — create a minimal stub.
  (globalThis as any).customElements = {
    whenDefined: vi.fn(async () => undefined),
    define: vi.fn(),
    get: vi.fn(),
  };
}

import {getDb, resetDbClient} from '../client';

describe('db/client (grailguard stack)', () => {
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
    const db = await getDb();
    expect(db).toBeDefined();
  });
});
