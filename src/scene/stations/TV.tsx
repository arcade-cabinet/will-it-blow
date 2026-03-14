/**
 * @module TV
 * CRT television showing Mr. Sausage.
 *
 * CRT effect via animation: subtle flicker (scale pulse + position jitter)
 * simulating an old CRT monitor. Real CRT shader would require a Filament
 * custom .mat material file — this is a convincing approximation.
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

const POSITION: [number, number, number] = [-2.8, 1.8, 0];

interface TVProps {
  world: DiscreteDynamicWorld;
}

export function TV({world}: TVProps) {
  const shape = useBoxShape(0.4, 0.4, 0.5);
  useRigidBody({id: 'tv', mass: 0, shape, world, origin: POSITION});

  const model = useModel(require('../../../public/models/toaster.glb'));
  const {transformManager} = useFilamentContext();
  const flicker = useSharedValue(0);

  // CRT flicker: constant subtle jitter
  useEffect(() => {
    const interval = setInterval(() => {
      flicker.value += 0.3;
      if (model.state === 'loaded' && model.rootEntity) {
        // Random jitter for CRT static effect
        const jitterX = (Math.random() - 0.5) * 0.005;
        const jitterY = (Math.random() - 0.5) * 0.005;
        const flickerScale = 0.98 + Math.random() * 0.04; // 0.98-1.02

        transformManager.setEntityPosition(
          model.rootEntity,
          [POSITION[0] + jitterX, POSITION[1] + jitterY, POSITION[2]],
          false,
        );
        transformManager.setEntityScale(
          model.rootEntity,
          [2 * flickerScale, 2 * flickerScale, 2 * flickerScale],
          false,
        );
      }
    }, 50); // 20fps for intentionally choppy CRT feel
    return () => clearInterval(interval);
  }, [model, transformManager, flicker]);

  return (
    <Model
      source={require('../../../public/models/toaster.glb')}
      translate={POSITION}
      scale={[2, 2, 2]}
    />
  );
}
