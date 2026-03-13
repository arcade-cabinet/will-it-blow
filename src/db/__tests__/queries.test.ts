/**
 * Persistence layer tests — verifies schema, serialization, and query logic.
 * Uses an in-memory store to avoid AsyncStorage dependency in tests.
 */

import {
  clearAllRuns,
  completeRun,
  createMemoryStore,
  createRun,
  getBestRun,
  getRecentRuns,
  getStats,
} from '../queries';

describe('persistence — createRun', () => {
  it('creates a run with required fields', async () => {
    const store = createMemoryStore();
    const run = await createRun(store, {difficulty: 'medium', rounds: 1});
    expect(run.id).toBeDefined();
    expect(run.difficulty).toBe('medium');
    expect(run.rounds).toBe(1);
    expect(run.startedAt).toBeGreaterThan(0);
    expect(run.completedAt).toBeNull();
    expect(run.challengeScores).toEqual([]);
    expect(run.finalRank).toBeNull();
  });

  it('assigns unique IDs to each run', async () => {
    const store = createMemoryStore();
    const a = await createRun(store, {difficulty: 'medium', rounds: 1});
    const b = await createRun(store, {difficulty: 'medium', rounds: 1});
    expect(a.id).not.toBe(b.id);
  });
});

describe('persistence — completeRun', () => {
  it('sets completedAt, scores, and rank', async () => {
    const store = createMemoryStore();
    const run = await createRun(store, {difficulty: 'rare', rounds: 1});
    const completed = await completeRun(store, run.id, {
      challengeScores: [80, 90, 70],
      finalRank: 'A',
      averageScore: 80,
      totalFlairPoints: 15,
      enemiesDefeated: 2,
    });
    expect(completed.completedAt).toBeGreaterThan(0);
    expect(completed.challengeScores).toEqual([80, 90, 70]);
    expect(completed.finalRank).toBe('A');
    expect(completed.averageScore).toBe(80);
    expect(completed.totalFlairPoints).toBe(15);
    expect(completed.enemiesDefeated).toBe(2);
  });

  it('throws when completing a non-existent run', async () => {
    const store = createMemoryStore();
    await expect(
      completeRun(store, 'nonexistent', {
        challengeScores: [],
        finalRank: 'F',
        averageScore: 0,
        totalFlairPoints: 0,
        enemiesDefeated: 0,
      }),
    ).rejects.toThrow();
  });
});

describe('persistence — getRecentRuns', () => {
  it('returns completed runs ordered by most recent first', async () => {
    const store = createMemoryStore();
    const a = await createRun(store, {difficulty: 'rare', rounds: 1});
    await completeRun(store, a.id, {
      challengeScores: [50],
      finalRank: 'B',
      averageScore: 50,
      totalFlairPoints: 0,
      enemiesDefeated: 0,
    });

    // Force later timestamp
    const origNow = Date.now;
    Date.now = () => origNow() + 1000;
    const b = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, b.id, {
      challengeScores: [90],
      finalRank: 'S',
      averageScore: 90,
      totalFlairPoints: 5,
      enemiesDefeated: 0,
    });
    Date.now = origNow;

    const runs = await getRecentRuns(store, 10);
    expect(runs).toHaveLength(2);
    expect(runs[0].id).toBe(b.id);
    expect(runs[1].id).toBe(a.id);
  });

  it('respects limit parameter', async () => {
    const store = createMemoryStore();
    for (let i = 0; i < 5; i++) {
      const run = await createRun(store, {difficulty: 'medium', rounds: 1});
      await completeRun(store, run.id, {
        challengeScores: [50],
        finalRank: 'B',
        averageScore: 50,
        totalFlairPoints: 0,
        enemiesDefeated: 0,
      });
    }
    const runs = await getRecentRuns(store, 3);
    expect(runs).toHaveLength(3);
  });

  it('only returns completed runs', async () => {
    const store = createMemoryStore();
    await createRun(store, {difficulty: 'medium', rounds: 1}); // incomplete
    const b = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, b.id, {
      challengeScores: [80],
      finalRank: 'A',
      averageScore: 80,
      totalFlairPoints: 0,
      enemiesDefeated: 0,
    });

    const runs = await getRecentRuns(store, 10);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(b.id);
  });
});

describe('persistence — getBestRun', () => {
  it('returns the run with the highest average score', async () => {
    const store = createMemoryStore();
    const a = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, a.id, {
      challengeScores: [50],
      finalRank: 'B',
      averageScore: 50,
      totalFlairPoints: 0,
      enemiesDefeated: 0,
    });
    const b = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, b.id, {
      challengeScores: [95],
      finalRank: 'S',
      averageScore: 95,
      totalFlairPoints: 10,
      enemiesDefeated: 0,
    });

    const best = await getBestRun(store);
    expect(best).toBeDefined();
    expect(best!.id).toBe(b.id);
  });

  it('returns null when no completed runs exist', async () => {
    const store = createMemoryStore();
    const best = await getBestRun(store);
    expect(best).toBeNull();
  });
});

describe('persistence — getStats', () => {
  it('returns aggregate statistics', async () => {
    const store = createMemoryStore();
    const a = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, a.id, {
      challengeScores: [80],
      finalRank: 'A',
      averageScore: 80,
      totalFlairPoints: 5,
      enemiesDefeated: 1,
    });
    const b = await createRun(store, {difficulty: 'well-done', rounds: 1});
    await completeRun(store, b.id, {
      challengeScores: [60],
      finalRank: 'B',
      averageScore: 60,
      totalFlairPoints: 3,
      enemiesDefeated: 2,
    });

    const stats = await getStats(store);
    expect(stats.totalRuns).toBe(2);
    expect(stats.bestScore).toBe(80);
    expect(stats.averageScore).toBe(70);
    expect(stats.totalEnemiesDefeated).toBe(3);
    expect(stats.sRankCount).toBe(0);
  });

  it('returns zeroed stats when no runs exist', async () => {
    const store = createMemoryStore();
    const stats = await getStats(store);
    expect(stats.totalRuns).toBe(0);
    expect(stats.bestScore).toBe(0);
    expect(stats.averageScore).toBe(0);
  });
});

describe('persistence — clearAllRuns', () => {
  it('removes all stored runs', async () => {
    const store = createMemoryStore();
    const a = await createRun(store, {difficulty: 'medium', rounds: 1});
    await completeRun(store, a.id, {
      challengeScores: [80],
      finalRank: 'A',
      averageScore: 80,
      totalFlairPoints: 0,
      enemiesDefeated: 0,
    });

    await clearAllRuns(store);
    const runs = await getRecentRuns(store, 10);
    expect(runs).toHaveLength(0);
  });
});
