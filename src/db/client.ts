/**
 * @module db/client
 * Dual SQLite client — sql.js (WASM) for web/dev, @capacitor-community/sqlite for native.
 * Exposes an async `getDb()` because sql.js must load its WASM binary before use.
 */

import type {SQLJsDatabase} from 'drizzle-orm/sql-js';
import * as schema from './schema';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS "game_session" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "started_at" integer NOT NULL,
  "completed_at" integer,
  "difficulty" text NOT NULL DEFAULT 'medium',
  "final_score" real,
  "rank" text
);

CREATE TABLE IF NOT EXISTS "round_scores" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "session_id" integer NOT NULL REFERENCES "game_session"("id"),
  "round_number" integer NOT NULL,
  "phase_scores" text,
  "demand_bonus" real,
  "round_total" real
);

CREATE TABLE IF NOT EXISTS "used_combos" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "session_id" integer NOT NULL REFERENCES "game_session"("id"),
  "ingredient_combo" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "player_stats" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "total_games_played" integer NOT NULL DEFAULT 0,
  "best_score" real,
  "best_rank" text,
  "total_play_time" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);
`;

type DbInstance = SQLJsDatabase<typeof schema>;

let dbInstance: DbInstance | null = null;
let dbPromise: Promise<DbInstance> | null = null;

/**
 * Get the Drizzle database instance. Lazily initializes the correct driver:
 * - Native (Capacitor): @capacitor-community/sqlite
 * - Web/dev/test: sql.js (WASM SQLite in browser)
 *
 * The promise is cached so concurrent callers share the same init.
 */
export async function getDb(): Promise<DbInstance> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = initDb();
  dbInstance = await dbPromise;
  dbPromise = null;
  return dbInstance;
}

async function initDb(): Promise<DbInstance> {
  // Check for Capacitor native platform (iOS/Android)
  const isNative = await detectNativePlatform();

  if (isNative) {
    const {createCapacitorDb} = await import('./capacitorAdapter');
    // Encryption is set to 'no-encryption' in the adapter. This is intentional:
    // this is a single-player game and the database only stores local high scores
    // and gameplay stats — no sensitive or personal data requiring encryption.
    const sqliteDb = await createCapacitorDb('willitblow');
    await sqliteDb.exec(MIGRATION_SQL);
    const {drizzle} = await import('drizzle-orm/sql-js');
    return drizzle(sqliteDb as any, {schema});
  }

  // Web / dev / test — use sql.js (WASM)
  const initSqlJs = (await import('sql.js')).default;
  const base = import.meta.env.BASE_URL; // '/' locally, '/will-it-blow/' on Pages
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${base}${file}`,
  });
  const sqlJsDb = new SQL.Database();
  sqlJsDb.run(MIGRATION_SQL);
  const {drizzle} = await import('drizzle-orm/sql-js');
  return drizzle(sqlJsDb, {schema});
}

/**
 * Detect whether we're running on a native Capacitor platform.
 * Safely handles environments where @capacitor/core is not available.
 */
async function detectNativePlatform(): Promise<boolean> {
  try {
    const {Capacitor} = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Reset the cached DB instance (useful for tests). */
export function resetDbClient() {
  dbInstance = null;
  dbPromise = null;
}
