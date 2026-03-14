/**
 * @module Scene
 * Root 3D scene — Filament rendering + Bullet physics + touch controls.
 *
 * Layers:
 * 1. FilamentView (3D scene — kitchen, stations, models)
 * 2. TouchControls overlay (invisible — handles FPS look/move/interact)
 */

import {
  DefaultLight,
  FilamentScene,
  FilamentView,
  Skybox,
  useWorld,
} from 'react-native-filament';
import {useCallback, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import type {RenderCallback} from 'react-native-filament';
import {IntroSequence} from './IntroSequence';
import {Kitchen} from './Kitchen';
import {KitchenLighting} from './Lighting';
import {MrSausage} from './MrSausage';
import {Room} from './Room';
import {PlayerController} from './PlayerController';
import {PlayerHands} from './PlayerHands';
import {Sausage} from './sausage/Sausage';
import {SurrealText} from './SurrealText';
import {TouchControls} from './TouchControls';
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

  // Camera look state — mutated by touch controls
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.05);
  // Movement state
  const moveXRef = useRef(0);
  const moveZRef = useRef(0);

  const handleLook = useCallback((dx: number, dy: number) => {
    yawRef.current -= dx * 0.004;
    pitchRef.current = Math.max(-1.4, Math.min(1.4, pitchRef.current - dy * 0.004));
  }, []);

  const handleMove = useCallback((x: number, z: number) => {
    moveXRef.current = x;
    moveZRef.current = z;
  }, []);

  const handleMoveEnd = useCallback(() => {
    moveXRef.current = 0;
    moveZRef.current = 0;
  }, []);

  const onFrame: RenderCallback = useCallback(() => {
    'worklet';
    // Physics stepping + camera updates will happen here
    // when we wire the player body velocity from moveX/moveZ
  }, []);

  return (
    <View style={styles.container}>
      {/* Layer 1: 3D Filament scene */}
      <FilamentScene>
        <FilamentView style={StyleSheet.absoluteFill} renderCallback={onFrame}>
          {/* Dark horror skybox — sealed basement, no sky visible */}
          <Skybox colorInHex="#0a0a0a" />
          <KitchenLighting />
          <PlayerController world={world} />
          <Room />
          <Kitchen world={world} />
          <ChestFreezer world={world} />
          <ChoppingBlock world={world} />
          <Grinder world={world} />
          <Stuffer world={world} />
          <BlowoutStation world={world} />
          <Stove world={world} />
          <Sink world={world} />
          <TV world={world} />

          {/* Characters + objects */}
          <MrSausage />
          <PlayerHands />
          <Sausage />
        </FilamentView>
      </FilamentScene>

      {/* Layer 2: Intro sequence — eyelid blink/wake-up */}
      <IntroSequence />

      {/* Layer 3: Diegetic text — blood text showing game state */}
      <SurrealText />

      {/* Layer 3: Invisible touch controls */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchControls
          onLook={handleLook}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
});
