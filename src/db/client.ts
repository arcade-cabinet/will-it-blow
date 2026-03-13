/**
 * @module db/client
 * Drizzle ORM client for the Will It Blow? SQLite persistence layer.
 * Uses expo-sqlite as the underlying driver.
 *
 * Returns null when SQLite is unavailable (e.g., web platform or test env).
 * All consumers must handle the null case gracefully.
 */

let _db: ReturnType<typeof import('drizzle-orm/expo-sqlite').drizzle> | null = null;

/**
 * Returns the Drizzle database instance, lazily initialized.
 * Returns null if expo-sqlite is unavailable (web, tests, etc.).
 */
export function getDb() {
  if (_db) return _db;
  try {
    // Dynamic require to avoid bundling errors on web
    const {openDatabaseSync} = require('expo-sqlite');
    const {drizzle} = require('drizzle-orm/expo-sqlite');
    const sqlite = openDatabaseSync('willitblow.db');
    _db = drizzle(sqlite);
    return _db;
  } catch {
    return null;
  }
}

/**
 * Reset the cached DB instance (useful for testing).
 */
export function resetDbClient(): void {
  _db = null;
}
