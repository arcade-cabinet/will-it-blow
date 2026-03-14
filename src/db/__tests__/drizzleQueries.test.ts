import {describe, expect, it} from '@jest/globals';
import {hydrateSession, loadSettings, saveSettings, persistSession} from '../drizzleQueries';

// Mock the entire client module
jest.mock('../client', () => ({
  getDb: jest.fn(() => ({
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([])),
        })),
        limit: jest.fn(() => Promise.resolve([])),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve({lastInsertRowId: 1})),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

describe('drizzleQueries (op-sqlite)', () => {
  it('hydrateSession returns null when no session', async () => {
    const result = await hydrateSession();
    expect(result).toBeNull();
  });

  it('persistSession returns null for new session', async () => {
    const result = await persistSession({difficulty: 'medium'});
    expect(result).toBeNull();
  });

  it('loadSettings returns null for unknown key', async () => {
    const result = await loadSettings('nonexistent');
    expect(result).toBeNull();
  });

  it('saveSettings does not throw', async () => {
    await expect(saveSettings('key', 'value')).resolves.toBeUndefined();
  });
});
