/**
 * @module db/drizzleQueries
 * Drizzle ORM query functions for Will It Blow? SQLite persistence.
 *
 * These functions require a live SQLite connection (native only).
 * On web or when SQLite is unavailable, getDb() returns null
 * and these functions gracefully return defaults.
 */
import {eq} from 'drizzle-orm';
import {getDb} from './client';
import {gameSession, settings, usedCombos} from './schema';

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/** Hydrate the latest incomplete session, or null if none exists. */
export async function hydrateSession() {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = db.select().from(gameSession).where(eq(gameSession.rank, '')).limit(1).all();
    return rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/** Persist (insert or update) a game session. Returns the session ID. */
export async function persistSession(data: {
  id?: number;
  difficulty: string;
  finalScore?: number;
  rank?: string;
}): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  try {
    if (data.id) {
      db.update(gameSession)
        .set({
          completedAt: new Date(),
          finalScore: data.finalScore ?? null,
          rank: data.rank ?? null,
        })
        .where(eq(gameSession.id, data.id))
        .run();
      return data.id;
    }
    const result = db
      .insert(gameSession)
      .values({
        startedAt: new Date(),
        difficulty: data.difficulty,
        finalScore: data.finalScore ?? null,
        rank: data.rank ?? null,
      })
      .run();
    return Number(result.lastInsertRowId) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Save a setting by key. */
export async function saveSettings(key: string, value: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    // Upsert: try insert, on conflict update
    const existing = db.select().from(settings).where(eq(settings.key, key)).all();
    if (existing.length > 0) {
      db.update(settings).set({value}).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({key, value}).run();
    }
  } catch {
    // Settings persistence is non-critical
  }
}

/** Load a setting by key. Returns null if not found. */
export async function loadSettings(key: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = db.select().from(settings).where(eq(settings.key, key)).all();
    return rows.length > 0 ? rows[0].value : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Combo tracking
// ---------------------------------------------------------------------------

/** Record an ingredient combo used in a session round. */
export async function recordCombo(sessionId: number, combo: string[]): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    db.insert(usedCombos)
      .values({
        sessionId,
        ingredientCombo: combo,
      })
      .run();
  } catch {
    // Non-critical
  }
}

/** Get all ingredient combos used in a session. */
export async function getUsedCombos(sessionId: number): Promise<string[][]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.select().from(usedCombos).where(eq(usedCombos.sessionId, sessionId)).all();
    return rows.map(r => r.ingredientCombo);
  } catch {
    return [];
  }
}
