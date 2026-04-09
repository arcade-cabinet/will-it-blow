/**
 * @module db/client
 * SQLite client using the grailguard-proven stack:
 *   @capacitor-community/sqlite → jeep-sqlite (web) → drizzle-orm/sqlite-proxy
 *
 * Single code path for ALL platforms:
 * - Web: jeep-sqlite custom element backed by sql.js + IndexedDB
 * - iOS/Android: native SQLite via the Capacitor plugin
 *
 * IMPORTANT: all heavy imports (@capacitor/core, @capacitor-community/sqlite,
 * jeep-sqlite/loader, drizzle-orm/sqlite-proxy) are LAZY (dynamic import)
 * so that modules which transitively import db/client don't trigger WASM
 * loading at module-evaluation time. This is critical for browser tests
 * where no WASM files are served.
 */
import type {SqliteRemoteDatabase} from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const DB_NAME = 'willitblow';
const DB_VERSION = 1;

// Lazy-loaded singletons — populated on first initDatabase() call.
let sqliteManager: any = null;
let sqliteDb: any = null;
let drizzleInstance: SqliteRemoteDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

async function isWebPlatform(): Promise<boolean> {
  const {Capacitor} = await import('@capacitor/core');
  return Capacitor.getPlatform() === 'web';
}

function getBaseAssetPath(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}assets`;
}

async function ensureJeepSqliteElement(): Promise<void> {
  if (
    !(await isWebPlatform()) ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
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

async function openConnection(): Promise<any> {
  if (sqliteDb) return sqliteDb;

  await ensureJeepSqliteElement();

  const {CapacitorSQLite, SQLiteConnection} = await import('@capacitor-community/sqlite');

  if (!sqliteManager) {
    sqliteManager = new SQLiteConnection(CapacitorSQLite);
  }

  if (await isWebPlatform()) {
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

async function createDrizzleInstance(): Promise<void> {
  const connection = await openConnection();

  const statements = splitSqlStatements(MIGRATION_SQL);
  const set = statements.map(statement => ({statement, values: [] as unknown[]}));
  await connection.executeSet(set, false);

  const {drizzle} = await import('drizzle-orm/sqlite-proxy');

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

export async function initDatabase(): Promise<void> {
  if (drizzleInstance) return;
  if (!initPromise) {
    initPromise = createDrizzleInstance().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

export async function persistDatabase(): Promise<void> {
  if (!sqliteManager || !sqliteDb || !(await isWebPlatform())) return;
  await sqliteManager.saveToStore(DB_NAME);
}

export async function getDb(): Promise<SqliteRemoteDatabase<typeof schema>> {
  await initDatabase();
  if (!drizzleInstance) {
    throw new Error('Database not initialized after initDatabase()');
  }
  return drizzleInstance;
}

export const db = new Proxy({} as SqliteRemoteDatabase<typeof schema>, {
  get(_target, prop) {
    if (!drizzleInstance) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return (drizzleInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function resetDbClient(): void {
  drizzleInstance = null;
  sqliteDb = null;
  sqliteManager = null;
  initPromise = null;
}
