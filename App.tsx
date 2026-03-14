/**
 * @module App
 * Root application — phase routing (title → playing) + Filament 3D scene.
 *
 * Pre-game: TitleScreen + DifficultySelector (React Native UI)
 * Playing: GameScene (Filament 3D — lazy-loaded to avoid worklets init race)
 *
 * No 2D overlays during gameplay. Everything is diegetic via the 3D scene.
 */

import React, {Suspense} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {useGameStore} from './src/ecs/hooks';
import {GameOrchestrator} from './src/engine/GameOrchestrator';

// Lazy-load GameScene so react-native-filament is NOT imported at app startup.
// Filament requires react-native-worklets-core native module to be ready,
// which isn't guaranteed during initial module evaluation.
const LazyGameScene = React.lazy(() =>
  import('./src/scene/Scene').then(m => ({default: m.GameScene})),
);

export default function App() {
  const appPhase = useGameStore(state => state.appPhase);

  return (
    <View style={styles.container}>
      {appPhase === 'title' && <TitleScreen />}

      {appPhase === 'playing' && (
        <View style={styles.container}>
          <Suspense
            fallback={
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#FF1744" />
              </View>
            }
          >
            <LazyGameScene />
          </Suspense>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
