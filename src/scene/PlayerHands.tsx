/**
 * @module PlayerHands
 * First-person hands model for spatial grounding.
 *
 * Ported from R3F PlayerHands (106 lines):
 * - Loads hands.glb model
 * - Positioned relative to camera with lerped following
 * - Provides visual grounding so player feels "present" in the kitchen
 *
 * Filament approach: Load hands.glb, position at fixed offset from camera.
 * Without per-frame camera-relative positioning (needs render callback),
 * the hands are placed at a static position near the player spawn.
 */

import {Model} from 'react-native-filament';
import playerConfig from '../config/player.json';

const SPAWN = playerConfig.capsule.spawnPosition as [number, number, number];
const EYE_HEIGHT = playerConfig.capsule.eyeHeight;

// Hands positioned slightly below and in front of camera
const HANDS_POSITION: [number, number, number] = [
  SPAWN[0],
  SPAWN[1] + EYE_HEIGHT - 0.4, // Below eye level
  SPAWN[2] - 0.5, // In front
];

export function PlayerHands() {
  return (
    <Model
      source={require('../../public/models/hands.glb')}
      translate={HANDS_POSITION}
      scale={[0.5, 0.5, 0.5]}
    />
  );
}
