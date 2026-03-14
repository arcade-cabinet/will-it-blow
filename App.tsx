/**
 * @module App
 * Root application — phase routing (title → playing) + Filament 3D scene.
 *
 * Pre-game: TitleScreen + DifficultySelector (React Native UI)
 * Playing: GameScene (Filament 3D — kitchen, stations, physics, diegetic feedback)
 *
 * No 2D overlays during gameplay. Everything is diegetic via the 3D scene.
 * GameOrchestrator runs as a non-rendering component for phase state machine.
 */

import {StyleSheet, View} from 'react-native';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {useGameStore} from './src/ecs/hooks';
import {GameOrchestrator} from './src/engine/GameOrchestrator';
import {GameScene} from './src/scene/Scene';

export default function App() {
  const appPhase = useGameStore(state => state.appPhase);

  return (
    <View style={styles.container}>
      {appPhase === 'title' && <TitleScreen />}

      {appPhase === 'playing' && (
        <View style={styles.container}>
          {/* Filament 3D scene — the entire game */}
          <GameScene />

          {/* Phase state machine — non-rendering, listens for keyboard dev shortcuts */}
          <GameOrchestrator />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
