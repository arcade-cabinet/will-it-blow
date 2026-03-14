/**
 * @module Grinder
 * Meat grinder station.
 *
 * Ported from R3F Grinder (331 lines):
 * - Position: [-1.5, 0.4, -1.0]
 * - Phases: FILL_GRINDER → GRINDING → MOVE_BOWL
 * - Interactions: click chunks to load, drag plunger to grind
 * - Tracks groundMeatVol 0→1, particle effects, bowl movement
 * - Audio: audioEngine.setGrinderSpeed()
 */

import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';

const POSITION: [number, number, number] = [-1.5, 0.4, -1.0];

interface GrinderProps {
  world: DiscreteDynamicWorld;
}

export function Grinder({world}: GrinderProps) {
  const shape = useBoxShape(0.5, 0.5, 0.5);
  useRigidBody({id: 'grinder', mass: 0, shape, world, origin: POSITION});

  return (
    <Model
      source={require('../../../public/models/meat_grinder.glb')}
      translate={POSITION}
    />
  );
}
