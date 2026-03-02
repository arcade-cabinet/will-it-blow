import type {MaterialPreset} from '../../materialPresets';
import type {GeometryType} from '../../types';
import type {SlotDefinition} from '../types';

export interface ButtonConfig {
  prefix: string;
  position: [number, number, number];
  geometry: {type: GeometryType; args: number[]};
  color: number | string;
  preset?: MaterialPreset;
}

/**
 * Create slot definitions for a one-shot impulse button.
 *
 * Returns 1 slot with a `button` component.
 */
export function buttonSlots(config: ButtonConfig): SlotDefinition[] {
  return [
    {
      slotName: `${config.prefix}-body`,
      components: {
        geometry: {type: config.geometry.type, args: config.geometry.args},
        material: {
          type: 'standard',
          preset: config.preset,
          color: config.color,
        },
        transform: {
          position: config.position,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        button: {
          fired: false,
          pendingTap: false,
          enabled: true,
        },
      },
    },
  ];
}
