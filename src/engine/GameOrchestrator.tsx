import {useEffect} from 'react';
import {type GamePhase, useGameStore} from '../ecs/hooks';

export const PHASES: GamePhase[] = [
  'SELECT_INGREDIENTS',
  'CHOPPING',
  'FILL_GRINDER',
  'GRINDING',
  'MOVE_BOWL',
  'ATTACH_CASING',
  'STUFFING',
  'TIE_CASING',
  'BLOWOUT',
  'MOVE_SAUSAGE',
  'MOVE_PAN',
  'COOKING',
  'DONE',
];

/** Returns the next phase in the sequence, or null if at the end. */
export function nextPhase(current: GamePhase): GamePhase | null {
  const idx = PHASES.indexOf(current);
  if (idx === -1 || idx === PHASES.length - 1) return null;
  return PHASES[idx + 1];
}

/** Returns the previous phase in the sequence, or null if at the start. */
export function prevPhase(current: GamePhase): GamePhase | null {
  const idx = PHASES.indexOf(current);
  if (idx <= 0) return null;
  return PHASES[idx - 1];
}

export function GameOrchestrator() {
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const generateDemands = useGameStore(state => state.generateDemands);
  const calculateFinalScore = useGameStore(state => state.calculateFinalScore);

  // Initialize demands when game starts
  useEffect(() => {
    generateDemands();
  }, [generateDemands]);

  // Trigger score calculation when reaching the DONE phase
  useEffect(() => {
    if (gamePhase === 'DONE') {
      calculateFinalScore();
    }
  }, [gamePhase, calculateFinalScore]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Dev shortcut to progress through the game phases
      if (e.key === 'n' && !introActive && posture === 'standing') {
        const currentIndex = PHASES.indexOf(gamePhase);
        if (currentIndex < PHASES.length - 1) {
          setGamePhase(PHASES[currentIndex + 1]);
        }
      }

      // Dev shortcut to regress phases
      if (e.key === 'p' && !introActive && posture === 'standing') {
        const currentIndex = PHASES.indexOf(gamePhase);
        if (currentIndex > 0) {
          setGamePhase(PHASES[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introActive, posture, gamePhase, setGamePhase]);
  return null;
}
