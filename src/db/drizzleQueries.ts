/**
 * @module db/drizzleQueries
 * Drizzle ORM query functions — native SQLite via op-sqlite.
 */
import {eq} from 'drizzle-orm';
import {getDb} from './client';
import {gameSession, settings, usedCombos} from './schema';

export async function hydrateSession() {
  const db = getDb();
  const rows = await db.select().from(gameSession).where(eq(gameSession.rank, '')).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function persistSession(data: {
  id?: number;
  difficulty: string;
  finalScore?: number;
  rank?: string;
}): Promise<number | null> {
  const db = getDb();
  if (data.id) {
    await db
      .update(gameSession)
      .set({completedAt: new Date(), finalScore: data.finalScore ?? null, rank: data.rank ?? null})
      .where(eq(gameSession.id, data.id));
    return data.id;
  }
  const result = await db
    .insert(gameSession)
    .values({startedAt: new Date(), difficulty: data.difficulty, finalScore: data.finalScore ?? null, rank: data.rank ?? null});
  return null; // op-sqlite doesn't return lastInsertRowId via Drizzle the same way
}

export async function saveSettings(key: string, value: string): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(settings).where(eq(settings.key, key));
  if (existing.length > 0) {
    await db.update(settings).set({value}).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({key, value});
  }
}

export async function loadSettings(key: string): Promise<string | null> {
  const db = getDb();
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows.length > 0 ? rows[0].value : null;
}

export async function recordCombo(sessionId: number, combo: string[]): Promise<void> {
  const db = getDb();
  await db.insert(usedCombos).values({sessionId, ingredientCombo: combo});
}

export async function getUsedCombos(sessionId: number): Promise<string[][]> {
  const db = getDb();
  const rows = await db.select().from(usedCombos).where(eq(usedCombos.sessionId, sessionId));
  return rows.map(r => r.ingredientCombo);
}
