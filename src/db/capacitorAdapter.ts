/**
 * @module db/capacitorAdapter
 * Thin adapter wrapping @capacitor-community/sqlite to expose a sql.js-compatible
 * Database interface for Drizzle ORM's sql-js driver.
 *
 * Only imported at runtime on native Capacitor platforms (iOS/Android).
 */

import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

/**
 * Create a sql.js-compatible Database wrapper backed by Capacitor SQLite.
 * The returned object satisfies the subset of `sql.js.Database` that
 * `drizzle-orm/sql-js` actually calls at runtime.
 */
export async function createCapacitorDb(dbName: string) {
  const db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
  await db.open();

  return {
    run(sql: string, params?: unknown[]) {
      return db.run(sql, params as (string | number | null)[] | undefined);
    },
    exec(sql: string) {
      return db.execute(sql);
    },
    prepare(sql: string) {
      // Drizzle's sql-js driver calls prepare().bind().step()/getAsObject()/free()
      // for SELECT queries. Capacitor SQLite doesn't expose a statement API,
      // so we execute the query eagerly in bind() and iterate results via step().
      let results: any[] = [];
      return {
        bind(params?: unknown[]) {
          const res = db.query(sql, params as any[]);
          results = res.values || [];
        },
        step() {
          return results.length > 0;
        },
        getAsObject() {
          return results.shift() || {};
        },
        get() {
          return results.shift() || {};
        },
        free() {
          results = [];
        },
      };
    },
  };
}
