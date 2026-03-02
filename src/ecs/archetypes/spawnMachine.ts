import type {Entity} from '../types';
import {world} from '../world';
import type {MachineArchetype} from './types';

/**
 * Spawn all entities for a machine archetype at a world position.
 *
 * Slot transform positions are offset by worldXZ (horizontal placement)
 * and counterY (vertical — counter surface height). worldXZ is a 2-tuple
 * because machines always sit on a counter; their Y origin is the counter
 * surface, not the world Y of the station target.
 */
export function spawnMachine(
  archetype: MachineArchetype,
  worldXZ: [number, number],
  counterY: number,
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
    // Offset transform: X/Z from worldXZ, Y from counterY
    if (entity.transform) {
      entity.transform = {
        ...entity.transform,
        position: [
          entity.transform.position[0] + worldXZ[0],
          entity.transform.position[1] + counterY,
          entity.transform.position[2] + worldXZ[1],
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
