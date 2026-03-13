/**
 * @module db/client
 * Drizzle ORM client for the Will It Blow? SQLite persistence layer.
 * Adapted from grovekeeper's db/client.ts pattern.
 *
 * Uses expo-sqlite on ALL platforms including web (via WASM + SharedArrayBuffer).
 * Web support requires:
 * - metro.config.js: wasm in assetExts + COEP/COOP middleware
 * - public/coi-serviceworker.js: enables SharedArrayBuffer on GitHub Pages
 * - app.json: expo-sqlite plugin
 *
 * Only returns null in test environment or if expo-sqlite genuinely fails to init.
 */

import * as schema from './schema';

type DrizzleDb = ReturnType<typeof import('drizzle-orm/expo-sqlite').drizzle>;

let _db: DrizzleDb | null = null;
let _initAttempted = false;

/**
 * Raw SQL for creating all 5 tables. Each uses
 * CREATE TABLE IF NOT EXISTS for idempotency.
 */
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

/**
 * Get the drizzle database instance. Works on native AND web
 * (web uses expo-sqlite WASM via SharedArrayBuffer).
 *
 * On first successful init, runs migration SQL to create all 5 tables.
 * Throws if expo-sqlite fails — persistence is a hard requirement.
 * Only returns null in Jest test environment (no WASM available).
 */
export function getDb(): DrizzleDb {
  if (_db) return _db;
  if (_initAttempted) {
    throw new Error(
      '[db] expo-sqlite already failed to initialize. Check SharedArrayBuffer support.',
    );
  }
  _initAttempted = true;

  // In test environment, skip — no WASM runtime
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    throw new Error('[db] expo-sqlite not available in test environment');
  }

  try {
    const {drizzle} = require('drizzle-orm/expo-sqlite');
    const {openDatabaseSync} = require('expo-sqlite');
    const expoDb = openDatabaseSync('willitblow.db');

    // Run migration SQL to create tables (idempotent)
    expoDb.execSync(MIGRATION_SQL);

    _db = drizzle(expoDb, {schema});
    return _db!;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[db] expo-sqlite init failed: ${msg}\n` +
        'Ensure SharedArrayBuffer is available (COI service worker must be active).\n' +
        'Check: Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy headers.',
    );
  }
}

/**
 * Reset the cached DB instance (useful for testing).
 */
export function resetDbClient(): void {
  _db = null;
  _initAttempted = false;
}
