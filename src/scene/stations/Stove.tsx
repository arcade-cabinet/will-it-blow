/**
 * @module Stove
 * Cooking station with stove + frying pan.
 *
 * Ported from R3F Stove (329 lines):
 * - Position: [2.0, 0, -2.5]
 * - Phases: MOVE_PAN → COOKING → DONE
 * - Interactions: drag pan, adjust burner dials, cook level 0→1
 * - Audio: audioEngine.setSizzleLevel()
 */

import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';

const POSITION: [number, number, number] = [2.0, 0, -2.5];

interface StoveProps {
  world: DiscreteDynamicWorld;
}

export function Stove({world}: StoveProps) {
  const shape = useBoxShape(0.6, 0.5, 0.6);
  useRigidBody({id: 'stove', mass: 0, shape, world, origin: POSITION});

  return (
    <Model
      source={require('../../../public/models/kitchen_oven_large.glb')}
      translate={POSITION}
    />
  );
}
