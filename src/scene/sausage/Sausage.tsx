/**
 * @module Sausage
 * Sausage body — visible during stuffing, cooking, and blowout phases.
 *
 * Ported from R3F Sausage (253 lines) + SausageGeometry (157 lines):
 * - Bone-chain physics body (N rigid bodies connected by spring forces)
 * - SkinnedMesh rendering (deformable tube)
 * - Extrusion animation (appears segment by segment during stuffing)
 * - Cook/grease visual changes (color/roughness shift with cooking)
 *
 * Filament approach: Load Flesh.glb as the sausage body model.
 * Position at the stuffer output during STUFFING, move to stove during COOKING.
 * Bullet constraints for bone-chain physics need Filament's constraint API.
 *
 * Simplified for initial port: single model that moves between stations
 * based on game phase. Full bone-chain physics is a future enhancement.
 */

import {Model} from 'react-native-filament';
import {MODELS} from '../../assets/registry';
import {useGameStore} from '../../ecs/hooks';

// Station positions where sausage appears
const POSITIONS: Record<string, [number, number, number]> = {
  STUFFING: [0.5, 0.6, -1.5], // At stuffer output
  TIE_CASING: [0, 0.6, 1.5], // At blowout station
  BLOWOUT: [0, 0.6, 1.5],
  MOVE_SAUSAGE: [1.0, 0.6, 0], // In transit
  MOVE_PAN: [2.0, 0.8, -2.5], // Near stove
  COOKING: [2.0, 0.8, -2.5], // On stove
  DONE: [2.0, 0.8, -2.5],
};

// Phases where sausage is visible
const VISIBLE_PHASES = new Set(Object.keys(POSITIONS));

export function Sausage() {
  const gamePhase = useGameStore(s => s.gamePhase);

  if (!VISIBLE_PHASES.has(gamePhase)) return null;

  const position = POSITIONS[gamePhase] || [0, 0, 0];

  return (
    <Model
      source={MODELS.flesh}
      translate={position}
      scale={[0.15, 0.15, 0.5]} // Elongated sausage shape
    />
  );
}
