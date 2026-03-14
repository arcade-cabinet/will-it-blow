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

// Kitchen furniture GLBs from public/models/
const FURNITURE = [
  {
    source: require('../../public/models/workplan.glb'),
    position: [0, 0, -3] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/workplan_001.glb'),
    position: [2, 0, -3] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/kitchen_oven_large.glb'),
    position: [2.5, 0, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/fridge.glb'),
    position: [-2.5, 0, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/kitchen_cabinet1.glb'),
    position: [-2, 0, -3.8] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/kitchen_cabinet2.glb'),
    position: [-1, 0, -3.8] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/shelf_small.glb'),
    position: [2.8, 1.5, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/knife_holder.glb'),
    position: [1.5, 0.8, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/utensil_holder.glb'),
    position: [0.5, 0.8, -3.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/cutting_board.glb'),
    position: [1.5, 0.45, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/mixing_bowl.glb'),
    position: [-0.6, 0.45, 0] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/meat_grinder.glb'),
    position: [-1.5, 0.45, -1] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/frying_pan.glb'),
    position: [2, 0.85, -2] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/pot.glb'),
    position: [1.5, 0.85, -2.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/table_styloo.glb'),
    position: [0, 0, 2] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/chair_styloo.glb'),
    position: [0.5, 0, 2.5] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/trashcan_cylindric.glb'),
    position: [-2.5, 0, 2] as [number, number, number],
    scale: 1,
  },
  {
    source: require('../../public/models/toaster.glb'),
    position: [0, 0.85, -3.5] as [number, number, number],
    scale: 0.8,
  },
  {
    source: require('../../public/models/washing_machine.glb'),
    position: [-2.8, 0, -1] as [number, number, number],
    scale: 1,
  },
];

// Horror prop GLBs
const HORROR_PROPS = [
  {
    source: require('../../public/models/horror/metal_barrel_hr_1.glb'),
    position: [2.5, 0, 3] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/metal_barrel_hr_2.glb'),
    position: [2.2, 0, 3.5] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/cage_mx_1.glb'),
    position: [-2.5, 0, 3.5] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/saw_blade_1.glb'),
    position: [2.9, 1.8, -1] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/machete_mx_1.glb'),
    position: [-2.8, 1.5, 1] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/mask_mx_1.glb'),
    position: [-2.9, 2, -2] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/mask_mx_3.glb'),
    position: [2.9, 2, -2.5] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/fishing_hook_mx_1.glb'),
    position: [0, 2.8, 0] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/fishing_hook_mx_2.glb'),
    position: [1, 2.8, -1] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/wooden_plank_1.glb'),
    position: [-1, 0, 3.8] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/pipes_hr_1.glb'),
    position: [0, 2.5, -3.9] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/wires_hr_1.glb'),
    position: [1, 2.5, -3.9] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/poster_cx_4.glb'),
    position: [-1, 1.5, -3.95] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/lamp_mx_3_on.glb'),
    position: [0, 2.9, 0] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/cardboard_box_1.glb'),
    position: [-2, 0, 1] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/brick_mx_1.glb'),
    position: [2.95, 0.5, 1] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/brick_mx_2.glb'),
    position: [2.95, 0.5, -0.5] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/graffiti_mx_1.glb'),
    position: [2.95, 1.5, 2] as [number, number, number],
  },
  {
    source: require('../../public/models/horror/graffiti_mx_2.glb'),
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
