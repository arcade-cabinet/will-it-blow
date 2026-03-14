/**
 * @module ChestFreezer
 * Ingredient selection station — freezer with tappable ingredients.
 *
 * Ported from R3F ChestFreezer + PhysicsFreezerChest:
 * - Position: [-2.5, 0, -3.5]
 * - Phase: SELECT_INGREDIENTS
 * - Player picks 3 ingredients from the freezer
 * - Each pick calls addSelectedIngredientId()
 * - Uses fridge.glb model
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Model, useBoxShape, useRigidBody} from 'react-native-filament';
import {MODELS} from '../../assets/registry';

const POSITION: [number, number, number] = [-2.5, 0, -3.5];

interface ChestFreezerProps {
  world: DiscreteDynamicWorld;
}

export function ChestFreezer({world}: ChestFreezerProps) {
  const shape = useBoxShape(0.5, 0.8, 0.5);
  useRigidBody({id: 'freezer', mass: 0, shape, world, origin: POSITION});

  return <Model source={MODELS.fridge} translate={POSITION} />;
}
