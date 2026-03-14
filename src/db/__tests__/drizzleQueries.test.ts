import {describe, expect, it, vi} from 'vitest';

// Mock the entire client module — getDb now returns a Promise
vi.mock('../client', () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve({lastInsertRowId: 1})),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

import {hydrateSession, loadSettings, persistSession, saveSettings} from '../drizzleQueries';

describe('drizzleQueries (dual driver)', () => {
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
