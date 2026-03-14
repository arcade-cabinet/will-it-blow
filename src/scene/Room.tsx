/**
 * @module Room
 * Sealed basement kitchen room — proper GLB model with PBR materials.
 *
 * Created in Blender: 6 planes (floor, ceiling, 4 walls) + mattress cube.
 * Materials: dirty tile floor, grimy tile walls, concrete ceiling.
 *
 * Room dimensions: 6m wide (X: -3 to 3), 8m deep (Z: -4 to 4), 3m tall (Y: 0 to 3).
 *
 * Note: Blender exports with Y-up (glTF standard). In the game coordinate system,
 * Blender's Z → game Y (height), Blender's -Y → game Z (depth).
 */

import {Model} from 'react-native-filament';
import {MODELS} from '../assets/registry';

export function Room() {
  return <Model source={MODELS.basementRoom} translate={[0, 0, 0]} />;
}
