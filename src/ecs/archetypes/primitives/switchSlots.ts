import type {MaterialPreset} from '../../materialPresets';
import type {GeometryType} from '../../types';
import type {SlotDefinition} from '../types';

export interface SwitchConfig {
  prefix: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  bodyGeometry: {type: GeometryType; args: number[]};
  bodyColor: number | string;
  bodyPreset?: MaterialPreset;
  notch?: {
    geometry: {type: GeometryType; args: number[]};
    color: number | string;
    offset: [number, number, number];
    rotationRange: number;
  };
}

/**
 * Create slot definitions for a binary on/off switch.
 *
 * Convenience wrapper that uses a `toggle` component (NOT a 2-segment dial).
 * Returns 1 slot (body only) or 2 slots (body + notch indicator).
 */
export function switchSlots(config: SwitchConfig): SlotDefinition[] {
  const slots: SlotDefinition[] = [];
  const rot = config.rotation ?? [0, 0, 0];

  slots.push({
    slotName: `${config.prefix}-body`,
    components: {
      geometry: {type: config.bodyGeometry.type, args: config.bodyGeometry.args},
      material: {
        type: 'standard',
        preset: config.bodyPreset,
        color: config.bodyColor,
      },
      transform: {
        position: config.position,
        rotation: rot,
        scale: [1, 1, 1],
      },
      toggle: {
        isOn: false,
        pendingTap: false,
        enabled: true,
      },
    },
  });

  if (config.notch) {
    const {notch} = config;
    slots.push({
      slotName: `${config.prefix}-notch`,
      components: {
        geometry: {type: notch.geometry.type, args: notch.geometry.args},
        material: {
          type: 'standard',
          color: notch.color,
        },
        transform: {
          position: [
            config.position[0] + notch.offset[0],
            config.position[1] + notch.offset[1],
            config.position[2] + notch.offset[2],
          ],
          rotation: rot,
          scale: [1, 1, 1],
        },
      },
    });
  }

  return slots;
}
