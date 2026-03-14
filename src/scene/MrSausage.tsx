/**
 * @module MrSausage
 * Mr. Sausage character — the horror host on the CRT TV.
 *
 * Ported from R3F MrSausage3D (540 lines):
 * - 9 reaction animations (idle, flinch, laugh, disgust, excitement, nervous, nod, talk, eating, judging)
 * - Procedural body from primitives (head, body, arms, legs, eyes, mouth)
 * - Camera tracking (rotates to face player)
 * - Reaction-driven transform offsets interpolated with lerp
 *
 * Filament approach: Use Flesh.glb as a placeholder body model.
 * Position on/near the TV. Read reaction from Koota mrSausageReaction trait.
 * Animate scale/rotation based on reaction via shared values.
 *
 * TODO: Create proper MrSausage.glb model in Blender with armature for
 * reaction-driven bone animations.
 */

import {Model} from 'react-native-filament';
import {useCallback} from 'react';
import {useSharedValue} from 'react-native-worklets-core';
import type {RenderCallback} from 'react-native-filament';
import {useGameStore} from '../ecs/hooks';
import {REACTIONS} from '../characters/reactions';
import type {Reaction} from '../characters/reactions';

const TV_POSITION: [number, number, number] = [-2.8, 1.2, 0];

export function MrSausage() {
  const reaction = useGameStore(s => s.mrSausageReaction) as Reaction;
  const reactionDef = REACTIONS[reaction] || REACTIONS.idle;

  // Scale animation based on reaction (excitement = bigger, flinch = smaller)
  const scale = useSharedValue<[number, number, number]>([0.3, 0.3, 0.3]);

  // Apply reaction-specific transforms
  const bodyY = reactionDef.bodyY ?? 0;
  const shakeIntensity = reactionDef.shakeIntensity ?? 0;

  const position: [number, number, number] = [
    TV_POSITION[0] + (shakeIntensity > 0 ? Math.sin(Date.now() * 0.01) * shakeIntensity : 0),
    TV_POSITION[1] + bodyY * 0.3,
    TV_POSITION[2],
  ];

  return (
    <Model
      source={require('../../public/models/Flesh.glb')}
      translate={position}
      scale={[0.3, 0.3, 0.3]}
    />
  );
}
