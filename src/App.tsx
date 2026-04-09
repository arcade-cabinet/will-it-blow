/**
 * @module App
 * Root application component — manages app phase routing (title -> playing -> results)
 * and composes the 3D Canvas, physics world, stations, and controls.
 *
 * Task 3: Code-split via React.lazy() so the R3F game scene loads in
 * the background while the player reads the title screen. Title screen
 * + difficulty selector render immediately from the main bundle.
 * First paint goes from ~4s to <1s on mobile.
 */
import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {LoadingScreen} from './components/ui/LoadingScreen';
import {TitleScreen} from './components/ui/TitleScreen';
import {usePersistence} from './db/usePersistence';
import {useGameStore} from './ecs/hooks';

// Lazy-load the heavy GameScene (Canvas + Physics + all stations).
// This module contains all R3F, Three.js, Rapier, and station imports.
// Title screen renders instantly; GameScene downloads in parallel.
const GameScene = lazy(() => import('./GameScene'));

/** Type for the between-rounds TV broadcast signal. */
export type BroadcastSignal = {current: number; total: number} | null;

/** Wrapper that reads score state from ECS and passes props to GameOverScreen. */
function GameOverScreenWrapper() {
  // Lazy import GameOverScreen too — it's only needed at results phase
  const [GameOverScreen, setGameOverScreen] = useState<React.ComponentType<any> | null>(null);
  const finalScore = useGameStore(s => s.finalScore);
  const playerDecisions = useGameStore(s => s.playerDecisions);
  const startNewGame = useGameStore(s => s.startNewGame);
  const returnToMenu = useGameStore(s => s.returnToMenu);

  useEffect(() => {
    import('./components/ui/GameOverScreen').then(m => {
      setGameOverScreen(() => m.GameOverScreen);
    });
  }, []);

  const totalScore = finalScore?.totalScore ?? 0;
  const rank = totalScore >= 92 ? 'S' : totalScore >= 75 ? 'A' : totalScore >= 50 ? 'B' : 'F';

  if (!GameOverScreen) return <LoadingScreen />;

  return (
    <GameOverScreen
      rank={rank}
      totalScore={totalScore}
      breakdown={[{label: 'Final Score', score: totalScore}]}
      demandBonus={0}
      flairPoints={playerDecisions.flairPoints}
      onPlayAgain={() => startNewGame()}
      onMenu={() => returnToMenu()}
    />
  );
}

export function App() {
  const appPhase = useGameStore(state => state.appPhase);
  const gamePhase = useGameStore(state => state.gamePhase);
  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const nextRound = useGameStore(state => state.nextRound);

  // Track whether we're waiting for the presentation to finish before
  // triggering the diegetic between-rounds broadcast on the TV.
  const waitingForPresentationRef = useRef(false);

  // Between-rounds broadcast: after presentation completes and more rounds
  // remain, the TV shows "ROUND X OF Y" for 2.5 seconds, then nextRound().
  // No HTML overlay — the transition is entirely diegetic via the TV.
  const [betweenRounds, setBetweenRounds] = useState(false);

  usePersistence();

  // Derive broadcast signal from betweenRounds state. Passed as a prop
  // to GameScene so it crosses the Canvas boundary reactively.
  const broadcastSignal: BroadcastSignal = betweenRounds
    ? {current: currentRound + 1, total: totalRounds}
    : null;

  // Module-level callback for PresentationFlow completion signal.
  // This crosses the Canvas boundary — set by GameScene internally.
  const presentationCompleteRef = useRef<(() => void) | null>(null);

  // When DONE phase is reached with rounds remaining, register a
  // callback for PresentationFlow completion. When it fires, start
  // the diegetic between-rounds TV broadcast instead of the old overlay.
  useEffect(() => {
    if (gamePhase === 'DONE' && currentRound < totalRounds && appPhase === 'playing') {
      waitingForPresentationRef.current = true;
      presentationCompleteRef.current = () => {
        waitingForPresentationRef.current = false;
        setBetweenRounds(true);
      };
    }
  }, [gamePhase, currentRound, totalRounds, appPhase]);

  // When betweenRounds starts, auto-advance after 2.5 seconds
  // (the TV broadcast plays for this duration, then the next round begins).
  useEffect(() => {
    if (!betweenRounds) return;
    const timer = setTimeout(() => {
      setBetweenRounds(false);
      nextRound();
    }, 2500);
    return () => clearTimeout(timer);
  }, [betweenRounds, nextRound]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {appPhase === 'title' && <TitleScreen />}

      {appPhase === 'playing' && (
        <Suspense fallback={<LoadingScreen />}>
          <GameScene broadcastRound={broadcastSignal} />
        </Suspense>
      )}

      {appPhase === 'results' && <GameOverScreenWrapper />}
    </div>
  );
}
