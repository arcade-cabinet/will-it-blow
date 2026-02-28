import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
import {ChallengeTransition} from './src/components/ui/ChallengeTransition';
import {LoadingScreen} from './src/components/ui/LoadingScreen';
import {StrikeCounter} from './src/components/ui/StrikeCounter';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {installGovernor} from './src/dev/GameGovernor';
import {audioEngine} from './src/engine/AudioEngine';
import {useGameStore} from './src/store/gameStore';

// ── Dynamic imports for code splitting ──────────────────────────
// Metro splits these into separate chunks on web builds,
// so the menu loads instantly without pulling in Three.js/R3F.

const GameWorld = lazy(() =>
  import('./src/components/GameWorld').then(m => ({default: m.GameWorld})),
);
const GameOverScreen = lazy(() =>
  import('./src/components/ui/GameOverScreen').then(m => ({default: m.GameOverScreen})),
);

// Challenge components — only one active at a time
const IngredientChallenge = lazy(() =>
  import('./src/components/challenges/IngredientChallenge').then(m => ({
    default: m.IngredientChallenge,
  })),
);
const GrindingChallenge = lazy(() =>
  import('./src/components/challenges/GrindingChallenge').then(m => ({
    default: m.GrindingChallenge,
  })),
);
const StuffingChallenge = lazy(() =>
  import('./src/components/challenges/StuffingChallenge').then(m => ({
    default: m.StuffingChallenge,
  })),
);
const CookingChallenge = lazy(() =>
  import('./src/components/challenges/CookingChallenge').then(m => ({
    default: m.CookingChallenge,
  })),
);
const TastingChallenge = lazy(() =>
  import('./src/components/challenges/TastingChallenge').then(m => ({
    default: m.TastingChallenge,
  })),
);

// Install dev-only test harness (gated behind __DEV__, no-op in production)
installGovernor();

/** Dark placeholder while lazy chunks load — matches app background. */
const ChunkFallback = () => <View style={styles.chunkFallback} />;

const GameUI = () => {
  const {gameStatus, currentChallenge, completeChallenge, setMrSausageReaction} = useGameStore();

  // Transition state: show title card between challenges
  const [transitioning, setTransitioning] = useState(false);
  const prevChallengeRef = useRef(currentChallenge);

  useEffect(() => {
    // Show transition card when advancing to a new challenge (not on first mount)
    if (
      gameStatus === 'playing' &&
      currentChallenge > prevChallengeRef.current &&
      currentChallenge > 0
    ) {
      setTransitioning(true);
    }
    prevChallengeRef.current = currentChallenge;
  }, [currentChallenge, gameStatus]);

  // Reset transition state when returning to menu or starting new game
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setTransitioning(false);
      prevChallengeRef.current = 0;
    }
  }, [gameStatus]);

  const handleTransitionComplete = useCallback(() => {
    setTransitioning(false);
  }, []);

  const handleReaction = useCallback(
    (reaction: Parameters<typeof setMrSausageReaction>[0]) => {
      setMrSausageReaction(reaction);
    },
    [setMrSausageReaction],
  );

  const showChallenge = gameStatus === 'playing' && !transitioning;
  const isIngredientChallenge = showChallenge && currentChallenge === 0;
  const isGrindingChallenge = showChallenge && currentChallenge === 1;
  const isStuffingChallenge = showChallenge && currentChallenge === 2;
  const isCookingChallenge = showChallenge && currentChallenge === 3;
  const isTastingChallenge = showChallenge && currentChallenge === 4;

  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="game-overlay">
      {/* Challenge transition title card */}
      {gameStatus === 'playing' && transitioning && (
        <ChallengeTransition
          challengeIndex={currentChallenge}
          onComplete={handleTransitionComplete}
        />
      )}

      {gameStatus === 'playing' && !transitioning && (
        <Suspense fallback={<ChunkFallback />}>
          <ChallengeHeader />
          <StrikeCounter />
          {/* Challenge overlays — lazy-loaded, one at a time */}
          {isIngredientChallenge && (
            <IngredientChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
          {isGrindingChallenge && (
            <GrindingChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
          {isStuffingChallenge && (
            <StuffingChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
          {isCookingChallenge && (
            <CookingChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
          {isTastingChallenge && (
            <TastingChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
        </Suspense>
      )}

      {(gameStatus === 'victory' || gameStatus === 'defeat') && (
        <Suspense fallback={<ChunkFallback />}>
          <GameOverScreen />
        </Suspense>
      )}
    </View>
  );
};

export default function App() {
  const appPhase = useGameStore(s => s.appPhase);

  // Start/stop ambient horror drone based on game phase
  useEffect(() => {
    if (appPhase === 'playing') {
      audioEngine.startAmbientDrone();
    } else {
      audioEngine.stopAmbientDrone();
    }
    return () => {
      audioEngine.stopAmbientDrone();
    };
  }, [appPhase]);

  // Prefetch heavy chunks while the loading screen is showing.
  // By the time kitchen.glb finishes downloading, the GameWorld JS
  // chunk (Three.js + R3F + stations) is already cached.
  useEffect(() => {
    if (appPhase === 'loading') {
      import('./src/components/GameWorld');
      import('./src/components/challenges/IngredientChallenge');
    }
  }, [appPhase]);

  return (
    <SafeAreaView style={styles.container}>
      {appPhase === 'menu' && <TitleScreen />}
      {appPhase === 'loading' && <LoadingScreen />}
      {appPhase === 'playing' && (
        <Suspense fallback={<ChunkFallback />}>
          <GameWorld />
          <GameUI />
        </Suspense>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  chunkFallback: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
