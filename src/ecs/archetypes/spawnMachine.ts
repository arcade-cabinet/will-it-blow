import type {Entity} from '../types';
import {world} from '../world';
import type {MachineArchetype} from './types';

/**
 * @module spawnMachine
 *
 * ## Spatial Hierarchy
 *
 * The scene has three spatial layers:
 *
 * 1. **Scene geometry** — walls, floor, ceiling with PBR textures.
 *    Defines the physical bounds of the room.
 *
 * 2. **Furniture** — counters, tables, shelves, wall-mounted racks,
 *    ceiling trap doors. Positioned relative to scene geometry.
 *    Each furniture piece defines its own local coordinate system
 *    via an R3F `<group position={furnitureWorldPos}>`.
 *
 * 3. **Machines** — closed-loop compositional systems (grinder,
 *    stuffer, stove) mounted ON TOP of furniture. All slot
 *    positions are LOCAL to their furniture's coordinate system.
 *
 * This means:
 * - Slot transforms in archetypes are always LOCAL coordinates
 *   (relative to the furniture surface origin, not world space).
 * - The orchestrator wraps ECS entities in a `<group>` positioned
 *   at the furniture surface — Three.js scene graph handles the
 *   world transform automatically.
 * - If furniture rotates (wall mount, ceiling mount), all machine
 *   parts rotate with it — no manual offset recalculation.
 * - Moving furniture = updating one group position; all children follow.
 *
 * ## Usage
 *
 * ```tsx
 * // In an orchestrator component:
 * function GrinderOrchestrator({ stationPos }) {
 *   useEffect(() => {
 *     const entities = spawnMachine(GRINDER_ARCHETYPE);
 *     return () => despawnMachine(entities);
 *   }, []);
 *
 *   // The <group> provides the world transform.
 *   // ECS entities render in local space via MeshRenderer.
 *   return <group position={stationPos} />;
 * }
 * ```
 */

/**
 * Spawn all slot entities for a machine archetype.
 *
 * Entities are created with LOCAL coordinates (as defined in the
 * archetype). The orchestrator's R3F `<group>` provides the
 * world-space transform — no position offset is applied here.
 */
export function spawnMachine(archetype: MachineArchetype): Entity[] {
  const entities: Entity[] = [];
  for (const slot of archetype.slots) {
    const entity: Entity = {
      name: `${archetype.machineId}/${slot.slotName}`,
      machineSlot: {
        machineId: archetype.machineId,
        slotName: slot.slotName,
        removable: slot.removable,
        findableTier: slot.findableTier,
      },
      ...structuredClone(slot.components),
    };
    world.add(entity);
    entities.push(entity);
  }
  return entities;
}

/**
 * Remove all entities that were spawned for a machine.
 */
export function despawnMachine(entities: Entity[]): void {
  for (const entity of entities) {
    world.remove(entity);
  }
}
