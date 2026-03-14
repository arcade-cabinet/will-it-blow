/**
 * @module Sink
 * Cleanup station between rounds.
 *
 * Ported from R3F Sink (194 lines):
 * - Position: [2.5, 0, 1.0]
 * - Audio: pour sounds during cleanup
 * - Uses washing_machine.glb as placeholder
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Model, useBoxShape, useRigidBody} from 'react-native-filament';

const POSITION: [number, number, number] = [2.5, 0, 1.0];

interface SinkProps {
  world: DiscreteDynamicWorld;
}

export function Sink({world}: SinkProps) {
  const shape = useBoxShape(0.4, 0.5, 0.4);
  useRigidBody({id: 'sink', mass: 0, shape, world, origin: POSITION});

  return (
    <Model source={require('../../../public/models/washing_machine.glb')} translate={POSITION} />
  );
}
