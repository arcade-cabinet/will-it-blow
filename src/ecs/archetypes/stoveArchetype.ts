import {heatMachineSlots} from './templates';
import type {MachineArchetype, SlotDefinition} from './types';

/**
 * Stove housing: stovetop surface and grate.
 *
 * Positions are LOCAL to furniture surface origin.
 */
const STOVE_HOUSING: SlotDefinition[] = [
  {
    slotName: 'stovetop',
    components: {
      geometry: {type: 'box', args: [1.2, 0.1, 1.2]},
      material: {type: 'standard', color: 0x333333, roughness: 0.8, metalness: 0.5},
      transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      isStatic: true,
    },
  },
  {
    slotName: 'grate',
    components: {
      geometry: {type: 'cylinder', args: [0.4, 0.4, 0.02, 24]},
      material: {type: 'standard', color: 0x222222, roughness: 0.9, metalness: 0.7},
      transform: {position: [0, 0.06, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
];

/**
 * Stove-specific slots beyond the heat machine template.
 */
const STOVE_EXTRA: SlotDefinition[] = [
  {
    slotName: 'pan-body',
    findableTier: 'medium',
    components: {
      geometry: {type: 'cylinder', args: [0.4, 0.4, 0.06, 24]},
      material: {type: 'standard', color: 0x333338, metalness: 0.7, roughness: 0.3},
      transform: {position: [0, 0.12, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
  {
    slotName: 'pan-handle',
    components: {
      geometry: {type: 'box', args: [0.06, 0.04, 0.5]},
      material: {type: 'standard', color: 0x1e1e24},
      transform: {position: [0, 0.12, 0.65], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
];

/**
 * Input contract: wires the dial segment to power source level and active state.
 */
const STOVE_CONTRACT: SlotDefinition = {
  slotName: 'contract',
  components: {
    inputContract: {
      machineId: 'stove',
      bindings: [
        // dial segment -> power source level
        {
          source: {entityName: 'stove/heat-control-body', field: 'dial.currentIndex'},
          target: {entityName: 'stove/power-source', field: 'powerSource.powerLevel'},
          transform: {type: 'segmentMap', map: {'0': 0, '1': 0.33, '2': 0.66, '3': 1.0}},
        },
        // dial segment -> power source active
        {
          source: {entityName: 'stove/heat-control-body', field: 'dial.currentIndex'},
          target: {entityName: 'stove/power-source', field: 'powerSource.active'},
          transform: {type: 'threshold', value: 1, above: true, below: false},
        },
      ],
    },
  },
};

/**
 * Complete stove archetype.
 *
 * Composition:
 * - Tier 2: heatMachineSlots (housing + dial + burner + power-source)
 * - Machine-specific: pan-body, pan-handle, contract
 */
export const STOVE_ARCHETYPE: MachineArchetype = {
  machineId: 'stove',
  slots: [
    ...heatMachineSlots({
      housing: STOVE_HOUSING,
      dialConfig: {
        prefix: 'heat-control',
        segments: ['off', 'low', 'medium', 'high'],
        wraps: true,
        position: [0.5, 0.1, 0],
        bodyGeometry: {type: 'cylinder', args: [0.06, 0.06, 0.04, 12]},
        bodyColor: 0xcc3333, // red dial — [0.8, 0.2, 0.2] as hex
      },
      burner: {
        geometry: {type: 'torus', args: [0.35, 0.03, 12, 24]},
        color: 0x3d0d05,
        position: [0, 0.06, 0],
      },
    }),
    ...STOVE_EXTRA,
    STOVE_CONTRACT,
  ],
};
