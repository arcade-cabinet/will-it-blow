import type {Entity} from '../types';
import {world} from '../world';
import type {MachineArchetype} from './types';

/**
 * Spawn all entities for a machine archetype at a world position.
 *
 * Slot transform positions are offset by worldPos (full 3D station origin)
 * plus counterY (additional Y offset for counter surface height above the
 * station's world Y). Final Y = slot.y + worldPos[1] + counterY.
 */
export function spawnMachine(
  archetype: MachineArchetype,
  worldPos: [number, number, number],
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
    // Offset transform by full world position + counterY on top
    if (entity.transform) {
      entity.transform = {
        ...entity.transform,
        position: [
          entity.transform.position[0] + worldPos[0],
          entity.transform.position[1] + worldPos[1] + counterY,
          entity.transform.position[2] + worldPos[2],
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
