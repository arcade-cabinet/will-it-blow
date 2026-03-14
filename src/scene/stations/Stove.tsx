/**
 * @module Stove
 * Cooking station with heat shimmer animation during COOKING phase.
 *
 * Animation: subtle scale pulse on the oven model to simulate
 * heat/sizzle visual feedback.
 */

import {useEffect} from 'react';
import type {DiscreteDynamicWorld} from 'react-native-filament';
import {
  Model,
  useBoxShape,
  useFilamentContext,
  useModel,
  useRigidBody,
} from 'react-native-filament';
import {useSharedValue} from 'react-native-worklets-core';
import {useGameStore} from '../../ecs/hooks';

const POSITION: [number, number, number] = [2.0, 0, -2.5];

interface StoveProps {
  world: DiscreteDynamicWorld;
}

export function Stove({world}: StoveProps) {
  const gamePhase = useGameStore(s => s.gamePhase);
  const isCooking = gamePhase === 'COOKING';

  const shape = useBoxShape(0.6, 0.5, 0.6);
  useRigidBody({id: 'stove', mass: 0, shape, world, origin: POSITION});

  const model = useModel(require('../../../public/models/kitchen_oven_large.glb'));
  const {transformManager} = useFilamentContext();
  const pulse = useSharedValue(0);

  // Heat shimmer: subtle scale pulse during cooking
  useEffect(() => {
    if (!isCooking) return;
    const interval = setInterval(() => {
      pulse.value += 0.1;
      if (model.state === 'loaded' && model.rootEntity) {
        const s = 1 + Math.sin(pulse.value * 3) * 0.01; // Very subtle
        transformManager.setEntityScale(model.rootEntity, [s, s, s], false);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [isCooking, model, transformManager, pulse]);

  return (
    <Model source={require('../../../public/models/kitchen_oven_large.glb')} translate={POSITION} />
  );
}
