import type {CrankConfig} from '../primitives';
import {crankSlots} from '../primitives';
import type {SlotDefinition} from '../types';

export interface MechanicalMachineConfig {
  housing: SlotDefinition[];
  crankConfig: CrankConfig;
  vibrationProportional: {
    frequencyBase: number;
    amplitudeScale: number;
    axes: ('x' | 'y' | 'z')[];
  };
}

/**
 * Compose Tier 1 primitives into a mechanical (manual) machine template.
 *
 * 1. Adds vibration component (inactive, amplitude 0) to every housing slot.
 *    At runtime the InputContract wires crank.angularVelocity * amplitudeScale
 *    into vibration.amplitude — we just set up the component here.
 * 2. Generates crank slots via crankSlots().
 * 3. Appends a power-source entity slot (type: 'manual').
 */
export function mechanicalMachineSlots(config: MechanicalMachineConfig): SlotDefinition[] {
  // 1 — augment housing slots with vibration (amplitude starts at 0)
  const housingWithVibration: SlotDefinition[] = config.housing.map(slot => ({
    ...slot,
    components: {
      ...slot.components,
      vibration: {
        frequency: config.vibrationProportional.frequencyBase,
        amplitude: 0,
        active: false,
        axes: config.vibrationProportional.axes,
      },
    },
  }));

  // 2 — generate crank slots from Tier 1 primitive
  const crankControlSlots = crankSlots(config.crankConfig);

  // 3 — power-source entity slot
  const powerSourceSlot: SlotDefinition = {
    slotName: 'power-source',
    components: {
      powerSource: {
        type: 'manual',
        powerLevel: 0,
        active: false,
      },
    },
  };

  return [...housingWithVibration, ...crankControlSlots, powerSourceSlot];
}
