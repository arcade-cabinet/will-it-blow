import {plungerSlots} from './primitives';
import {poweredMachineSlots} from './templates';
import type {MachineArchetype, SlotDefinition} from './types';

/**
 * Grinder housing: motor block, extruder tube, and ingredient chute.
 *
 * Positions are LOCAL to furniture surface origin.
 */
const GRINDER_HOUSING: SlotDefinition[] = [
  {
    slotName: 'motor-block',
    findableTier: 'medium-well',
    components: {
      geometry: {type: 'box', args: [4, 4.5, 5]},
      material: {type: 'standard', preset: 'polished-metal', color: 0xe0e0e0},
      transform: {position: [0, 2.25, -2], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
  {
    slotName: 'extruder',
    components: {
      geometry: {type: 'cylinder', args: [1.0, 1.0, 4, 32]},
      material: {type: 'standard', preset: 'polished-metal', color: 0xe0e0e0},
      transform: {position: [0, 2.5, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1]},
    },
  },
  {
    slotName: 'chute',
    components: {
      geometry: {type: 'cylinder', args: [1.2, 0.8, 2.5, 32]},
      material: {type: 'standard', preset: 'polished-metal', color: 0xe0e0e0},
      transform: {position: [0, 4.5, 0.5], rotation: [0, 0, 0], scale: [1, 1, 1]},
    },
  },
];

/**
 * Grinder-specific slots beyond the powered machine template.
 */
const GRINDER_EXTRA: SlotDefinition[] = [
  {
    slotName: 'faceplate',
    findableTier: 'medium-well',
    components: {
      geometry: {type: 'cylinder', args: [1.05, 1.05, 0.2, 32]},
      material: {type: 'standard', preset: 'dark-metal', color: 0x444444},
      transform: {position: [0, 2.5, 2.0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1]},
      rotation: {axis: 'y', speed: 5, active: false},
    },
  },
  {
    slotName: 'tray',
    findableTier: 'well-done',
    components: {
      geometry: {type: 'box', args: [5, 0.3, 4]},
      material: {type: 'standard', preset: 'polished-metal', color: 0xe0e0e0},
      transform: {position: [0, 5.6, 0.5], rotation: [0, 0, 0], scale: [1, 1, 1]},
      isStatic: true,
    },
  },
];

/**
 * Plunger slots for pushing ingredients down the chute.
 */
const GRINDER_PLUNGER = plungerSlots({
  prefix: 'plunger',
  position: [3, 5.6, 0.5],
  axis: 'y',
  minWorld: 3,
  maxWorld: 7,
  sensitivity: 1.0,
  springBack: true,
  hitboxGeometry: {type: 'cylinder', args: [1.5, 1.5, 5]},
  parts: [
    {
      name: 'shaft',
      geometry: {type: 'cylinder', args: [0.75, 0.75, 3]},
      color: 0xffffff,
      preset: 'plastic',
      offset: [0, 1.5, 0],
    },
    {
      name: 'guard',
      geometry: {type: 'cylinder', args: [1.2, 1.2, 0.2]},
      color: 0xffffff,
      preset: 'plastic',
      offset: [0, 3, 0],
    },
    {
      name: 'handle',
      geometry: {type: 'cylinder', args: [0.3, 0.3, 1.5]},
      color: 0xffffff,
      preset: 'plastic',
      offset: [0, 3.8, 0],
    },
  ],
});

/**
 * Input contract: wires the switch to vibration, faceplate rotation,
 * and the power source.
 */
const GRINDER_CONTRACT: SlotDefinition = {
  slotName: 'contract',
  components: {
    inputContract: {
      machineId: 'grinder',
      bindings: [
        // switch -> vibration on housing
        {
          source: {entityName: 'grinder/switch-body', field: 'toggle.isOn'},
          target: {entityName: 'grinder/motor-block', field: 'vibration.active'},
          transform: {type: 'passthrough'},
        },
        {
          source: {entityName: 'grinder/switch-body', field: 'toggle.isOn'},
          target: {entityName: 'grinder/extruder', field: 'vibration.active'},
          transform: {type: 'passthrough'},
        },
        {
          source: {entityName: 'grinder/switch-body', field: 'toggle.isOn'},
          target: {entityName: 'grinder/chute', field: 'vibration.active'},
          transform: {type: 'passthrough'},
        },
        // switch -> faceplate rotation
        {
          source: {entityName: 'grinder/switch-body', field: 'toggle.isOn'},
          target: {entityName: 'grinder/faceplate', field: 'rotation.active'},
          transform: {type: 'passthrough'},
        },
        // switch -> power source
        {
          source: {entityName: 'grinder/switch-body', field: 'toggle.isOn'},
          target: {entityName: 'grinder/power-source', field: 'powerSource.active'},
          transform: {type: 'passthrough'},
        },
      ],
    },
  },
};

/**
 * Complete grinder archetype.
 *
 * Composition:
 * - Tier 2: poweredMachineSlots (housing + switch + vibration + power-source)
 * - Machine-specific: faceplate, tray, plunger (hitbox + 3 parts), contract
 */
export const GRINDER_ARCHETYPE: MachineArchetype = {
  machineId: 'grinder',
  slots: [
    ...poweredMachineSlots({
      housing: GRINDER_HOUSING,
      controlType: 'switch',
      controlConfig: {
        prefix: 'switch',
        position: [2.1, 3, -2],
        rotation: [0, 0, Math.PI / 2],
        bodyGeometry: {type: 'cylinder', args: [0.6, 0.6, 0.5, 16]},
        bodyColor: 0xe0e0e0,
        bodyPreset: 'polished-metal',
        notch: {
          geometry: {type: 'box', args: [0.1, 1.0, 0.1]},
          color: 0x444444,
          offset: [0.25, 0, 0],
          rotationRange: Math.PI / 4,
        },
      },
      vibrationWhenPowered: {
        frequency: 12,
        amplitude: 0.002,
        axes: ['x', 'y', 'z'],
      },
    }),
    ...GRINDER_EXTRA,
    ...GRINDER_PLUNGER,
    GRINDER_CONTRACT,
  ],
};
