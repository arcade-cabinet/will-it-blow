import type {Entity} from '../types';
import {world} from '../world';
import type {MachineArchetype} from './types';

/**
 * Spawn all entities for a machine archetype mounted on furniture.
 *
 * Furniture (counters, tables, shelves) is placed at ground level.
 * Machines are closed-loop compositional systems mounted ON TOP of
 * furniture. The `surfacePos` is the furniture surface origin —
 * slot Y positions are relative to this surface.
 *
 * @param archetype  Machine definition with slot geometry
 * @param surfacePos [x, y, z] of the furniture surface the machine sits on
 */
export function spawnMachine(
  archetype: MachineArchetype,
  surfacePos: [number, number, number],
): Entity[] {
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
      ...slot.components,
    };
    // Slot positions are relative to furniture surface
    if (entity.transform) {
      entity.transform = {
        ...entity.transform,
        position: [
          entity.transform.position[0] + surfacePos[0],
          entity.transform.position[1] + surfacePos[1],
          entity.transform.position[2] + surfacePos[2],
        ],
      };
    }
    world.add(entity);
    entities.push(entity);
  }
  return entities;
}

export function despawnMachine(entities: Entity[]): void {
  for (const entity of entities) {
    world.remove(entity);
  }
}
