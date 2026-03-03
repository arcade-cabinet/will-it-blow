import type {ButtonConfig} from '../buttonSlots';
import {buttonSlots} from '../buttonSlots';
import type {CrankConfig} from '../crankSlots';
import {crankSlots} from '../crankSlots';
import type {DialConfig} from '../dialSlots';
import {dialSlots} from '../dialSlots';
import type {PlungerConfig} from '../plungerSlots';
import {plungerSlots} from '../plungerSlots';
import type {SwitchConfig} from '../switchSlots';
import {switchSlots} from '../switchSlots';

// ---------------------------------------------------------------------------
// dialSlots
// ---------------------------------------------------------------------------

describe('dialSlots', () => {
  const baseConfig: DialConfig = {
    prefix: 'heat-control',
    segments: ['off', 'low', 'medium', 'high'],
    wraps: true,
    position: [1, 2, 3],
    bodyGeometry: {type: 'cylinder', args: [0.3, 0.3, 0.1, 16]},
    bodyColor: 0x888888,
    bodyPreset: 'polished-metal',
  };

  it('returns 1 slot when notch is not provided', () => {
    const slots = dialSlots(baseConfig);
    expect(slots).toHaveLength(1);
  });

  it('returns 2 slots when notch is provided', () => {
    const slots = dialSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'sphere', args: [0.05, 8, 8]},
        color: 0xff0000,
        offset: [0, 0.1, 0],
        rotationRange: Math.PI,
      },
    });
    expect(slots).toHaveLength(2);
  });

  it('body slot has correct name following prefix-suffix pattern', () => {
    const slots = dialSlots(baseConfig);
    expect(slots[0].slotName).toBe('heat-control-body');
  });

  it('notch slot has correct name following prefix-suffix pattern', () => {
    const slots = dialSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'sphere', args: [0.05, 8, 8]},
        color: 0xff0000,
        offset: [0, 0.1, 0],
        rotationRange: Math.PI,
      },
    });
    expect(slots[1].slotName).toBe('heat-control-notch');
  });

  it('body slot has dial component with correct defaults', () => {
    const slots = dialSlots(baseConfig);
    const {dial} = slots[0].components;
    expect(dial).toBeDefined();
    expect(dial!.segments).toEqual(['off', 'low', 'medium', 'high']);
    expect(dial!.currentIndex).toBe(0);
    expect(dial!.wraps).toBe(true);
    expect(dial!.pendingTap).toBe(false);
    expect(dial!.enabled).toBe(true);
  });

  it('body slot transform position matches config', () => {
    const slots = dialSlots(baseConfig);
    expect(slots[0].components.transform!.position).toEqual([1, 2, 3]);
  });

  it('uses default rotation [0,0,0] when not provided', () => {
    const slots = dialSlots(baseConfig);
    expect(slots[0].components.transform!.rotation).toEqual([0, 0, 0]);
  });

  it('uses provided rotation', () => {
    const slots = dialSlots({...baseConfig, rotation: [0.1, 0.2, 0.3]});
    expect(slots[0].components.transform!.rotation).toEqual([0.1, 0.2, 0.3]);
  });

  it('notch position is body position + offset', () => {
    const offset: [number, number, number] = [0.5, 0.1, -0.2];
    const slots = dialSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'sphere', args: [0.05]},
        color: 0xff0000,
        offset,
        rotationRange: Math.PI,
      },
    });
    expect(slots[1].components.transform!.position).toEqual([1.5, 2.1, 2.8]);
  });

  it('body slot has correct geometry and material', () => {
    const slots = dialSlots(baseConfig);
    expect(slots[0].components.geometry).toEqual({type: 'cylinder', args: [0.3, 0.3, 0.1, 16]});
    expect(slots[0].components.material!.color).toBe(0x888888);
    expect(slots[0].components.material!.preset).toBe('polished-metal');
  });

  it('notch slot has no dial component', () => {
    const slots = dialSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'sphere', args: [0.05]},
        color: 0xff0000,
        offset: [0, 0, 0],
        rotationRange: Math.PI,
      },
    });
    expect(slots[1].components.dial).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// crankSlots
// ---------------------------------------------------------------------------

describe('crankSlots', () => {
  const baseConfig: CrankConfig = {
    prefix: 'grinder-crank',
    position: [0, 1, 0],
    sensitivity: 0.01,
    damping: 0.95,
    handleGeometry: {type: 'sphere', args: [0.15, 16, 16]},
    handleColor: 0x333333,
    handlePreset: 'dark-metal',
    armGeometry: {type: 'cylinder', args: [0.03, 0.03, 0.5, 8]},
    armColor: 0x666666,
    armPreset: 'polished-metal',
    armOffset: [0.3, 0, 0],
  };

  it('returns exactly 2 slots', () => {
    const slots = crankSlots(baseConfig);
    expect(slots).toHaveLength(2);
  });

  it('handle slot has correct name', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[0].slotName).toBe('grinder-crank-handle');
  });

  it('arm slot has correct name', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[1].slotName).toBe('grinder-crank-arm');
  });

  it('handle slot has crank component with correct defaults', () => {
    const slots = crankSlots(baseConfig);
    const {crank} = slots[0].components;
    expect(crank).toBeDefined();
    expect(crank!.angle).toBe(0);
    expect(crank!.angularVelocity).toBe(0);
    expect(crank!.sensitivity).toBe(0.01);
    expect(crank!.damping).toBe(0.95);
    expect(crank!.dragDelta).toBe(0);
    expect(crank!.isDragging).toBe(false);
    expect(crank!.enabled).toBe(true);
  });

  it('handle slot transform position matches config', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[0].components.transform!.position).toEqual([0, 1, 0]);
  });

  it('arm slot position is handle position + armOffset', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[1].components.transform!.position).toEqual([0.3, 1, 0]);
  });

  it('arm slot has no crank component (decorative only)', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[1].components.crank).toBeUndefined();
  });

  it('handle slot has correct geometry and material preset', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[0].components.geometry).toEqual({type: 'sphere', args: [0.15, 16, 16]});
    expect(slots[0].components.material!.preset).toBe('dark-metal');
  });

  it('arm slot has correct geometry and material preset', () => {
    const slots = crankSlots(baseConfig);
    expect(slots[1].components.geometry).toEqual({type: 'cylinder', args: [0.03, 0.03, 0.5, 8]});
    expect(slots[1].components.material!.preset).toBe('polished-metal');
  });
});

// ---------------------------------------------------------------------------
// plungerSlots
// ---------------------------------------------------------------------------

describe('plungerSlots', () => {
  const baseConfig: PlungerConfig = {
    prefix: 'stuffer-plunger',
    position: [0, 2, 0],
    axis: 'y',
    minWorld: 0,
    maxWorld: 1.5,
    sensitivity: 0.005,
    springBack: true,
    hitboxGeometry: {type: 'box', args: [0.5, 2, 0.5]},
    parts: [
      {
        name: 'shaft',
        geometry: {type: 'cylinder', args: [0.1, 0.1, 1.5, 12]},
        color: 0xaaaaaa,
        preset: 'polished-metal',
        offset: [0, 0, 0],
      },
      {
        name: 'plate',
        geometry: {type: 'cylinder', args: [0.4, 0.4, 0.05, 16]},
        color: 0xcccccc,
        offset: [0, -0.75, 0],
      },
    ],
  };

  it('returns N+1 slots (1 hitbox + N parts)', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots).toHaveLength(3); // 1 hitbox + 2 parts
  });

  it('hitbox slot has correct name', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[0].slotName).toBe('stuffer-plunger-hitbox');
  });

  it('part slots have correct names', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[1].slotName).toBe('stuffer-plunger-shaft');
    expect(slots[2].slotName).toBe('stuffer-plunger-plate');
  });

  it('hitbox has plunger component with correct defaults', () => {
    const slots = plungerSlots(baseConfig);
    const {plunger} = slots[0].components;
    expect(plunger).toBeDefined();
    expect(plunger!.displacement).toBe(0);
    expect(plunger!.axis).toBe('y');
    expect(plunger!.minWorld).toBe(0);
    expect(plunger!.maxWorld).toBe(1.5);
    expect(plunger!.sensitivity).toBe(0.005);
    expect(plunger!.dragDelta).toBe(0);
    expect(plunger!.isDragging).toBe(false);
    expect(plunger!.springBack).toBe(true);
    expect(plunger!.enabled).toBe(true);
  });

  it('hitbox uses invisible preset', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[0].components.material!.preset).toBe('invisible');
  });

  it('hitbox has isHitbox tag', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[0].components.isHitbox).toBe(true);
  });

  it('hitbox transform position matches config', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[0].components.transform!.position).toEqual([0, 2, 0]);
  });

  it('part positions are config.position + part.offset', () => {
    const slots = plungerSlots(baseConfig);
    // shaft: [0,2,0] + [0,0,0] = [0,2,0]
    expect(slots[1].components.transform!.position).toEqual([0, 2, 0]);
    // plate: [0,2,0] + [0,-0.75,0] = [0,1.25,0]
    expect(slots[2].components.transform!.position).toEqual([0, 1.25, 0]);
  });

  it('part slots have no plunger component', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[1].components.plunger).toBeUndefined();
    expect(slots[2].components.plunger).toBeUndefined();
  });

  it('returns 1 slot when parts is empty', () => {
    const slots = plungerSlots({...baseConfig, parts: []});
    expect(slots).toHaveLength(1);
    expect(slots[0].slotName).toBe('stuffer-plunger-hitbox');
  });

  it('part preset is applied when provided', () => {
    const slots = plungerSlots(baseConfig);
    expect(slots[1].components.material!.preset).toBe('polished-metal');
    expect(slots[2].components.material!.preset).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// switchSlots
// ---------------------------------------------------------------------------

describe('switchSlots', () => {
  const baseConfig: SwitchConfig = {
    prefix: 'power-switch',
    position: [0.5, 1, 0],
    bodyGeometry: {type: 'box', args: [0.2, 0.1, 0.1]},
    bodyColor: 0x444444,
    bodyPreset: 'plastic',
  };

  it('returns 1 slot when notch is not provided', () => {
    const slots = switchSlots(baseConfig);
    expect(slots).toHaveLength(1);
  });

  it('returns 2 slots when notch is provided', () => {
    const slots = switchSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'box', args: [0.05, 0.08, 0.02]},
        color: 0xffffff,
        offset: [0, 0.05, 0.05],
        rotationRange: Math.PI / 4,
      },
    });
    expect(slots).toHaveLength(2);
  });

  it('body slot has correct name', () => {
    const slots = switchSlots(baseConfig);
    expect(slots[0].slotName).toBe('power-switch-body');
  });

  it('body slot has toggle component (NOT dial)', () => {
    const slots = switchSlots(baseConfig);
    expect(slots[0].components.toggle).toBeDefined();
    expect(slots[0].components.dial).toBeUndefined();
  });

  it('toggle component has correct defaults', () => {
    const slots = switchSlots(baseConfig);
    const {toggle} = slots[0].components;
    expect(toggle!.isOn).toBe(false);
    expect(toggle!.pendingTap).toBe(false);
    expect(toggle!.enabled).toBe(true);
  });

  it('body slot transform position matches config', () => {
    const slots = switchSlots(baseConfig);
    expect(slots[0].components.transform!.position).toEqual([0.5, 1, 0]);
  });

  it('uses default rotation [0,0,0] when not provided', () => {
    const slots = switchSlots(baseConfig);
    expect(slots[0].components.transform!.rotation).toEqual([0, 0, 0]);
  });

  it('uses provided rotation', () => {
    const slots = switchSlots({...baseConfig, rotation: [0, Math.PI / 2, 0]});
    expect(slots[0].components.transform!.rotation).toEqual([0, Math.PI / 2, 0]);
  });

  it('notch position is body position + offset', () => {
    const offset: [number, number, number] = [0, 0.05, 0.05];
    const slots = switchSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'box', args: [0.05, 0.08, 0.02]},
        color: 0xffffff,
        offset,
        rotationRange: Math.PI / 4,
      },
    });
    expect(slots[1].components.transform!.position).toEqual([0.5, 1.05, 0.05]);
  });

  it('notch slot has no toggle component', () => {
    const slots = switchSlots({
      ...baseConfig,
      notch: {
        geometry: {type: 'box', args: [0.05, 0.08, 0.02]},
        color: 0xffffff,
        offset: [0, 0, 0],
        rotationRange: Math.PI / 4,
      },
    });
    expect(slots[1].components.toggle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buttonSlots
// ---------------------------------------------------------------------------

describe('buttonSlots', () => {
  const baseConfig: ButtonConfig = {
    prefix: 'start-btn',
    position: [0, 1.5, 0.5],
    geometry: {type: 'cylinder', args: [0.15, 0.15, 0.05, 16]},
    color: 0xff0000,
    preset: 'plastic',
  };

  it('returns exactly 1 slot', () => {
    const slots = buttonSlots(baseConfig);
    expect(slots).toHaveLength(1);
  });

  it('slot has correct name', () => {
    const slots = buttonSlots(baseConfig);
    expect(slots[0].slotName).toBe('start-btn-body');
  });

  it('slot has button component with correct defaults', () => {
    const slots = buttonSlots(baseConfig);
    const {button} = slots[0].components;
    expect(button).toBeDefined();
    expect(button!.fired).toBe(false);
    expect(button!.pendingTap).toBe(false);
    expect(button!.enabled).toBe(true);
  });

  it('transform position matches config', () => {
    const slots = buttonSlots(baseConfig);
    expect(slots[0].components.transform!.position).toEqual([0, 1.5, 0.5]);
  });

  it('geometry and material match config', () => {
    const slots = buttonSlots(baseConfig);
    expect(slots[0].components.geometry).toEqual({type: 'cylinder', args: [0.15, 0.15, 0.05, 16]});
    expect(slots[0].components.material!.color).toBe(0xff0000);
    expect(slots[0].components.material!.preset).toBe('plastic');
  });

  it('works without preset', () => {
    const slots = buttonSlots({
      prefix: 'no-preset',
      position: [0, 0, 0],
      geometry: {type: 'sphere', args: [0.1]},
      color: '#00ff00',
    });
    expect(slots[0].components.material!.preset).toBeUndefined();
    expect(slots[0].components.material!.color).toBe('#00ff00');
  });
});

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------

describe('barrel export (index.ts)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const barrel = require('../index');

  it('exports dialSlots', () => {
    expect(typeof barrel.dialSlots).toBe('function');
  });

  it('exports crankSlots', () => {
    expect(typeof barrel.crankSlots).toBe('function');
  });

  it('exports plungerSlots', () => {
    expect(typeof barrel.plungerSlots).toBe('function');
  });

  it('exports switchSlots', () => {
    expect(typeof barrel.switchSlots).toBe('function');
  });

  it('exports buttonSlots', () => {
    expect(typeof barrel.buttonSlots).toBe('function');
  });
});
