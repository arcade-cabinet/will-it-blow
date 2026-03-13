import {useEffect} from 'react';
import {type GamePhase, useGameStore} from '../store/gameStore';

const PHASES: GamePhase[] = [
  'SELECT_INGREDIENTS',
  'CHOPPING',
  'FILL_GRINDER',
  'GRINDING',
  'MOVE_BOWL',
  'ATTACH_CASING',
  'STUFFING',
  'MOVE_SAUSAGE',
  'MOVE_PAN',
  'COOKING',
  'DONE'
];

export function GameOrchestrator() {
  const introActive = useGameStore(state => state.introActive);
  const posture = useGameStore(state => state.posture);
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);

  useEffect(() => {
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
