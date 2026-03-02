import type {MaterialPreset} from '../../materialPresets';
import type {GeometryType} from '../../types';
import type {SlotDefinition} from '../types';

export interface CrankConfig {
  prefix: string;
  position: [number, number, number];
  sensitivity: number;
  damping: number;
  handleGeometry: {type: GeometryType; args: number[]};
  handleColor: number | string;
  handlePreset?: MaterialPreset;
  armGeometry: {type: GeometryType; args: number[]};
  armColor: number | string;
  armPreset?: MaterialPreset;
  armOffset: [number, number, number];
}

/**
 * Create slot definitions for a continuous rotary crank.
 *
 * Returns 2 slots: a draggable handle and a decorative arm.
 */
export function crankSlots(config: CrankConfig): SlotDefinition[] {
  return [
    {
      slotName: `${config.prefix}-handle`,
      components: {
        geometry: {type: config.handleGeometry.type, args: config.handleGeometry.args},
        material: {
          type: 'standard',
          preset: config.handlePreset,
          color: config.handleColor,
        },
        transform: {
          position: config.position,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        crank: {
          angle: 0,
          angularVelocity: 0,
          sensitivity: config.sensitivity,
          damping: config.damping,
          dragDelta: 0,
          isDragging: false,
          enabled: true,
        },
      },
    },
    {
      slotName: `${config.prefix}-arm`,
      components: {
        geometry: {type: config.armGeometry.type, args: config.armGeometry.args},
        material: {
          type: 'standard',
          preset: config.armPreset,
          color: config.armColor,
        },
        transform: {
          position: [
            config.position[0] + config.armOffset[0],
            config.position[1] + config.armOffset[1],
            config.position[2] + config.armOffset[2],
          ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
    },
  ];
}
