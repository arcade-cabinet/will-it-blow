/**
 * @module Room
 * Sealed basement kitchen room — walls, floor, ceiling.
 *
 * The original R3F BasementRoom used procedural planes with PBR textures.
 * Filament doesn't expose programmatic mesh creation via React API.
 *
 * Approach: Use existing workplan.glb as floor tiles (flipped/tiled),
 * and brick GLBs from horror props for walls. This creates a visible
 * room enclosure using only existing assets.
 *
 * Room dimensions: 6m wide (X: -3 to 3), 8m deep (Z: -4 to 4), 3m tall.
 */

import {Model} from 'react-native-filament';
import {MODELS} from '../assets/registry';

// Floor: use workplan models as floor tiles
const FLOOR_TILES = [
  {position: [-2, 0, -2] as [number, number, number]},
  {position: [0, 0, -2] as [number, number, number]},
  {position: [2, 0, -2] as [number, number, number]},
  {position: [-2, 0, 0] as [number, number, number]},
  {position: [0, 0, 0] as [number, number, number]},
  {position: [2, 0, 0] as [number, number, number]},
  {position: [-2, 0, 2] as [number, number, number]},
  {position: [0, 0, 2] as [number, number, number]},
  {position: [2, 0, 2] as [number, number, number]},
];

// Walls: use brick GLBs stacked for wall segments
const WALL_BRICKS = [
  // Back wall (Z = -4)
  {
    source: MODELS.brick1,
    position: [-2, 0.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [0, 0.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [2, 0.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [-2, 1.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [0, 1.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [2, 1.5, -3.9] as [number, number, number],
  },
  // Left wall (X = -3)
  {
    source: MODELS.brick1,
    position: [-2.9, 0.5, -2] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [-2.9, 0.5, 0] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [-2.9, 0.5, 2] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [-2.9, 1.5, -2] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [-2.9, 1.5, 0] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [-2.9, 1.5, 2] as [number, number, number],
  },
  // Right wall (X = 3)
  {
    source: MODELS.brick2,
    position: [2.9, 0.5, -2] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [2.9, 0.5, 0] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [2.9, 0.5, 2] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [2.9, 1.5, -2] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [2.9, 1.5, 0] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [2.9, 1.5, 2] as [number, number, number],
  },
];

// Mattress at player spawn position
const MATTRESS_POSITION: [number, number, number] = [0, 0.1, 2];

export function Room() {
  return (
    <>
      {/* Floor tiles */}
      {FLOOR_TILES.map((tile, i) => (
        <Model
          key={`floor-${i}`}
          source={MODELS.workplan}
          translate={tile.position}
          scale={[1, 0.02, 1]}
        />
      ))}

      {/* Wall bricks */}
      {WALL_BRICKS.map((brick, i) => (
        <Model
          key={`wall-${i}`}
          source={brick.source}
          translate={brick.position}
          scale={[2, 2, 2]}
        />
      ))}

      {/* Mattress — player spawn */}
      <Model source={MODELS.bandages} translate={MATTRESS_POSITION} scale={[2, 0.5, 3]} />
    </>
  );
}
