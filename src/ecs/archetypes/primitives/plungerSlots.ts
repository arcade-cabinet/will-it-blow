import type {MaterialPreset} from '../../materialPresets';
import type {GeometryType} from '../../types';
import type {SlotDefinition} from '../types';

export interface PlungerConfig {
  prefix: string;
  position: [number, number, number];
  axis: 'x' | 'y' | 'z';
  minWorld: number;
  maxWorld: number;
  sensitivity: number;
  springBack: boolean;
  hitboxGeometry: {type: GeometryType; args: number[]};
  parts: Array<{
    name: string;
    geometry: {type: GeometryType; args: number[]};
    color: number | string;
    preset?: MaterialPreset;
    offset: [number, number, number];
  }>;
}

/**
 * Create slot definitions for a linear-drag plunger/slider/lever.
 *
 * Returns N+1 slots: 1 invisible hitbox with the plunger component,
 * plus 1 visual mesh per part entry.
 */
export function plungerSlots(config: PlungerConfig): SlotDefinition[] {
  const slots: SlotDefinition[] = [];

  // Invisible hitbox — receives pointer events
  slots.push({
    slotName: `${config.prefix}-hitbox`,
    components: {
      geometry: {type: config.hitboxGeometry.type, args: config.hitboxGeometry.args},
      material: {
        type: 'basic',
        preset: 'invisible',
        color: 0x000000,
      },
      transform: {
        position: config.position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      plunger: {
        displacement: 0,
        axis: config.axis,
        minWorld: config.minWorld,
        maxWorld: config.maxWorld,
        sensitivity: config.sensitivity,
        dragDelta: 0,
        isDragging: false,
        springBack: config.springBack,
        enabled: true,
      },
      isHitbox: true,
    },
  });

  // Visual parts
  for (const part of config.parts) {
    slots.push({
      slotName: `${config.prefix}-${part.name}`,
      components: {
        geometry: {type: part.geometry.type, args: part.geometry.args},
        material: {
          type: 'standard',
          preset: part.preset,
          color: part.color,
        },
        transform: {
          position: [
            config.position[0] + part.offset[0],
            config.position[1] + part.offset[1],
            config.position[2] + part.offset[2],
          ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
    });
  }

  return slots;
}
