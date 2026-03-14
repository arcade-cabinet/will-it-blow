/**
 * @module TV
 * CRT television showing Mr. Sausage.
 *
 * Ported from R3F TV (49 lines):
 * - Position: [-2.8, 1.8, 0]
 * - Displays Mr. Sausage's reactions
 * - CRT visual effect (future: custom Filament material)
 */

import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';

const POSITION: [number, number, number] = [-2.8, 1.8, 0];

interface TVProps {
  world: DiscreteDynamicWorld;
}

export function TV({world}: TVProps) {
  const shape = useBoxShape(0.4, 0.4, 0.5);
  useRigidBody({id: 'tv', mass: 0, shape, world, origin: POSITION});

  // No TV GLB available — use toaster as placeholder for now
  return (
    <Model
      source={require('../../../public/models/toaster.glb')}
      translate={POSITION}
      scale={[2, 2, 2]}
    />
  );
}
