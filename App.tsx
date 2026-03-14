/**
 * @module App
 * Root application — GestureHandlerRootView wraps everything for touch input.
 * Phase routing: title → playing (Filament 3D, lazy-loaded).
 */

import React, {Suspense} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {usePersistence} from './src/db/usePersistence';
import {useGameStore} from './src/ecs/hooks';
import {GameOrchestrator} from './src/engine/GameOrchestrator';

const LazyGameScene = React.lazy(() =>
  import('./src/scene/Scene').then(m => ({default: m.GameScene})),
);

export default function App() {
  const appPhase = useGameStore(state => state.appPhase);
  usePersistence();

  return (
    <GestureHandlerRootView style={styles.container}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
});
