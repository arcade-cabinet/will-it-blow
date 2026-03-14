/**
 * @module MrSausage
 * Mr. Sausage character — the horror host near the CRT TV.
 *
 * 9 reaction animations driven by Koota mrSausageReaction trait:
 * idle, flinch, laugh, disgust, excitement, nervous, nod, talk, eating, judging
 *
 * Uses Flesh.glb as body model. Reaction transforms applied via
 * transformManager in a setInterval loop:
 * - bodyY offset (excitement lifts, eating dips)
 * - shakeIntensity (laughing shakes, nervous trembles)
 * - headRotX (nod, disgust, judging tilt)
 * - bodyRotZ (flinch lean, disgust turn)
 */

import {useEffect} from 'react';
import {Model, useFilamentContext, useModel} from 'react-native-filament';
import {useSharedValue} from 'react-native-worklets-core';
import type {Reaction} from '../characters/reactions';
import {REACTIONS} from '../characters/reactions';
import {useGameStore} from '../ecs/hooks';

const TV_POSITION: [number, number, number] = [-2.8, 1.2, 0];

export function MrSausage() {
  const reaction = useGameStore(s => s.mrSausageReaction) as Reaction;
  const reactionDef = REACTIONS[reaction] || REACTIONS.idle;

  const model = useModel(require('../../public/models/Flesh.glb'));
  const {transformManager} = useFilamentContext();
  const time = useSharedValue(0);

  // Continuous reaction animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      time.value += 16;
      if (model.state !== 'loaded' || !model.rootEntity) return;

      const t = time.value * 0.001; // seconds
      const bodyY = reactionDef.bodyY ?? 0;
      const shake = reactionDef.shakeIntensity ?? 0;
      const bodyRotZ = reactionDef.bodyRotZ ?? 0;
      const headRotX = reactionDef.headRotX ?? 0;

      // Position with shake
      const shakeOffset = shake > 0 ? Math.sin(t * 15) * shake : 0;
      transformManager.setEntityPosition(
        model.rootEntity,
        [TV_POSITION[0] + shakeOffset, TV_POSITION[1] + bodyY * 0.3, TV_POSITION[2]],
        false,
      );

      // Rotation from reaction (body lean + head tilt combined)
      const totalRot = bodyRotZ + headRotX * 0.5;
      if (Math.abs(totalRot) > 0.001) {
        transformManager.setEntityRotation(model.rootEntity, totalRot, [0, 0, 1], false);
      }

      // Scale pulse for excitement/laugh reactions
      if (reactionDef.loop && bodyY > 0) {
        const s = 0.3 + Math.sin(t * 5) * 0.02;
        transformManager.setEntityScale(model.rootEntity, [s, s, s], false);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [model, transformManager, reactionDef, time]);

  return (
    <Model
      source={require('../../public/models/Flesh.glb')}
      translate={TV_POSITION}
      scale={[0.3, 0.3, 0.3]}
    />
  );
}
