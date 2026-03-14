/**
 * @module Kitchen
 * Kitchen environment — room geometry (GLB models) + Bullet physics colliders.
 *
 * Room dimensions (from BasementRoom reference):
 * - Width: 6m (X: -3 to 3)
 * - Depth: 8m (Z: -4 to 4)
 * - Height: 3m (Y: 0 to 3)
 *
 * Sealed basement kitchen with:
 * - Tile floor, tile walls, concrete ceiling
 * - Mattress at [2.0, 0.25, 3.0] (player spawn)
 * - Kitchen furniture GLBs (workplan, oven, fridge, cabinets, shelves, etc.)
 * - 21 PSX horror props (loaded separately via ScatterProps)
 *
 * Physics: static Bullet colliders for all surfaces (walls, floor, ceiling)
 * so the player capsule can't fall through or walk through them.
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Model, useBoxShape, useRigidBody, useStaticPlaneShape} from 'react-native-filament';
import {MODELS} from '../assets/registry';

// Kitchen furniture GLBs from assets/models/
const FURNITURE = [
  {
    source: MODELS.workplan,
    position: [0, 0, -3] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.workplan001,
    position: [2, 0, -3] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.ovenLarge,
    position: [2.5, 0, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.fridge,
    position: [-2.5, 0, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.cabinet1,
    position: [-2, 0, -3.8] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.cabinet2,
    position: [-1, 0, -3.8] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.shelfSmall,
    position: [2.8, 1.5, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.knifeHolder,
    position: [1.5, 0.8, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.utensilHolder,
    position: [0.5, 0.8, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.cuttingBoard,
    position: [1.5, 0.45, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.mixingBowl,
    position: [-0.6, 0.45, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.meatGrinder,
    position: [-1.5, 0.45, -1] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.fryingPan,
    position: [2, 0.85, -2] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.pot,
    position: [1.5, 0.85, -2.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.table,
    position: [0, 0, 2] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.chair,
    position: [0.5, 0, 2.5] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.trashcan,
    position: [-2.5, 0, 2] as [number, number, number],
    scale: 1,
  },
  {
    source: MODELS.toaster,
    position: [0, 0.85, -3.5] as [number, number, number],
    scale: 0.8,
  },
  {
    source: MODELS.washingMachine,
    position: [-2.8, 0, -1] as [number, number, number],
    scale: 1,
  },
];

// Horror prop GLBs
const HORROR_PROPS = [
  {
    source: MODELS.barrel1,
    position: [2.5, 0, 3] as [number, number, number],
  },
  {
    source: MODELS.barrel2,
    position: [2.2, 0, 3.5] as [number, number, number],
  },
  {
    source: MODELS.cage,
    position: [-2.5, 0, 3.5] as [number, number, number],
  },
  {
    source: MODELS.sawBlade,
    position: [2.9, 1.8, -1] as [number, number, number],
  },
  {
    source: MODELS.machete,
    position: [-2.8, 1.5, 1] as [number, number, number],
  },
  {
    source: MODELS.mask1,
    position: [-2.9, 2, -2] as [number, number, number],
  },
  {
    source: MODELS.mask3,
    position: [2.9, 2, -2.5] as [number, number, number],
  },
  {
    source: MODELS.hook1,
    position: [0, 2.8, 0] as [number, number, number],
  },
  {
    source: MODELS.hook2,
    position: [1, 2.8, -1] as [number, number, number],
  },
  {
    source: MODELS.plank,
    position: [-1, 0, 3.8] as [number, number, number],
  },
  {
    source: MODELS.pipes,
    position: [0, 2.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.wires,
    position: [1, 2.5, -3.9] as [number, number, number],
  },
  {
    source: MODELS.poster,
    position: [-1, 1.5, -3.95] as [number, number, number],
  },
  {
    source: MODELS.lamp,
    position: [0, 2.9, 0] as [number, number, number],
  },
  {
    source: MODELS.cardboardBox,
    position: [-2, 0, 1] as [number, number, number],
  },
  {
    source: MODELS.brick1,
    position: [2.95, 0.5, 1] as [number, number, number],
  },
  {
    source: MODELS.brick2,
    position: [2.95, 0.5, -0.5] as [number, number, number],
  },
  {
    source: MODELS.graffiti1,
    position: [2.95, 1.5, 2] as [number, number, number],
  },
  {
    source: MODELS.graffiti2,
    position: [-2.95, 1.5, -1] as [number, number, number],
  },
];

interface KitchenProps {
  world: DiscreteDynamicWorld;
}

export function Kitchen({world}: KitchenProps) {
  // Physics colliders for room boundaries
  // Floor: infinite plane at Y=0, normal pointing up
  const floorShape = useStaticPlaneShape(0, 1, 0, 0);
  useRigidBody({id: 'floor', mass: 0, shape: floorShape, world, origin: [0, 0, 0]});

  // Ceiling: infinite plane at Y=3, normal pointing down
  const ceilingShape = useStaticPlaneShape(0, -1, 0, -3);
  useRigidBody({id: 'ceiling', mass: 0, shape: ceilingShape, world, origin: [0, 3, 0]});

  // Walls: box colliders (thin boxes — half-extents)
  const wallThick = useBoxShape(0.1, 1.5, 4); // For X walls
  const wallWide = useBoxShape(3, 1.5, 0.1); // For Z walls

  useRigidBody({id: 'wall-left', mass: 0, shape: wallThick, world, origin: [-3, 1.5, 0]});
  useRigidBody({id: 'wall-right', mass: 0, shape: wallThick, world, origin: [3, 1.5, 0]});
  useRigidBody({id: 'wall-back', mass: 0, shape: wallWide, world, origin: [0, 1.5, -4]});
  useRigidBody({id: 'wall-front', mass: 0, shape: wallWide, world, origin: [0, 1.5, 4]});

  return (
    <>
      {/* Kitchen furniture */}
      {FURNITURE.map((item, i) => (
        <Model
          key={`furniture-${i}`}
          source={item.source}
          translate={item.position}
          scale={[item.scale, item.scale, item.scale]}
        />
      ))}

      {/* Horror props */}
      {HORROR_PROPS.map((item, i) => (
        <Model key={`horror-${i}`} source={item.source} translate={item.position} />
      ))}
    </>
  );
}
