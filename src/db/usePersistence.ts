/**
 * @module usePersistence
 * Wires Koota ECS state to op-sqlite persistence.
 * Auto-saves when rounds complete. Hydrates on app start.
 */

import {useEffect, useRef} from 'react';
import {useGameStore} from '../ecs/hooks';
import {persistSession} from './drizzleQueries';

let currentSessionId: number | null = null;

export function usePersistence() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const appPhase = useGameStore(s => s.appPhase);
  const finalScore = useGameStore(s => s.finalScore);
  const difficulty = useGameStore(s => s.difficulty);
  const prevPhaseRef = useRef(gamePhase);

  // Create session when game starts
  useEffect(() => {
    if (appPhase === 'playing' && !currentSessionId) {
      persistSession({difficulty}).then(id => {
        currentSessionId = id;
      });
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
