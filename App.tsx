import {useCallback, useEffect} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {CookingChallenge} from './src/components/challenges/CookingChallenge';
import {GrindingChallenge} from './src/components/challenges/GrindingChallenge';
import {IngredientChallenge} from './src/components/challenges/IngredientChallenge';
import {StuffingChallenge} from './src/components/challenges/StuffingChallenge';
import {TastingChallenge} from './src/components/challenges/TastingChallenge';
import {GameWorld} from './src/components/GameWorld';
import {ChallengeHeader} from './src/components/ui/ChallengeHeader';
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

  const handleReaction = useCallback(
    (reaction: Parameters<typeof setMrSausageReaction>[0]) => {
      setMrSausageReaction(reaction);
    },
    [setMrSausageReaction],
  );

  const isIngredientChallenge = gameStatus === 'playing' && currentChallenge === 0;
  const isGrindingChallenge = gameStatus === 'playing' && currentChallenge === 1;
  const isStuffingChallenge = gameStatus === 'playing' && currentChallenge === 2;
  const isCookingChallenge = gameStatus === 'playing' && currentChallenge === 3;
  const isTastingChallenge = gameStatus === 'playing' && currentChallenge === 4;

  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="game-overlay">
      {gameStatus === 'playing' && (
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
