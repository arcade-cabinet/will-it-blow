/**
 * @module db/queries
 * Persistence queries for game run history.
 *
 * Uses a simple store interface that can be backed by:
 * - AsyncStorage (production, native + web)
 * - In-memory Map (tests)
 * - expo-sqlite + Drizzle (future upgrade, using schema.ts definitions)
 *
 * All functions are async to remain compatible with any backing store.
 */

/** Minimal key-value store interface (compatible with AsyncStorage). */
export interface KVStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** A single game run record. */
export interface GameRun {
  id: string;
  startedAt: number;
  completedAt: number | null;
  difficulty: string;
  rounds: number;
  challengeScores: number[];
  finalRank: string | null;
  averageScore: number | null;
  totalFlairPoints: number;
  enemiesDefeated: number;
}

/** Aggregate statistics across all completed runs. */
export interface RunStats {
  totalRuns: number;
  bestScore: number;
  averageScore: number;
  totalEnemiesDefeated: number;
  sRankCount: number;
}

const STORAGE_KEY = 'will-it-blow-runs';

/** Create an in-memory store for testing (no AsyncStorage dependency). */
export function createMemoryStore(): KVStore {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: async (key: string) => {
      data.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readRuns(store: KVStore): Promise<GameRun[]> {
  const raw = await store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GameRun[];
  } catch {
    return [];
  }
}

async function writeRuns(store: KVStore, runs: GameRun[]): Promise<void> {
  await store.setItem(STORAGE_KEY, JSON.stringify(runs));
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a new game run record. Returns the created run. */
export async function createRun(
  store: KVStore,
  params: {difficulty: string; rounds: number},
): Promise<GameRun> {
  const run: GameRun = {
    id: generateId(),
    startedAt: Date.now(),
    completedAt: null,
    difficulty: params.difficulty,
    rounds: params.rounds,
    challengeScores: [],
    finalRank: null,
    averageScore: null,
    totalFlairPoints: 0,
    enemiesDefeated: 0,
  };

  const runs = await readRuns(store);
  runs.push(run);
  await writeRuns(store, runs);
  return run;
}

/** Complete a game run with final scores and rank. Returns the updated run. */
export async function completeRun(
  store: KVStore,
  runId: string,
  result: {
    challengeScores: number[];
    finalRank: string;
    averageScore: number;
    totalFlairPoints: number;
    enemiesDefeated: number;
  },
): Promise<GameRun> {
  const runs = await readRuns(store);
  const run = runs.find(r => r.id === runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  run.completedAt = Date.now();
  run.challengeScores = result.challengeScores;
  run.finalRank = result.finalRank;
  run.averageScore = result.averageScore;
  run.totalFlairPoints = result.totalFlairPoints;
  run.enemiesDefeated = result.enemiesDefeated;

  await writeRuns(store, runs);
  return run;
}

/** Get recent completed runs, ordered by most recent first. */
export async function getRecentRuns(store: KVStore, limit: number): Promise<GameRun[]> {
  const runs = await readRuns(store);
  return runs
    .filter(r => r.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, limit);
}

/** Get the best completed run by average score. Returns null if none exist. */
export async function getBestRun(store: KVStore): Promise<GameRun | null> {
  const runs = await readRuns(store);
  const completed = runs.filter(r => r.completedAt !== null && r.averageScore !== null);
  if (completed.length === 0) return null;
  return completed.reduce((best, run) =>
    (run.averageScore ?? 0) > (best.averageScore ?? 0) ? run : best,
  );
}

/** Get aggregate statistics across all completed runs. */
export async function getStats(store: KVStore): Promise<RunStats> {
  const runs = await readRuns(store);
  const completed = runs.filter(r => r.completedAt !== null && r.averageScore !== null);

  if (completed.length === 0) {
    return {
      totalRuns: 0,
      bestScore: 0,
      averageScore: 0,
      totalEnemiesDefeated: 0,
      sRankCount: 0,
    };
  }

  const scores = completed.map(r => r.averageScore ?? 0);
  const bestScore = Math.max(...scores);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const totalEnemiesDefeated = completed.reduce((sum, r) => sum + r.enemiesDefeated, 0);
  const sRankCount = completed.filter(r => r.finalRank === 'S').length;

  return {
    totalRuns: completed.length,
    bestScore,
    averageScore,
    totalEnemiesDefeated,
    sRankCount,
  };
}

/** Remove all stored runs. */
export async function clearAllRuns(store: KVStore): Promise<void> {
  await store.removeItem(STORAGE_KEY);
}
