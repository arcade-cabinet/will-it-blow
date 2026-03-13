/**
 * @module db/schema
 * Drizzle ORM table definitions for the Will It Blow? SQLite persistence layer.
 * Tables: game_session, round_scores, used_combos, player_stats, settings.
 */
import {integer, real, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const gameSession = sqliteTable('game_session', {
  id: integer('id').primaryKey({autoIncrement: true}),
  startedAt: integer('started_at', {mode: 'timestamp'}).notNull(),
  completedAt: integer('completed_at', {mode: 'timestamp'}),
  difficulty: text('difficulty').notNull(),
  finalScore: real('final_score'),
  rank: text('rank'),
});

export const roundScores = sqliteTable('round_scores', {
  id: integer('id').primaryKey({autoIncrement: true}),
  sessionId: integer('session_id')
    .notNull()
    .references(() => gameSession.id),
  roundNumber: integer('round_number').notNull(),
  phaseScores: text('phase_scores', {mode: 'json'}).$type<Record<string, number>>(),
  demandBonus: real('demand_bonus'),
  roundTotal: real('round_total'),
});

export const usedCombos = sqliteTable('used_combos', {
  id: integer('id').primaryKey({autoIncrement: true}),
  sessionId: integer('session_id')
    .notNull()
    .references(() => gameSession.id),
  ingredientCombo: text('ingredient_combo', {mode: 'json'}).$type<string[]>().notNull(),
});

export const playerStats = sqliteTable('player_stats', {
  id: integer('id').primaryKey({autoIncrement: true}),
  totalGamesPlayed: integer('total_games_played').notNull().default(0),
  bestScore: real('best_score'),
  bestRank: text('best_rank'),
  totalPlayTime: integer('total_play_time').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
