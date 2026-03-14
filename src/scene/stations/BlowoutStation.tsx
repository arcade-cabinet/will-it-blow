/**
 * @module BlowoutStation
 * Tie casing + blowout pressure test.
 *
 * Ported from R3F BlowoutStation (228 lines):
 * - Position: [0, 0.4, 1.5]
 * - Phases: TIE_CASING → BLOWOUT
 * - Interactions: tie both ends, hold for pressure test
 * - Audio: pressure, burst sounds
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import {MODELS} from '../../assets/registry';

const POSITION: [number, number, number] = [0, 0.4, 1.5];

interface BlowoutStationProps {
  world: DiscreteDynamicWorld;
}

export function BlowoutStation({world}: BlowoutStationProps) {
  const shape = useBoxShape(0.5, 0.3, 0.5);
  useRigidBody({id: 'blowout', mass: 0, shape, world, origin: POSITION});

  return <Model source={MODELS.plateBig} translate={POSITION} />;
}
