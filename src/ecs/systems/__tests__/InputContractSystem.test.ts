import type {Entity} from '../../types';
import {updateContracts} from '../InputContractSystem';

describe('InputContractSystem', () => {
  it('maps a dial segment index through segmentMap to a target field', () => {
    const dial: Entity = {
      name: 'heat-dial',
      dial: {
        segments: ['off', 'low', 'medium', 'high'],
        currentIndex: 2,
        wraps: false,
        pendingTap: false,
        enabled: true,
      },
    };
    const stove: Entity = {
      name: 'stove-power',
      powerSource: {type: 'gas', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'stove',
        bindings: [
          {
            source: {entityName: 'heat-dial', field: 'dial.currentIndex'},
            target: {entityName: 'stove-power', field: 'powerSource.powerLevel'},
            transform: {type: 'segmentMap', map: {'0': 0, '1': 0.33, '2': 0.66, '3': 1.0}},
          },
        ],
      },
    };

    updateContracts([contract], [dial, stove, contract]);
    expect(stove.powerSource!.powerLevel).toBeCloseTo(0.66);
  });

  it('applies linear transform with scale and offset', () => {
    const crank: Entity = {
      name: 'grinder-crank',
      crank: {
        angle: 0,
        angularVelocity: 10,
        sensitivity: 1,
        damping: 0.5,
        dragDelta: 0,
        isDragging: false,
        enabled: true,
      },
    };
    const target: Entity = {
      name: 'grinder-motor',
      powerSource: {type: 'manual', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'grinder',
        bindings: [
          {
            source: {entityName: 'grinder-crank', field: 'crank.angularVelocity'},
            target: {entityName: 'grinder-motor', field: 'powerSource.powerLevel'},
            transform: {type: 'linear', scale: 0.1, offset: 0, clamp: [0, 1]},
          },
        ],
      },
    };

    updateContracts([contract], [crank, target, contract]);
    // 10 * 0.1 + 0 = 1.0 (clamped to 1.0)
    expect(target.powerSource!.powerLevel).toBeCloseTo(1.0);
  });

  it('applies linear transform with clamping', () => {
    const source: Entity = {
      name: 'src',
      plunger: {
        displacement: 0.8,
        axis: 'y',
        minWorld: 0,
        maxWorld: 1,
        sensitivity: 1,
        dragDelta: 0,
        isDragging: false,
        springBack: false,
        enabled: true,
      },
    };
    const target: Entity = {
      name: 'tgt',
      fillDriven: {minY: 0, maxY: 1, fillLevel: 0},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'stuffer',
        bindings: [
          {
            source: {entityName: 'src', field: 'plunger.displacement'},
            target: {entityName: 'tgt', field: 'fillDriven.fillLevel'},
            transform: {type: 'linear', scale: 2.0, clamp: [0, 1]},
          },
        ],
      },
    };

    updateContracts([contract], [source, target, contract]);
    // 0.8 * 2.0 = 1.6, clamped to 1.0
    expect(target.fillDriven!.fillLevel).toBe(1);
  });

  it('applies threshold transform', () => {
    const toggle: Entity = {
      name: 'power-switch',
      toggle: {isOn: true, pendingTap: false, enabled: true},
    };
    const target: Entity = {
      name: 'machine',
      powerSource: {type: 'electric', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'grinder',
        bindings: [
          {
            source: {entityName: 'power-switch', field: 'toggle.isOn'},
            target: {entityName: 'machine', field: 'powerSource.active'},
            transform: {type: 'threshold', value: 1, above: true, below: false},
          },
        ],
      },
    };

    updateContracts([contract], [toggle, target, contract]);
    // true → Number(true) = 1 → >= 1 → above = true
    expect(target.powerSource!.active).toBe(true);
  });

  it('applies passthrough transform', () => {
    const toggle: Entity = {
      name: 'switch',
      toggle: {isOn: true, pendingTap: false, enabled: true},
    };
    const target: Entity = {
      name: 'light',
      vibration: {frequency: 1, amplitude: 0.1, active: false, axes: ['y']},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'grinder',
        bindings: [
          {
            source: {entityName: 'switch', field: 'toggle.isOn'},
            target: {entityName: 'light', field: 'vibration.active'},
            transform: {type: 'passthrough'},
          },
        ],
      },
    };

    updateContracts([contract], [toggle, target, contract]);
    expect(target.vibration!.active).toBe(true);
  });

  it('skips binding when source entity is not found', () => {
    const target: Entity = {
      name: 'target',
      powerSource: {type: 'gas', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'stove',
        bindings: [
          {
            source: {entityName: 'nonexistent', field: 'dial.currentIndex'},
            target: {entityName: 'target', field: 'powerSource.powerLevel'},
            transform: {type: 'passthrough'},
          },
        ],
      },
    };

    expect(() => updateContracts([contract], [target, contract])).not.toThrow();
    expect(target.powerSource!.powerLevel).toBe(0); // unchanged
  });

  it('skips binding when target entity is not found', () => {
    const source: Entity = {
      name: 'dial',
      dial: {
        segments: ['a'],
        currentIndex: 0,
        wraps: false,
        pendingTap: false,
        enabled: true,
      },
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'stove',
        bindings: [
          {
            source: {entityName: 'dial', field: 'dial.currentIndex'},
            target: {entityName: 'nonexistent', field: 'powerSource.powerLevel'},
            transform: {type: 'passthrough'},
          },
        ],
      },
    };

    expect(() => updateContracts([contract], [source, contract])).not.toThrow();
  });

  it('skips binding when source field path is invalid', () => {
    const source: Entity = {
      name: 'src',
      toggle: {isOn: true, pendingTap: false, enabled: true},
    };
    const target: Entity = {
      name: 'tgt',
      powerSource: {type: 'gas', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'stove',
        bindings: [
          {
            source: {entityName: 'src', field: 'nonexistent.deep.path'},
            target: {entityName: 'tgt', field: 'powerSource.powerLevel'},
            transform: {type: 'passthrough'},
          },
        ],
      },
    };

    expect(() => updateContracts([contract], [source, target, contract])).not.toThrow();
    expect(target.powerSource!.powerLevel).toBe(0); // unchanged
  });

  it('handles multiple bindings in one contract', () => {
    const dial: Entity = {
      name: 'dial',
      dial: {
        segments: ['off', 'on'],
        currentIndex: 1,
        wraps: false,
        pendingTap: false,
        enabled: true,
      },
    };
    const toggle: Entity = {
      name: 'toggle',
      toggle: {isOn: true, pendingTap: false, enabled: true},
    };
    const target: Entity = {
      name: 'motor',
      powerSource: {type: 'electric', powerLevel: 0, active: false},
    };
    const contract: Entity = {
      inputContract: {
        machineId: 'grinder',
        bindings: [
          {
            source: {entityName: 'dial', field: 'dial.currentIndex'},
            target: {entityName: 'motor', field: 'powerSource.powerLevel'},
            transform: {type: 'segmentMap', map: {'0': 0, '1': 1}},
          },
          {
            source: {entityName: 'toggle', field: 'toggle.isOn'},
            target: {entityName: 'motor', field: 'powerSource.active'},
            transform: {type: 'passthrough'},
          },
        ],
      },
    };

    updateContracts([contract], [dial, toggle, target, contract]);
    expect(target.powerSource!.powerLevel).toBe(1);
    expect(target.powerSource!.active).toBe(true);
  });

  it('handles empty contract entity list', () => {
    expect(() => updateContracts([], [])).not.toThrow();
  });
});
