/**
 * @module Stuffer
 * Casing stuffing station with crank rotation animation.
 *
 * Animation: island_counter model rotates its root entity slightly
 * back and forth during STUFFING phase to simulate crank turning.
 */

import {Model, useBoxShape, useRigidBody, useModel, useFilamentContext} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';
import {useEffect} from 'react';
import {useSharedValue} from 'react-native-worklets-core';
import {useGameStore} from '../../ecs/hooks';

const POSITION: [number, number, number] = [0.5, 0.4, -1.5];

interface StufferProps {
  world: DiscreteDynamicWorld;
}

export function Stuffer({world}: StufferProps) {
  const gamePhase = useGameStore(s => s.gamePhase);
  const isStuffing = gamePhase === 'STUFFING';

  const shape = useBoxShape(0.4, 0.5, 0.4);
  useRigidBody({id: 'stuffer', mass: 0, shape, world, origin: POSITION});

  const model = useModel(require('../../../public/models/island_counter.glb'));
  const {transformManager} = useFilamentContext();
  const wobble = useSharedValue(0);

  // Wobble animation during stuffing (simulates crank motion)
  useEffect(() => {
    if (!isStuffing) return;
    const interval = setInterval(() => {
      wobble.value += 0.15;
      if (model.state === 'loaded' && model.rootEntity) {
        const angle = Math.sin(wobble.value) * 0.05; // Subtle wobble
        transformManager.setEntityRotation(
          model.rootEntity,
          angle,
          [0, 0, 1], // Z-axis wobble
          false,
        );
      }
    }, 16);
    return () => clearInterval(interval);
  }, [isStuffing, model, transformManager, wobble]);

  return (
    <Model
      source={require('../../../public/models/island_counter.glb')}
      translate={POSITION}
    />
  );
}
