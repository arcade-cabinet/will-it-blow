/**
 * @module Scene
 * Root 3D scene — FilamentScene + FilamentView + Bullet physics world.
 * Composes: kitchen environment, stations, player, characters, feedback.
 *
 * Architecture: FilamentScene provides React context for all Filament hooks.
 * FilamentView is the Metal/Vulkan rendering surface. useWorld creates the
 * Bullet3 physics simulation. RenderCallback runs on the UI thread worklet
 * for smooth animation.
 */

import {
  Camera,
  DefaultLight,
  FilamentScene,
  FilamentView,
  useWorld,
} from 'react-native-filament';
import {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import type {RenderCallback} from 'react-native-filament';
import {useSharedValue} from 'react-native-worklets-core';
import {Kitchen} from './Kitchen';
import {KitchenLighting} from './Lighting';
import {useGameStore} from '../ecs/hooks';

/**
 * Root game scene. Manages:
 * - Bullet3 physics world (gravity -9.8 m/s²)
 * - Filament rendering surface (Metal on iOS, Vulkan on Android)
 * - Worklet render callback for per-frame animation
 * - Camera (FPS first-person, controlled by touch input)
 */
export function GameScene() {
  const world = useWorld(0, -9.8, 0);
  const gamePhase = useGameStore(s => s.gamePhase);

  // Camera state — driven by touch gestures
  const cameraYaw = useSharedValue(0);
  const cameraPitch = useSharedValue(-0.05); // Slightly below horizon
  const cameraPosition = useSharedValue<[number, number, number]>([0, 1.6, 2]);

  // Per-frame render callback (runs on UI thread worklet)
  const onFrame: RenderCallback = useCallback(() => {
    'worklet';

    // Step physics world
    if (world) {
      // Bullet physics step: 1/60s fixed timestep
      // world.stepSimulation(1 / 60, 1); // TODO: wire when physics bodies exist
    }
  }, [world]);

  return (
    <FilamentScene>
      <FilamentView style={styles.scene} renderCallback={onFrame}>
        {/* Lighting — horror ambiance */}
        <KitchenLighting />

        {/* Camera — FPS first-person view */}
        <Camera />

        {/* Kitchen environment — room geometry + furniture */}
        <Kitchen world={world} />

        {/* TODO: Stations — wired in next phase */}
        {/* TODO: Player capsule + FPS camera control */}
        {/* TODO: Mr. Sausage character */}
        {/* TODO: SurrealText diegetic feedback */}
      </FilamentView>
    </FilamentScene>
  );
}

const styles = StyleSheet.create({
  scene: {flex: 1, backgroundColor: '#000'},
});
