/**
 * @module db/client
 * SQLite client using the grailguard-proven stack:
 *   @capacitor-community/sqlite → jeep-sqlite (web) → drizzle-orm/sqlite-proxy
 *
 * Single code path for ALL platforms:
 * - Web: jeep-sqlite custom element backed by sql.js + IndexedDB
 * - iOS/Android: native SQLite via the Capacitor plugin
 *
 * Ported from arcade-cabinet/grailguard/src/db/client.ts which runs in
 * production on both iOS and web. The old dual-path sql.js/capacitorAdapter
 * approach had sync/async mismatches and untested shim code — this replaces
 * it with the proven single-path architecture.
 */
import {Capacitor} from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import {drizzle, type SqliteRemoteDatabase} from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const DB_NAME = 'willitblow';
const DB_VERSION = 1;

let sqliteManager: SQLiteConnection | null = null;
let sqliteDb: SQLiteDBConnection | null = null;
let drizzleInstance: SqliteRemoteDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

function isWebPlatform() {
  return Capacitor.getPlatform() === 'web';
}

function getBaseAssetPath() {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}assets`;
}

/**
 * Ensure the jeep-sqlite custom element is registered and appended to
 * the DOM. Only runs on web — native platforms use the plugin directly.
 *
 * The `customElements.whenDefined` await is critical: without it, the
 * capacitor-sqlite connection can race against jeep-sqlite's internal
 * WASM init and produce transaction errors.
 */
async function ensureJeepSqliteElement() {
  if (!isWebPlatform() || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const {defineCustomElements} = await import('jeep-sqlite/loader');
  await defineCustomElements(window);

  let jeepSqlite = document.querySelector('jeep-sqlite');
  if (!jeepSqlite) {
    jeepSqlite = document.createElement('jeep-sqlite');
    jeepSqlite.setAttribute('wasmpath', getBaseAssetPath());
    document.body.appendChild(jeepSqlite);
  }

  await customElements.whenDefined('jeep-sqlite');
}

async function openConnection(): Promise<SQLiteDBConnection> {
  if (sqliteDb) return sqliteDb;

  await ensureJeepSqliteElement();

  if (!sqliteManager) {
    sqliteManager = new SQLiteConnection(CapacitorSQLite);
  }

  if (isWebPlatform()) {
    await sqliteManager.initWebStore();
  }

  const existingConnection = (await sqliteManager.isConnection(DB_NAME, false)).result;
  sqliteDb = existingConnection
    ? await sqliteManager.retrieveConnection(DB_NAME, false)
    : await sqliteManager.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);

  await sqliteDb.open();
  return sqliteDb;
}

function normalizeRows(values: unknown[] | undefined): unknown[] {
  return Array.isArray(values) ? values : [];
}

function rowsToValueArrays(rows: unknown[]): unknown[][] {
  return rows.map(row => {
    if (Array.isArray(row)) return row;
    if (row && typeof row === 'object') return Object.values(row as Record<string, unknown>);
    return [row];
  });
}

// ─── Migration SQL ───────────────────────────────────────────────────

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

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ─── Drizzle instance ────────────────────────────────────────────────

async function createDrizzleInstance() {
  const connection = await openConnection();

  // Run DDL migrations before creating the drizzle instance.
  const statements = splitSqlStatements(MIGRATION_SQL);
  const set = statements.map(statement => ({statement, values: [] as unknown[]}));
  await connection.executeSet(set, false);

  drizzleInstance = drizzle<typeof schema>(
    async (sql, params, method) => {
      switch (method) {
        case 'run': {
          const result = await connection.run(sql, params, false);
          return {rows: result.changes?.values ?? []};
        }
        case 'get': {
          const result = await connection.query(sql, params);
          const rows = rowsToValueArrays(normalizeRows(result.values));
          return {rows: rows[0]} as unknown as {rows: unknown[]};
        }
        case 'values': {
          const result = await connection.query(sql, params);
          return {rows: rowsToValueArrays(normalizeRows(result.values))};
        }
        case 'all':
        default: {
          const result = await connection.query(sql, params);
          return {rows: rowsToValueArrays(normalizeRows(result.values))};
        }
      }
    },
    {schema},
  );
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Initialize the database. Safe to call multiple times — cached.
 */
export async function initDatabase(): Promise<void> {
  if (drizzleInstance) return;
  if (!initPromise) {
    initPromise = createDrizzleInstance().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

/** Persist web IndexedDB store. No-op on native. */
export async function persistDatabase(): Promise<void> {
  if (!sqliteManager || !sqliteDb || !isWebPlatform()) return;
  await sqliteManager.saveToStore(DB_NAME);
}

/**
 * Async getter — back-compat with existing `getDb()` callers.
 * Calls `initDatabase()` then returns the drizzle proxy instance.
 */
export async function getDb(): Promise<SqliteRemoteDatabase<typeof schema>> {
  await initDatabase();
  if (!drizzleInstance) {
    throw new Error('Database not initialized after initDatabase()');
  }
  return drizzleInstance;
}

/** Reset cached instances (for tests). */
export function resetDbClient() {
  drizzleInstance = null;
  sqliteDb = null;
  sqliteManager = null;
  initPromise = null;
}
