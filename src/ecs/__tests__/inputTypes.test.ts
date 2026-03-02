import {World} from 'miniplex';
import type {BindingTransform, InputBinding} from '../inputTypes';
import type {Entity} from '../types';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('Input primitive components', () => {
  let world: World<Entity>;

  beforeEach(() => {
    world = new World<Entity>();
  });

  describe('dial', () => {
    it('can create an entity with a dial component', () => {
      const entity = world.add({
        name: 'heat-dial',
        dial: {
          segments: ['off', 'low', 'medium', 'high'],
          currentIndex: 0,
          wraps: false,
          pendingTap: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(entity.dial!.segments).toEqual(['off', 'low', 'medium', 'high']);
      expect(entity.dial!.currentIndex).toBe(0);
      expect(entity.dial!.wraps).toBe(false);
    });

    it('queries entities with dial + three', () => {
      const dials = world.with('dial', 'three');

      world.add({
        name: 'dial-with-three',
        dial: {
          segments: ['off', 'on'],
          currentIndex: 0,
          wraps: true,
          pendingTap: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      // Entity without three should not appear in query
      world.add({
        name: 'dial-without-three',
        dial: {
          segments: ['off', 'on'],
          currentIndex: 0,
          wraps: true,
          pendingTap: false,
          enabled: true,
        },
      });

      expect(dials.entities).toHaveLength(1);
      expect(dials.entities[0].name).toBe('dial-with-three');
    });

    it('supports wrapping dial (cycles back to 0)', () => {
      const entity = world.add({
        dial: {
          segments: ['off', 'on'],
          currentIndex: 1,
          wraps: true,
          pendingTap: false,
          enabled: true,
        },
      });

      // Simulate advancing past last segment
      const next = (entity.dial!.currentIndex + 1) % entity.dial!.segments.length;
      entity.dial!.currentIndex = next;
      expect(entity.dial!.currentIndex).toBe(0);
    });
  });

  describe('crank', () => {
    it('can create an entity with a crank component', () => {
      const entity = world.add({
        name: 'grinder-crank',
        crank: {
          angle: 0,
          angularVelocity: 0,
          sensitivity: 0.01,
          damping: 0.95,
          dragDelta: 0,
          isDragging: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(entity.crank!.angle).toBe(0);
      expect(entity.crank!.sensitivity).toBe(0.01);
      expect(entity.crank!.damping).toBe(0.95);
    });

    it('queries entities with crank + three', () => {
      const cranks = world.with('crank', 'three');

      world.add({
        crank: {
          angle: 0,
          angularVelocity: 0,
          sensitivity: 0.01,
          damping: 0.95,
          dragDelta: 0,
          isDragging: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(cranks.entities).toHaveLength(1);
    });
  });

  describe('plunger', () => {
    it('can create an entity with a plunger component', () => {
      const entity = world.add({
        name: 'stuffer-plunger',
        plunger: {
          displacement: 0,
          axis: 'y',
          minWorld: 0,
          maxWorld: 2.5,
          sensitivity: 0.005,
          dragDelta: 0,
          isDragging: false,
          springBack: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(entity.plunger!.displacement).toBe(0);
      expect(entity.plunger!.axis).toBe('y');
      expect(entity.plunger!.springBack).toBe(false);
    });

    it('supports all axis options', () => {
      for (const axis of ['x', 'y', 'z'] as const) {
        const entity = world.add({
          plunger: {
            displacement: 0,
            axis,
            minWorld: -1,
            maxWorld: 1,
            sensitivity: 0.01,
            dragDelta: 0,
            isDragging: false,
            springBack: true,
            enabled: true,
          },
        });
        expect(entity.plunger!.axis).toBe(axis);
      }
    });
  });

  describe('toggle', () => {
    it('can create an entity with a toggle component', () => {
      const entity = world.add({
        name: 'power-switch',
        toggle: {
          isOn: false,
          pendingTap: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(entity.toggle!.isOn).toBe(false);
      expect(entity.toggle!.enabled).toBe(true);
    });

    it('can be toggled on and off', () => {
      const entity = world.add({
        toggle: {isOn: false, pendingTap: false, enabled: true},
      });

      entity.toggle!.isOn = !entity.toggle!.isOn;
      expect(entity.toggle!.isOn).toBe(true);

      entity.toggle!.isOn = !entity.toggle!.isOn;
      expect(entity.toggle!.isOn).toBe(false);
    });
  });

  describe('button', () => {
    it('can create an entity with a button component', () => {
      const entity = world.add({
        name: 'flip-button',
        button: {
          fired: false,
          pendingTap: false,
          enabled: true,
        },
        three: makeObject3D(),
      });

      expect(entity.button!.fired).toBe(false);
      expect(entity.button!.pendingTap).toBe(false);
    });

    it('simulates one-shot fire and reset cycle', () => {
      const entity = world.add({
        button: {fired: false, pendingTap: true, enabled: true},
      });

      // Simulate ButtonSystem consuming pendingTap
      if (entity.button!.pendingTap) {
        entity.button!.fired = true;
        entity.button!.pendingTap = false;
      }
      expect(entity.button!.fired).toBe(true);
      expect(entity.button!.pendingTap).toBe(false);

      // Reset after one frame
      entity.button!.fired = false;
      expect(entity.button!.fired).toBe(false);
    });
  });

  describe('powerSource', () => {
    it('can create an entity with a powerSource component', () => {
      const entity = world.add({
        name: 'grinder-motor',
        powerSource: {
          type: 'electric',
          powerLevel: 0,
          active: false,
        },
      });

      expect(entity.powerSource!.type).toBe('electric');
      expect(entity.powerSource!.powerLevel).toBe(0);
      expect(entity.powerSource!.active).toBe(false);
    });

    it('supports all power source types', () => {
      for (const type of ['electric', 'gas', 'manual'] as const) {
        const entity = world.add({
          powerSource: {type, powerLevel: 0.5, active: true},
        });
        expect(entity.powerSource!.type).toBe(type);
      }
    });
  });

  describe('inputContract', () => {
    it('can create an entity with an inputContract component', () => {
      const bindings: InputBinding[] = [
        {
          source: {entityName: 'heat-dial', field: 'dial.currentIndex'},
          target: {entityName: 'stove-burner', field: 'powerSource.powerLevel'},
          transform: {
            type: 'segmentMap',
            map: {off: 0, low: 0.33, medium: 0.66, high: 1.0},
          },
        },
      ];

      const entity = world.add({
        name: 'stove-contract',
        inputContract: {
          machineId: 'stove',
          bindings,
        },
      });

      expect(entity.inputContract!.machineId).toBe('stove');
      expect(entity.inputContract!.bindings).toHaveLength(1);
      expect(entity.inputContract!.bindings[0].transform.type).toBe('segmentMap');
    });

    it('queries entities with inputContract', () => {
      const contracts = world.with('inputContract');

      world.add({
        inputContract: {
          machineId: 'grinder',
          bindings: [],
        },
      });

      world.add({
        inputContract: {
          machineId: 'stuffer',
          bindings: [],
        },
      });

      // Entity without contract should not appear
      world.add({name: 'unrelated'});

      expect(contracts.entities).toHaveLength(2);
    });

    it('supports multiple bindings per contract', () => {
      const entity = world.add({
        inputContract: {
          machineId: 'grinder',
          bindings: [
            {
              source: {entityName: 'speed-dial', field: 'dial.currentIndex'},
              target: {entityName: 'grinder-motor', field: 'powerSource.powerLevel'},
              transform: {type: 'segmentMap', map: {off: 0, on: 1}},
            },
            {
              source: {entityName: 'crank-handle', field: 'crank.angularVelocity'},
              target: {entityName: 'grinder-auger', field: 'rotation.speed'},
              transform: {type: 'linear', scale: 0.5, clamp: [0, 10]},
            },
          ],
        },
      });

      expect(entity.inputContract!.bindings).toHaveLength(2);
    });
  });
});

describe('BindingTransform types', () => {
  it('segmentMap transform maps string keys to number or boolean values', () => {
    const transform: BindingTransform = {
      type: 'segmentMap',
      map: {off: 0, low: 0.33, medium: 0.66, high: 1.0, turbo: true},
    };
    expect(transform.type).toBe('segmentMap');
    expect(transform.map.off).toBe(0);
    expect(transform.map.turbo).toBe(true);
  });

  it('linear transform with scale, offset, and clamp', () => {
    const transform: BindingTransform = {
      type: 'linear',
      scale: 2.0,
      offset: -0.5,
      clamp: [0, 1],
    };
    expect(transform.type).toBe('linear');
    if (transform.type === 'linear') {
      expect(transform.scale).toBe(2.0);
      expect(transform.offset).toBe(-0.5);
      expect(transform.clamp).toEqual([0, 1]);
    }
  });

  it('linear transform with only scale (offset and clamp optional)', () => {
    const transform: BindingTransform = {
      type: 'linear',
      scale: 1.0,
    };
    expect(transform.type).toBe('linear');
    if (transform.type === 'linear') {
      expect(transform.offset).toBeUndefined();
      expect(transform.clamp).toBeUndefined();
    }
  });

  it('threshold transform splits above/below a value', () => {
    const transform: BindingTransform = {
      type: 'threshold',
      value: 0.5,
      above: 1.0,
      below: 0,
    };
    expect(transform.type).toBe('threshold');
    if (transform.type === 'threshold') {
      expect(transform.value).toBe(0.5);
      expect(transform.above).toBe(1.0);
      expect(transform.below).toBe(0);
    }
  });

  it('threshold transform supports boolean above/below', () => {
    const transform: BindingTransform = {
      type: 'threshold',
      value: 0.1,
      above: true,
      below: false,
    };
    if (transform.type === 'threshold') {
      expect(transform.above).toBe(true);
      expect(transform.below).toBe(false);
    }
  });

  it('passthrough transform passes value unchanged', () => {
    const transform: BindingTransform = {type: 'passthrough'};
    expect(transform.type).toBe('passthrough');
  });
});

describe('GeometryType dodecahedron', () => {
  it('accepts dodecahedron as a valid geometry type', () => {
    const world = new World<Entity>();
    const entity = world.add({
      geometry: {type: 'dodecahedron', args: [0.3, 0]},
      material: {type: 'standard', color: 0x8b4513},
      transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
    });

    expect(entity.geometry!.type).toBe('dodecahedron');
    expect(entity.geometry!.args).toEqual([0.3, 0]);
  });
});

describe('Composite entity (input + behavior)', () => {
  it('can create entity with dial + vibration + machineSlot', () => {
    const world = new World<Entity>();
    const entity = world.add({
      name: 'stove-heat-dial',
      dial: {
        segments: ['off', 'low', 'medium', 'high'],
        currentIndex: 0,
        wraps: false,
        pendingTap: false,
        enabled: true,
      },
      vibration: {
        frequency: 10,
        amplitude: 0.02,
        active: false,
        axes: ['x', 'z'],
      },
      machineSlot: {
        machineId: 'stove',
        slotName: 'heat-dial',
      },
      geometry: {type: 'cylinder', args: [0.15, 0.15, 0.06, 16]},
      material: {type: 'standard', color: 0x333333, metalness: 0.8, roughness: 0.3},
      transform: {position: [0.4, 0.1, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three: makeObject3D(),
    });

    expect(entity.dial).toBeDefined();
    expect(entity.vibration).toBeDefined();
    expect(entity.machineSlot!.machineId).toBe('stove');
  });

  it('can create entity with crank + rotation', () => {
    const world = new World<Entity>();
    const entity = world.add({
      name: 'grinder-crank-handle',
      crank: {
        angle: 0,
        angularVelocity: 0,
        sensitivity: 0.01,
        damping: 0.95,
        dragDelta: 0,
        isDragging: false,
        enabled: true,
      },
      rotation: {axis: 'z', speed: 0, active: true},
      three: makeObject3D(),
    });

    expect(entity.crank).toBeDefined();
    expect(entity.rotation!.axis).toBe('z');
  });
});
