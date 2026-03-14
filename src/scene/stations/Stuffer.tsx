/**
 * @module Stuffer
 * Casing stuffing station.
 *
 * Ported from R3F Stuffer (242 lines):
 * - Position: [0.5, 0.4, -1.5]
 * - Phases: ATTACH_CASING → STUFFING → TIE_CASING
 * - Interactions: drag casing to attach, crank to fill
 * - Tracks stuffLevel 0→1
 * - Audio: audioEngine.playSound('squelch')
 */

import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';

const POSITION: [number, number, number] = [0.5, 0.4, -1.5];

interface StufferProps {
  world: DiscreteDynamicWorld;
}

export function Stuffer({world}: StufferProps) {
  const shape = useBoxShape(0.4, 0.5, 0.4);
  useRigidBody({id: 'stuffer', mass: 0, shape, world, origin: POSITION});

  return (
    <Model
      source={require('../../../public/models/island_counter.glb')}
      translate={POSITION}
    />
  );
}
