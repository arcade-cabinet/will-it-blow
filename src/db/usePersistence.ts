/**
 * @module usePersistence
 * Hooks that connect Koota ECS state to expo-sqlite persistence.
 *
 * - Auto-saves session when a round completes (gamePhase === 'DONE')
 * - Hydrates session on app start
 * - Persists settings changes
 */

import {useEffect, useRef} from 'react';
import {useGameStore} from '../ecs/hooks';
import {hydrateSession, loadSettings, persistSession, saveSettings} from './drizzleQueries';

/** Session ID for the current game (null if not yet persisted). */
let currentSessionId: number | null = null;

/**
 * Call once at app level. Hydrates the last session on mount,
 * auto-persists when rounds complete.
 */
export function usePersistence() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const appPhase = useGameStore(s => s.appPhase);
  const finalScore = useGameStore(s => s.finalScore);
  const difficulty = useGameStore(s => s.difficulty);
  const prevPhaseRef = useRef(gamePhase);

  // Hydrate on mount
  useEffect(() => {
    (async () => {
      const session = await hydrateSession();
      if (session) {
        currentSessionId = session.id;
      }
    })();
  }, []);

  // Create session when game starts
  useEffect(() => {
    if (appPhase === 'playing' && !currentSessionId) {
      (async () => {
        const id = await persistSession({difficulty});
        currentSessionId = id;
      })();
    }
    if (appPhase === 'title') {
      currentSessionId = null;
    }
  }, [appPhase, difficulty]);

  // Persist score when round completes
  useEffect(() => {
    if (
      prevPhaseRef.current !== 'DONE' &&
      gamePhase === 'DONE' &&
      currentSessionId &&
      finalScore?.calculated
    ) {
      const rank =
        finalScore.totalScore >= 92
          ? 'S'
          : finalScore.totalScore >= 75
            ? 'A'
            : finalScore.totalScore >= 50
              ? 'B'
              : 'F';
      persistSession({
        id: currentSessionId,
        difficulty,
        finalScore: finalScore.totalScore,
        rank,
      });
    }
    prevPhaseRef.current = gamePhase;
  }, [gamePhase, finalScore, difficulty]);
}

/** Save a setting value (fire-and-forget). */
export function persistSetting(key: string, value: string) {
  saveSettings(key, value);
}

/** Load a setting value. */
export async function loadSetting(key: string): Promise<string | null> {
  return loadSettings(key);
}
