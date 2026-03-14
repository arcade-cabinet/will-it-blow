/**
 * @module Scene
 * Root 3D scene — FilamentScene + FilamentView + Bullet physics world.
 * Composes: kitchen environment, all 7 stations, player, lighting.
 */

import {
  DefaultLight,
  FilamentScene,
  FilamentView,
  useWorld,
} from 'react-native-filament';
import {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import type {RenderCallback} from 'react-native-filament';
import {Kitchen} from './Kitchen';
import {KitchenLighting} from './Lighting';
import {PlayerController} from './PlayerController';
import {BlowoutStation} from './stations/BlowoutStation';
import {ChestFreezer} from './stations/ChestFreezer';
import {ChoppingBlock} from './stations/ChoppingBlock';
import {Grinder} from './stations/Grinder';
import {Sink} from './stations/Sink';
import {Stove} from './stations/Stove';
import {Stuffer} from './stations/Stuffer';
import {TV} from './stations/TV';
import {useGameStore} from '../ecs/hooks';

export function GameScene() {
  const world = useWorld(0, -9.8, 0);
  const gamePhase = useGameStore(s => s.gamePhase);

  const onFrame: RenderCallback = useCallback(() => {
    'worklet';
    // Physics step will go here once player movement is wired
  }, []);

  return (
    <FilamentScene>
      <FilamentView style={styles.scene} renderCallback={onFrame}>
        {/* Lighting */}
        <KitchenLighting />

        {/* Player — FPS camera + Bullet capsule */}
        <PlayerController world={world} />

        {/* Kitchen environment — furniture + horror props + wall colliders */}
        <Kitchen world={world} />

        {/* All 7 game stations + TV */}
        <ChestFreezer world={world} />
        <ChoppingBlock world={world} />
        <Grinder world={world} />
        <Stuffer world={world} />
        <BlowoutStation world={world} />
        <Stove world={world} />
        <Sink world={world} />
        <TV world={world} />
      </FilamentView>
    </FilamentScene>
  );
}

const styles = StyleSheet.create({
  scene: {flex: 1, backgroundColor: '#000'},
});
