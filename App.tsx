import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Platform, SafeAreaView, StyleSheet, View} from 'react-native';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
import {ChallengeTransition} from './src/components/ui/ChallengeTransition';
import {LoadingScreen} from './src/components/ui/LoadingScreen';
import {StrikeCounter} from './src/components/ui/StrikeCounter';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {installGovernor} from './src/dev/GameGovernor';
import {audioEngine} from './src/engine/AudioEngine';
import {useXRModeFromStore} from './src/hooks/useXRMode';
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
const ChoppingHUD = lazy(() =>
  import('./src/components/challenges/ChoppingHUD').then(m => ({
    default: m.ChoppingHUD,
  })),
);
const GrindingHUD = lazy(() =>
  import('./src/components/challenges/GrindingHUD').then(m => ({
    default: m.GrindingHUD,
  })),
);
const StuffingHUD = lazy(() =>
  import('./src/components/challenges/StuffingHUD').then(m => ({
    default: m.StuffingHUD,
  })),
);
const CookingHUD = lazy(() =>
  import('./src/components/challenges/CookingHUD').then(m => ({
    default: m.CookingHUD,
  })),
);
const BlowoutHUD = lazy(() =>
  import('./src/components/challenges/BlowoutHUD').then(m => ({
    default: m.BlowoutHUD,
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
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentChallenge = useGameStore(s => s.currentChallenge);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const {isVR} = useXRModeFromStore();

  // Transition state: show title card between challenges
  const [transitioning, setTransitioning] = useState(false);
  const prevChallengeRef = useRef(currentChallenge);

  useEffect(() => {
    // Show transition card when arriving at a new station (challenge > 0)
    // Triggers when challengeTriggered becomes true after advancing to a new challenge
    if (
      gameStatus === 'playing' &&
      challengeTriggered &&
      currentChallenge > 0 &&
      currentChallenge > prevChallengeRef.current
    ) {
      setTransitioning(true);
    }
    if (challengeTriggered) {
      prevChallengeRef.current = currentChallenge;
    }
  }, [currentChallenge, gameStatus, challengeTriggered]);

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

  const showChallenge = gameStatus === 'playing' && !transitioning && challengeTriggered;
  const isIngredientChallenge = showChallenge && currentChallenge === 0;
  const isChoppingChallenge = showChallenge && currentChallenge === 1;
  const isGrindingChallenge = showChallenge && currentChallenge === 2;
  const isStuffingChallenge = showChallenge && currentChallenge === 3;
  const isCookingChallenge = showChallenge && currentChallenge === 4;
  const isBlowoutChallenge = showChallenge && currentChallenge === 5;
  const isTastingChallenge = showChallenge && currentChallenge === 6;

  // In VR mode, HUDs are rendered as world-space panels inside the Canvas
  // by VRHUDLayer. Skip the 2D overlay to avoid duplicate UI.
  // Transition cards and bridge-pattern challenges still render in 2D
  // (they use full-screen interaction patterns that work in VR via dom-overlay).
  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="game-overlay">
      {/* Challenge transition title card */}
      {gameStatus === 'playing' && challengeTriggered && transitioning && (
        <ChallengeTransition
          challengeIndex={currentChallenge}
          onComplete={handleTransitionComplete}
        />
      )}

      {showChallenge && !isVR && (
        <Suspense fallback={<ChunkFallback />}>
          <ChallengeHeader />
          <StrikeCounter />
          {/* Challenge overlays — lazy-loaded, one at a time */}
          {isIngredientChallenge && (
            <IngredientChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
          {isChoppingChallenge && <ChoppingHUD />}
          {isGrindingChallenge && <GrindingHUD />}
          {isStuffingChallenge && <StuffingHUD />}
          {isCookingChallenge && <CookingHUD />}
          {isBlowoutChallenge && <BlowoutHUD />}
          {isTastingChallenge && (
            <TastingChallenge onComplete={completeChallenge} onReaction={handleReaction} />
          )}
        </Suspense>
      )}

      {(gameStatus === 'victory' || gameStatus === 'defeat') && !isVR && (
        <Suspense fallback={<ChunkFallback />}>
          <GameOverScreen />
        </Suspense>
      )}
    </View>
  );
};

const MobileJoystick = lazy(() =>
  import('./src/components/controls/MobileJoystick').then(m => ({default: m.MobileJoystick})),
);

export default function App() {
  const appPhase = useGameStore(s => s.appPhase);

  // Shared refs for mobile FPS controls (joystick writes, FPSController reads)
  const joystickRef = useRef({x: 0, y: 0});
  const lookDeltaRef = useRef({dx: 0, dy: 0});
  // Detect touch-primary device (native app OR mobile web browser)
  const isTouchDevice =
    Platform.OS !== 'web' ||
    (typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0);

  // Start ambient horror loop when entering gameplay, stop on exit
  useEffect(() => {
    if (appPhase === 'playing') {
      audioEngine.startAmbientDrone();
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
          <GameWorld
            joystickRef={isTouchDevice ? joystickRef : undefined}
            lookDeltaRef={isTouchDevice ? lookDeltaRef : undefined}
          />
          <GameUI />
          {isTouchDevice && (
            <MobileJoystick
              joystickRef={joystickRef}
              onLookDrag={(dx, dy) => {
                lookDeltaRef.current.dx += dx;
                lookDeltaRef.current.dy += dy;
              }}
            />
          )}
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
