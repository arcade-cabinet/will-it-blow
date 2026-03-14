/**
 * @module Grinder
 * Meat grinder station with animated faceplate + motor vibration.
 *
 * Ported from R3F Grinder (331 lines):
 * - Position: [-1.5, 0.4, -1.0]
 * - Phases: FILL_GRINDER → GRINDING → MOVE_BOWL
 * - Animation: faceplate spins when grinding, motor vibrates
 *
 * Filament animations via useModel rootEntity + transformManager
 * in the parent Scene's renderCallback.
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

const POSITION: [number, number, number] = [-1.5, 0.4, -1.0];

interface GrinderProps {
  world: DiscreteDynamicWorld;
}

export function Grinder({world}: GrinderProps) {
  const gamePhase = useGameStore(s => s.gamePhase);
  const isGrinding = gamePhase === 'GRINDING';

  // Physics collider
  const shape = useBoxShape(0.5, 0.5, 0.5);
  useRigidBody({id: 'grinder', mass: 0, shape, world, origin: POSITION});

  // Model + animation
  const model = useModel(require('../../../public/models/meat_grinder.glb'));
  const {transformManager} = useFilamentContext();

  // Rotation animation via shared value
  const rotation = useSharedValue(0);

  // Animate faceplate spin when grinding
  useEffect(() => {
    if (!isGrinding) return;
    const interval = setInterval(() => {
      rotation.value += 0.1;
      if (model.state === 'loaded' && model.rootEntity) {
        transformManager.setEntityRotation(
          model.rootEntity,
          rotation.value,
          [0, 1, 0], // Y-axis spin
          false, // Don't multiply — set absolute
        );
      }
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isGrinding, model, transformManager, rotation]);

  return <Model source={require('../../../public/models/meat_grinder.glb')} translate={POSITION} />;
}
