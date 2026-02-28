import {useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {CookingChallenge} from './src/components/challenges/CookingChallenge';
import {GrindingChallenge} from './src/components/challenges/GrindingChallenge';
import {IngredientChallenge} from './src/components/challenges/IngredientChallenge';
import {StuffingChallenge} from './src/components/challenges/StuffingChallenge';
import {TastingChallenge} from './src/components/challenges/TastingChallenge';
import {GameWorld} from './src/components/GameWorld';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
import {ChallengeTransition} from './src/components/ui/ChallengeTransition';
import {GameOverScreen} from './src/components/ui/GameOverScreen';
import {LoadingScreen} from './src/components/ui/LoadingScreen';
import {StrikeCounter} from './src/components/ui/StrikeCounter';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {installGovernor} from './src/dev/GameGovernor';
import {audioEngine} from './src/engine/AudioEngine';
import {useGameStore} from './src/store/gameStore';

// Install dev-only test harness (gated behind __DEV__, no-op in production)
installGovernor();

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
        <>
          <ChallengeHeader />
          <StrikeCounter />
          {/* Challenge overlays */}
          {isIngredientChallenge && (
            <IngredientChallenge
              onComplete={completeChallenge}
              onReaction={handleReaction}
            />
          )}
          {isGrindingChallenge && (
            <GrindingChallenge
              onComplete={completeChallenge}
              onReaction={handleReaction}
            />
          )}
          {isStuffingChallenge && (
            <StuffingChallenge
              onComplete={completeChallenge}
              onReaction={handleReaction}
            />
          )}
          {isCookingChallenge && (
            <CookingChallenge
              onComplete={completeChallenge}
              onReaction={handleReaction}
            />
          )}
          {isTastingChallenge && (
            <TastingChallenge
              onComplete={completeChallenge}
              onReaction={handleReaction}
            />
          )}
        </>
      )}

      {(gameStatus === 'victory' || gameStatus === 'defeat') && <GameOverScreen />}
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

  return (
    <SafeAreaView style={styles.container}>
      {appPhase === 'menu' && <TitleScreen />}
      {appPhase === 'loading' && <LoadingScreen />}
      {appPhase === 'playing' && (
        <>
          <GameWorld />
          <GameUI />
        </>
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
});
