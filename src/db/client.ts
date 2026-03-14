/**
 * @module db/client
 * Native SQLite client via op-sqlite + Drizzle ORM.
 * No WASM, no SharedArrayBuffer — direct native C++ SQLite.
 */

import {open} from '@op-engineering/op-sqlite';
import {drizzle} from 'drizzle-orm/op-sqlite';
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

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const opsqliteDb = open({name: 'willitblow.db'});
  opsqliteDb.execute(MIGRATION_SQL);
  _db = drizzle(opsqliteDb, {schema});
  return _db;
}

export function resetDbClient() {
  _db = null;
}
