import type {MaterialPreset} from '../../materialPresets';
import type {GeometryType} from '../../types';
import type {DialConfig} from '../primitives';
import {dialSlots} from '../primitives';
import type {SlotDefinition} from '../types';

export interface HeatMachineConfig {
  housing: SlotDefinition[];
  dialConfig: DialConfig;
  burner: {
    geometry: {type: GeometryType; args: number[]};
    color: number | string;
    preset?: MaterialPreset;
    position: [number, number, number];
  };
}

/**
 * Compose Tier 1 primitives into a heat (gas) machine template.
 *
 * 1. Housing slots are passed through as-is (no vibration for heat machines).
 * 2. Generates dial slots via dialSlots().
 * 3. Adds a burner entity slot with the specified geometry/material/position.
 * 4. Appends a power-source entity slot (type: 'gas').
 */
export function heatMachineSlots(config: HeatMachineConfig): SlotDefinition[] {
  // 1 — housing slots unmodified
  const housing = config.housing;

  // 2 — generate dial slots from Tier 1 primitive
  const dialControlSlots = dialSlots(config.dialConfig);

  // 3 — burner entity slot
  const burnerSlot: SlotDefinition = {
    slotName: 'burner',
    components: {
      geometry: {type: config.burner.geometry.type, args: config.burner.geometry.args},
      material: {
        type: 'standard',
        preset: config.burner.preset,
        color: config.burner.color,
      },
      transform: {
        position: config.burner.position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    },
  };

  // 4 — power-source entity slot
  const powerSourceSlot: SlotDefinition = {
    slotName: 'power-source',
    components: {
      powerSource: {
        type: 'gas',
        powerLevel: 0,
        active: false,
      },
    },
  };

  return [...housing, ...dialControlSlots, burnerSlot, powerSourceSlot];
}
