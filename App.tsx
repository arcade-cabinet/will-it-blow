import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Platform, SafeAreaView, StyleSheet, View} from 'react-native';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
import {ChallengeTransition} from './src/components/ui/ChallengeTransition';
import {LoadingScreen} from './src/components/ui/LoadingScreen';
import {StrikeCounter} from './src/components/ui/StrikeCounter';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {installGovernor} from './src/dev/GameGovernor';
import {audioEngine} from './src/engine/AudioEngine';
import {getChallengeIndex} from './src/engine/ChallengeManifest';
import {useXRModeFromStore} from './src/hooks/useXRMode';
import {useGameStore} from './src/store/gameStore';

// Challenge index constants derived from the manifest — no magic numbers
const CHALLENGE_IDX_INGREDIENTS = getChallengeIndex('ingredients');
const CHALLENGE_IDX_CHOPPING = getChallengeIndex('chopping');
const CHALLENGE_IDX_GRINDING = getChallengeIndex('grinding');
const CHALLENGE_IDX_STUFFING = getChallengeIndex('stuffing');
const CHALLENGE_IDX_COOKING = getChallengeIndex('cooking');
const CHALLENGE_IDX_BLOWOUT = getChallengeIndex('blowout');
const CHALLENGE_IDX_TASTING = getChallengeIndex('tasting');

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
  const isIngredientChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_INGREDIENTS;
  const isChoppingChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_CHOPPING;
  const isGrindingChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_GRINDING;
  const isStuffingChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_STUFFING;
  const isCookingChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_COOKING;
  const isBlowoutChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_BLOWOUT;
  const isTastingChallenge = showChallenge && currentChallenge === CHALLENGE_IDX_TASTING;

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

const SwipeFPSControls = lazy(() =>
  import('./src/components/controls/SwipeFPSControls').then(m => ({default: m.SwipeFPSControls})),
);

/** Dark overlay that fades out once the 3D scene renders its first frame.
 *  Prevents the black flash between LoadingScreen unmount and Canvas init. */
const SceneReadyGate = () => {
  const sceneReady = useGameStore(s => s.sceneReady);
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sceneReady) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [sceneReady]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.sceneReadyGate, {opacity}]}
      pointerEvents={sceneReady ? 'none' : 'auto'}
    />
  );
};

export default function App() {
  const appPhase = useGameStore(s => s.appPhase);
  const gameStatus = useGameStore(s => s.gameStatus);

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
          <SceneReadyGate />
          {isTouchDevice && gameStatus === 'playing' && (
            <SwipeFPSControls
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
  sceneReadyGate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    zIndex: 100,
  },
});
