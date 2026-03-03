import type {DialConfig, SwitchConfig} from '../primitives';
import {dialSlots, switchSlots} from '../primitives';
import type {SlotDefinition} from '../types';

export interface PoweredMachineConfig {
  housing: SlotDefinition[];
  controlType: 'switch' | 'dial';
  controlConfig: SwitchConfig | DialConfig;
  vibrationWhenPowered: {
    frequency: number;
    amplitude: number;
    axes: ('x' | 'y' | 'z')[];
  };
}

/**
 * Compose Tier 1 primitives into a powered (electric) machine template.
 *
 * 1. Adds vibration component (inactive by default) to every housing slot.
 * 2. Generates control slots via switchSlots() or dialSlots().
 * 3. Appends a power-source entity slot (type: 'electric').
 */
export function poweredMachineSlots(config: PoweredMachineConfig): SlotDefinition[] {
  // 1 — augment housing slots with vibration
  const housingWithVibration: SlotDefinition[] = config.housing.map(slot => ({
    ...slot,
    components: {
      ...slot.components,
      vibration: {
        frequency: config.vibrationWhenPowered.frequency,
        amplitude: config.vibrationWhenPowered.amplitude,
        active: false,
        axes: config.vibrationWhenPowered.axes,
      },
    },
  }));

  // 2 — generate control slots from Tier 1 primitive
  const controlSlots =
    config.controlType === 'switch'
      ? switchSlots(config.controlConfig as SwitchConfig)
      : dialSlots(config.controlConfig as DialConfig);

  // 3 — power-source entity slot
  const powerSourceSlot: SlotDefinition = {
    slotName: 'power-source',
    components: {
      powerSource: {
        type: 'electric',
        powerLevel: 0,
        active: false,
      },
    },
  };

  return [...housingWithVibration, ...controlSlots, powerSourceSlot];
}
