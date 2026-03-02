import {mechanicalMachineSlots} from './templates';
import type {MachineArchetype, SlotDefinition} from './types';

/**
 * Stuffer housing: canister body and spout tube.
 *
 * Positions are LOCAL to furniture surface origin.
 */
const STUFFER_HOUSING: SlotDefinition[] = [
  {
    slotName: 'canister',
    components: {
      geometry: {type: 'cylinder', args: [0.25, 0.25, 1.0, 16]},
      material: {type: 'basic', color: 0x999999},
      transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
  {
    slotName: 'spout',
    components: {
      geometry: {type: 'cylinder', args: [0.06, 0.048, 0.4, 8]},
      material: {type: 'basic', color: 0x888888},
      transform: {position: [0, -0.44, 0.45], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1]},
    },
  },
];

/**
 * Stuffer-specific slots beyond the mechanical machine template.
 */
const STUFFER_EXTRA: SlotDefinition[] = [
  {
    slotName: 'plunger-disc',
    components: {
      geometry: {type: 'cylinder', args: [0.2375, 0.2375, 0.15, 16]},
      material: {type: 'basic', color: 0x777777},
      transform: {position: [0, 0.425, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      fillDriven: {minY: -0.425, maxY: 0.425, fillLevel: 0},
    },
  },
  {
    slotName: 'nozzle',
    components: {
      geometry: {type: 'cylinder', args: [0.048, 0.03, 0.2, 8]},
      material: {type: 'basic', color: 0x888888},
      transform: {position: [0, -0.44, 0.85], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1]},
    },
  },
];

/**
 * Input contract: wires the crank angular velocity to the power source
 * level and canister vibration amplitude.
 */
const STUFFER_CONTRACT: SlotDefinition = {
  slotName: 'contract',
  components: {
    inputContract: {
      machineId: 'stuffer',
      bindings: [
        // crank angular velocity -> power source level (proportional)
        {
          source: {entityName: 'stuffer/crank-handle', field: 'crank.angularVelocity'},
          target: {entityName: 'stuffer/power-source', field: 'powerSource.powerLevel'},
          transform: {type: 'linear', scale: 0.2, clamp: [0, 1]},
        },
        // crank angular velocity -> vibration amplitude (proportional)
        {
          source: {entityName: 'stuffer/crank-handle', field: 'crank.angularVelocity'},
          target: {entityName: 'stuffer/canister', field: 'vibration.amplitude'},
          transform: {type: 'linear', scale: 0.001, clamp: [0, 0.003]},
        },
      ],
    },
  },
};

/**
 * Complete stuffer archetype.
 *
 * Composition:
 * - Tier 2: mechanicalMachineSlots (housing + crank + vibration + power-source)
 * - Machine-specific: plunger-disc (fill-driven), nozzle, contract
 */
export const STUFFER_ARCHETYPE: MachineArchetype = {
  machineId: 'stuffer',
  slots: [
    ...mechanicalMachineSlots({
      housing: STUFFER_HOUSING,
      crankConfig: {
        prefix: 'crank',
        position: [0.4, 0.2, 0],
        sensitivity: 0.5,
        damping: 3.0,
        handleGeometry: {type: 'sphere', args: [0.06, 8, 8]},
        handleColor: 0x555555,
        armGeometry: {type: 'cylinder', args: [0.03, 0.03, 0.3, 8]},
        armColor: 0x666666,
        armOffset: [-0.15, 0, 0],
      },
      vibrationProportional: {
        frequencyBase: 8,
        amplitudeScale: 0.005,
        axes: ['x', 'z'],
      },
    }),
    ...STUFFER_EXTRA,
    STUFFER_CONTRACT,
  ],
};
