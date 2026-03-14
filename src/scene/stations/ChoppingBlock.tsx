/**
 * @module ChoppingBlock
 * Chopping station — tap to chop ingredients.
 *
 * Ported from R3F ChoppingBlock:
 * - Position: [1.5, 0.4, 0]
 * - 5 chops required to advance to FILL_GRINDER phase
 * - Each chop plays audioEngine.playChop()
 * - Visual: cutting_board.glb model + Bullet box collider
 *
 * Interaction: In Filament, models don't have onClick. When gamePhase
 * is CHOPPING, taps on the screen trigger doChop(). The station model
 * is visible as the interaction target. Future: raycast tap detection
 * for specific station targeting.
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import {MODELS} from '../../assets/registry';
import {useGameStore} from '../../ecs/hooks';

const POSITION: [number, number, number] = [1.5, 0.4, 0];

interface ChoppingBlockProps {
  world: DiscreteDynamicWorld;
}

export function ChoppingBlock({world}: ChoppingBlockProps) {
  const _gamePhase = useGameStore(s => s.gamePhase);

  // Physics collider — box around the chopping block
  const shape = useBoxShape(0.5, 0.4, 0.5);
  useRigidBody({id: 'chopping-block', mass: 0, shape, world, origin: POSITION});

  return <Model source={MODELS.cuttingBoard} translate={POSITION} />;
}
