import type {CrankConfig, DialConfig, SwitchConfig} from '../../primitives';
import type {SlotDefinition} from '../../types';
import type {HeatMachineConfig} from '../heatMachine';
import {heatMachineSlots} from '../heatMachine';
import type {MechanicalMachineConfig} from '../mechanicalMachine';
import {mechanicalMachineSlots} from '../mechanicalMachine';
import type {PoweredMachineConfig} from '../poweredMachine';
import {poweredMachineSlots} from '../poweredMachine';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const makeHousing = (count: number): SlotDefinition[] =>
  Array.from({length: count}, (_, i) => ({
    slotName: `housing-${i}`,
    components: {
      geometry: {type: 'box' as const, args: [1, 1, 1]},
      material: {type: 'standard' as const, color: 0x999999},
      transform: {
        position: [i, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
      },
    },
  }));

const switchConfig: SwitchConfig = {
  prefix: 'pwr',
  position: [0, 1, 0],
  bodyGeometry: {type: 'box', args: [0.2, 0.1, 0.1]},
  bodyColor: 0x444444,
};

const switchConfigWithNotch: SwitchConfig = {
  ...switchConfig,
  notch: {
    geometry: {type: 'box', args: [0.05, 0.08, 0.02]},
    color: 0xffffff,
    offset: [0, 0.05, 0.05],
    rotationRange: Math.PI / 4,
  },
};

const dialConfig: DialConfig = {
  prefix: 'speed',
  segments: ['off', 'low', 'high'],
  wraps: false,
  position: [0, 1.5, 0],
  bodyGeometry: {type: 'cylinder', args: [0.3, 0.3, 0.1, 16]},
  bodyColor: 0x888888,
};

const dialConfigWithNotch: DialConfig = {
  ...dialConfig,
  notch: {
    geometry: {type: 'sphere', args: [0.05, 8, 8]},
    color: 0xff0000,
    offset: [0, 0.1, 0],
    rotationRange: Math.PI,
  },
};

const crankConfig: CrankConfig = {
  prefix: 'crank',
  position: [0, 1, 0],
  sensitivity: 0.01,
  damping: 0.95,
  handleGeometry: {type: 'sphere', args: [0.15, 16, 16]},
  handleColor: 0x333333,
  armGeometry: {type: 'cylinder', args: [0.03, 0.03, 0.5, 8]},
  armColor: 0x666666,
  armOffset: [0.3, 0, 0],
};

// ---------------------------------------------------------------------------
// poweredMachineSlots
// ---------------------------------------------------------------------------

describe('poweredMachineSlots', () => {
  describe('with switch control (no notch)', () => {
    const config: PoweredMachineConfig = {
      housing: makeHousing(3),
      controlType: 'switch',
      controlConfig: switchConfig,
      vibrationWhenPowered: {frequency: 12, amplitude: 0.002, axes: ['x', 'y']},
    };

    it('returns housing + control + power-source slots', () => {
      const slots = poweredMachineSlots(config);
      // 3 housing + 1 switch body + 1 power-source = 5
      expect(slots).toHaveLength(5);
    });

    it('housing slots have vibration component added', () => {
      const slots = poweredMachineSlots(config);
      for (let i = 0; i < 3; i++) {
        expect(slots[i].components.vibration).toBeDefined();
        expect(slots[i].components.vibration!.frequency).toBe(12);
        expect(slots[i].components.vibration!.amplitude).toBe(0.002);
        expect(slots[i].components.vibration!.axes).toEqual(['x', 'y']);
      }
    });

    it('vibration defaults to active: false', () => {
      const slots = poweredMachineSlots(config);
      for (let i = 0; i < 3; i++) {
        expect(slots[i].components.vibration!.active).toBe(false);
      }
    });

    it('housing slots preserve original components', () => {
      const slots = poweredMachineSlots(config);
      expect(slots[0].components.geometry).toEqual({type: 'box', args: [1, 1, 1]});
      expect(slots[0].components.transform!.position).toEqual([0, 0, 0]);
      expect(slots[2].components.transform!.position).toEqual([2, 0, 0]);
    });

    it('control slots from switchSlots() are included', () => {
      const slots = poweredMachineSlots(config);
      expect(slots[3].slotName).toBe('pwr-body');
      expect(slots[3].components.toggle).toBeDefined();
    });

    it('power-source slot exists with type electric', () => {
      const slots = poweredMachineSlots(config);
      const ps = slots[slots.length - 1];
      expect(ps.slotName).toBe('power-source');
      expect(ps.components.powerSource).toEqual({
        type: 'electric',
        powerLevel: 0,
        active: false,
      });
    });
  });

  describe('with switch control (with notch)', () => {
    const config: PoweredMachineConfig = {
      housing: makeHousing(2),
      controlType: 'switch',
      controlConfig: switchConfigWithNotch,
      vibrationWhenPowered: {frequency: 10, amplitude: 0.001, axes: ['z']},
    };

    it('returns housing + switch body + switch notch + power-source', () => {
      const slots = poweredMachineSlots(config);
      // 2 housing + 2 switch (body+notch) + 1 power-source = 5
      expect(slots).toHaveLength(5);
    });

    it('includes both switch body and notch slots', () => {
      const slots = poweredMachineSlots(config);
      expect(slots[2].slotName).toBe('pwr-body');
      expect(slots[3].slotName).toBe('pwr-notch');
    });
  });

  describe('with dial control (no notch)', () => {
    const config: PoweredMachineConfig = {
      housing: makeHousing(1),
      controlType: 'dial',
      controlConfig: dialConfig,
      vibrationWhenPowered: {frequency: 8, amplitude: 0.003, axes: ['x', 'y', 'z']},
    };

    it('returns housing + dial body + power-source', () => {
      const slots = poweredMachineSlots(config);
      // 1 housing + 1 dial body + 1 power-source = 3
      expect(slots).toHaveLength(3);
    });

    it('control slot has dial component (not toggle)', () => {
      const slots = poweredMachineSlots(config);
      expect(slots[1].slotName).toBe('speed-body');
      expect(slots[1].components.dial).toBeDefined();
      expect(slots[1].components.toggle).toBeUndefined();
    });
  });

  describe('with dial control (with notch)', () => {
    const config: PoweredMachineConfig = {
      housing: makeHousing(1),
      controlType: 'dial',
      controlConfig: dialConfigWithNotch,
      vibrationWhenPowered: {frequency: 8, amplitude: 0.003, axes: ['x']},
    };

    it('returns housing + dial body + dial notch + power-source', () => {
      const slots = poweredMachineSlots(config);
      // 1 housing + 2 dial (body+notch) + 1 power-source = 4
      expect(slots).toHaveLength(4);
    });
  });

  it('does not mutate original housing slots', () => {
    const housing = makeHousing(1);
    const original = {...housing[0].components};
    poweredMachineSlots({
      housing,
      controlType: 'switch',
      controlConfig: switchConfig,
      vibrationWhenPowered: {frequency: 10, amplitude: 0.01, axes: ['y']},
    });
    expect(housing[0].components.vibration).toBeUndefined();
    expect(housing[0].components).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// mechanicalMachineSlots
// ---------------------------------------------------------------------------

describe('mechanicalMachineSlots', () => {
  const config: MechanicalMachineConfig = {
    housing: makeHousing(2),
    crankConfig,
    vibrationProportional: {
      frequencyBase: 6,
      amplitudeScale: 0.005,
      axes: ['x', 'z'],
    },
  };

  it('returns housing + crank handle + crank arm + power-source', () => {
    const slots = mechanicalMachineSlots(config);
    // 2 housing + 2 crank (handle+arm) + 1 power-source = 5
    expect(slots).toHaveLength(5);
  });

  it('housing slots have vibration component added', () => {
    const slots = mechanicalMachineSlots(config);
    for (let i = 0; i < 2; i++) {
      expect(slots[i].components.vibration).toBeDefined();
      expect(slots[i].components.vibration!.frequency).toBe(6);
      expect(slots[i].components.vibration!.axes).toEqual(['x', 'z']);
    }
  });

  it('vibration amplitude starts at 0 (proportional to crank velocity)', () => {
    const slots = mechanicalMachineSlots(config);
    for (let i = 0; i < 2; i++) {
      expect(slots[i].components.vibration!.amplitude).toBe(0);
    }
  });

  it('vibration defaults to active: false', () => {
    const slots = mechanicalMachineSlots(config);
    for (let i = 0; i < 2; i++) {
      expect(slots[i].components.vibration!.active).toBe(false);
    }
  });

  it('housing slots preserve original components', () => {
    const slots = mechanicalMachineSlots(config);
    expect(slots[0].components.geometry).toEqual({type: 'box', args: [1, 1, 1]});
    expect(slots[1].components.transform!.position).toEqual([1, 0, 0]);
  });

  it('crank slots from crankSlots() are included', () => {
    const slots = mechanicalMachineSlots(config);
    expect(slots[2].slotName).toBe('crank-handle');
    expect(slots[2].components.crank).toBeDefined();
    expect(slots[3].slotName).toBe('crank-arm');
    expect(slots[3].components.crank).toBeUndefined();
  });

  it('power-source slot exists with type manual', () => {
    const slots = mechanicalMachineSlots(config);
    const ps = slots[slots.length - 1];
    expect(ps.slotName).toBe('power-source');
    expect(ps.components.powerSource).toEqual({
      type: 'manual',
      powerLevel: 0,
      active: false,
    });
  });

  it('does not mutate original housing slots', () => {
    const housing = makeHousing(1);
    const original = {...housing[0].components};
    mechanicalMachineSlots({
      housing,
      crankConfig,
      vibrationProportional: {frequencyBase: 6, amplitudeScale: 0.005, axes: ['y']},
    });
    expect(housing[0].components.vibration).toBeUndefined();
    expect(housing[0].components).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// heatMachineSlots
// ---------------------------------------------------------------------------

describe('heatMachineSlots', () => {
  const heatDialConfig: DialConfig = {
    prefix: 'heat',
    segments: ['off', 'low', 'medium', 'high'],
    wraps: true,
    position: [0, 0.8, 0.5],
    bodyGeometry: {type: 'cylinder', args: [0.2, 0.2, 0.08, 16]},
    bodyColor: 0x222222,
  };

  const config: HeatMachineConfig = {
    housing: makeHousing(2),
    dialConfig: heatDialConfig,
    burner: {
      geometry: {type: 'torus', args: [0.3, 0.05, 8, 24]},
      color: 0xff4400,
      preset: 'ceramic',
      position: [0, 0.5, 0],
    },
  };

  it('returns housing + dial body + burner + power-source', () => {
    const slots = heatMachineSlots(config);
    // 2 housing + 1 dial body + 1 burner + 1 power-source = 5
    expect(slots).toHaveLength(5);
  });

  it('housing slots do NOT have vibration component', () => {
    const slots = heatMachineSlots(config);
    for (let i = 0; i < 2; i++) {
      expect(slots[i].components.vibration).toBeUndefined();
    }
  });

  it('housing slots preserve original components', () => {
    const slots = heatMachineSlots(config);
    expect(slots[0].components.geometry).toEqual({type: 'box', args: [1, 1, 1]});
    expect(slots[1].components.transform!.position).toEqual([1, 0, 0]);
  });

  it('dial slots from dialSlots() are included', () => {
    const slots = heatMachineSlots(config);
    expect(slots[2].slotName).toBe('heat-body');
    expect(slots[2].components.dial).toBeDefined();
    expect(slots[2].components.dial!.segments).toEqual(['off', 'low', 'medium', 'high']);
  });

  it('burner slot has correct geometry, material, and position', () => {
    const slots = heatMachineSlots(config);
    const burner = slots[3];
    expect(burner.slotName).toBe('burner');
    expect(burner.components.geometry).toEqual({type: 'torus', args: [0.3, 0.05, 8, 24]});
    expect(burner.components.material!.color).toBe(0xff4400);
    expect(burner.components.material!.preset).toBe('ceramic');
    expect(burner.components.transform!.position).toEqual([0, 0.5, 0]);
  });

  it('power-source slot exists with type gas', () => {
    const slots = heatMachineSlots(config);
    const ps = slots[slots.length - 1];
    expect(ps.slotName).toBe('power-source');
    expect(ps.components.powerSource).toEqual({
      type: 'gas',
      powerLevel: 0,
      active: false,
    });
  });

  describe('with dial notch', () => {
    const configWithNotch: HeatMachineConfig = {
      ...config,
      dialConfig: {
        ...heatDialConfig,
        notch: {
          geometry: {type: 'sphere', args: [0.04, 8, 8]},
          color: 0xff0000,
          offset: [0, 0.05, 0],
          rotationRange: Math.PI,
        },
      },
    };

    it('includes dial notch, increasing slot count by 1', () => {
      const slots = heatMachineSlots(configWithNotch);
      // 2 housing + 2 dial (body+notch) + 1 burner + 1 power-source = 6
      expect(slots).toHaveLength(6);
      expect(slots[3].slotName).toBe('heat-notch');
    });
  });

  it('burner slot works without preset', () => {
    const configNoPreset: HeatMachineConfig = {
      ...config,
      burner: {
        geometry: {type: 'torus', args: [0.3, 0.05, 8, 24]},
        color: '#ff4400',
        position: [0, 0.5, 0],
      },
    };
    const slots = heatMachineSlots(configNoPreset);
    const burner = slots[3];
    expect(burner.components.material!.preset).toBeUndefined();
    expect(burner.components.material!.color).toBe('#ff4400');
  });
});

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------

describe('barrel export (templates/index.ts)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const barrel = require('../index');

  it('exports poweredMachineSlots', () => {
    expect(typeof barrel.poweredMachineSlots).toBe('function');
  });

  it('exports mechanicalMachineSlots', () => {
    expect(typeof barrel.mechanicalMachineSlots).toBe('function');
  });

  it('exports heatMachineSlots', () => {
    expect(typeof barrel.heatMachineSlots).toBe('function');
  });
});
