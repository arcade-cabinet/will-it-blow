import type {XRControllerState} from '@react-three/xr';
import {InputManager} from '../../../input/InputManager';
import {
  getComponentValue,
  isComponentPressed,
  readThumbstick,
  updateXRInput,
} from '../XRInputSystem';

// Minimal mock for XRControllerState.gamepad
function makeController(
  gamepad: Record<string, {state?: string; xAxis?: number; yAxis?: number; button?: number}> = {},
): XRControllerState {
  return {
    id: 'test',
    type: 'controller',
    isPrimary: true,
    inputSource: {} as XRInputSource,
    events: [],
    gamepad: Object.fromEntries(
      Object.entries(gamepad).map(([k, v]) => [
        k,
        {
          state: v.state ?? 'default',
          xAxis: v.xAxis,
          yAxis: v.yAxis,
          button: v.button,
          object: undefined,
        },
      ]),
    ),
    layout: {} as any,
  } as XRControllerState;
}

describe('readThumbstick', () => {
  it('returns [0, 0] when controller is undefined', () => {
    expect(readThumbstick(undefined)).toEqual([0, 0]);
  });

  it('returns [0, 0] when no thumbstick component', () => {
    const ctrl = makeController({});
    expect(readThumbstick(ctrl)).toEqual([0, 0]);
  });

  it('applies deadzone — below threshold returns 0', () => {
    const ctrl = makeController({
      'xr-standard-thumbstick': {xAxis: 0.05, yAxis: -0.1},
    });
    expect(readThumbstick(ctrl, 0.15)).toEqual([0, 0]);
  });

  it('passes through axes above deadzone', () => {
    const ctrl = makeController({
      'xr-standard-thumbstick': {xAxis: 0.8, yAxis: -0.6},
    });
    const [x, y] = readThumbstick(ctrl, 0.15);
    expect(x).toBeCloseTo(0.8);
    expect(y).toBeCloseTo(-0.6);
  });

  it('uses default deadzone of 0.15', () => {
    const ctrl = makeController({
      'xr-standard-thumbstick': {xAxis: 0.14, yAxis: 0.16},
    });
    const [x, y] = readThumbstick(ctrl);
    expect(x).toBe(0); // Below 0.15
    expect(y).toBeCloseTo(0.16); // Above 0.15
  });
});

describe('isComponentPressed', () => {
  it('returns false when controller is undefined', () => {
    expect(isComponentPressed(undefined, 'a-button')).toBe(false);
  });

  it('returns false when component does not exist', () => {
    const ctrl = makeController({});
    expect(isComponentPressed(ctrl, 'a-button')).toBe(false);
  });

  it('returns false when component is not pressed', () => {
    const ctrl = makeController({'a-button': {state: 'default'}});
    expect(isComponentPressed(ctrl, 'a-button')).toBe(false);
  });

  it('returns true when component is pressed', () => {
    const ctrl = makeController({'a-button': {state: 'pressed'}});
    expect(isComponentPressed(ctrl, 'a-button')).toBe(true);
  });

  it('returns false when component is touched but not pressed', () => {
    const ctrl = makeController({'a-button': {state: 'touched'}});
    expect(isComponentPressed(ctrl, 'a-button')).toBe(false);
  });
});

describe('getComponentValue', () => {
  it('returns 0 when controller is undefined', () => {
    expect(getComponentValue(undefined, 'xr-standard-trigger')).toBe(0);
  });

  it('returns 0 when component does not exist', () => {
    const ctrl = makeController({});
    expect(getComponentValue(ctrl, 'xr-standard-trigger')).toBe(0);
  });

  it('returns button value when present', () => {
    const ctrl = makeController({'xr-standard-trigger': {button: 0.75}});
    expect(getComponentValue(ctrl, 'xr-standard-trigger')).toBeCloseTo(0.75);
  });
});

describe('updateXRInput', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    // Get a fresh InputManager instance
    InputManager.getInstance().dispose();
    inputManager = InputManager.getInstance();
  });

  afterEach(() => {
    inputManager.dispose();
  });

  it('pushes left thumbstick to movement via setXRInput', () => {
    const left = makeController({
      'xr-standard-thumbstick': {xAxis: 0.5, yAxis: -0.7},
    });
    const right = makeController({});

    updateXRInput(left, right, inputManager);

    // After setXRInput, getMovement should include XR values
    const move = inputManager.getMovement();
    expect(move.x).toBeCloseTo(0.5);
    expect(move.z).toBeCloseTo(-0.7);
  });

  it('pushes right thumbstick to look via setXRInput', () => {
    const left = makeController({});
    const right = makeController({
      'xr-standard-thumbstick': {xAxis: 0.3, yAxis: -0.2},
    });

    updateXRInput(left, right, inputManager);

    // getLookDelta reads XR input
    const look = inputManager.getLookDelta();
    // yaw should be -lookX * sensitivity, pitch should be -lookY * sensitivity
    expect(look.yaw).not.toBe(0);
    expect(look.pitch).not.toBe(0);
  });

  it('pushes trigger and squeeze values via setXRInput', () => {
    const left = makeController({});
    const right = makeController({
      'xr-standard-trigger': {button: 0.9},
      'xr-standard-squeeze': {button: 0.5},
    });

    updateXRInput(left, right, inputManager);

    expect(inputManager.getXRTriggerValue()).toBeCloseTo(0.9);
    expect(inputManager.getXRSqueezeValue()).toBeCloseTo(0.5);
  });

  it('handles undefined controllers gracefully', () => {
    updateXRInput(undefined, undefined, inputManager);

    const move = inputManager.getMovement();
    expect(move.x).toBe(0);
    expect(move.z).toBe(0);
    expect(inputManager.getXRTriggerValue()).toBe(0);
    expect(inputManager.getXRSqueezeValue()).toBe(0);
  });

  it('normalizes diagonal movement when XR + other inputs combine over 1.0', () => {
    const left = makeController({
      'xr-standard-thumbstick': {xAxis: 1.0, yAxis: 1.0},
    });

    updateXRInput(left, undefined, inputManager);

    const move = inputManager.getMovement();
    const magnitude = Math.sqrt(move.x * move.x + move.z * move.z);
    expect(magnitude).toBeLessThanOrEqual(1.001); // floating-point tolerance
  });
});

describe('InputManager XR integration', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    InputManager.getInstance().dispose();
    inputManager = InputManager.getInstance();
  });

  afterEach(() => {
    inputManager.dispose();
  });

  it('setXRActionPressed makes isActionHeld return true for interact', () => {
    inputManager.setXRActionPressed('interact', true);
    expect(inputManager.isActionHeld('interact')).toBe(true);
  });

  it('setXRActionPressed false makes isActionHeld return false', () => {
    inputManager.setXRActionPressed('interact', true);
    inputManager.setXRActionPressed('interact', false);
    expect(inputManager.isActionHeld('interact')).toBe(false);
  });

  it('isXRActive returns false by default', () => {
    expect(inputManager.isXRActive()).toBe(false);
  });

  it('isXRActive returns true after setXRInput', () => {
    inputManager.setXRInput({
      moveX: 0,
      moveZ: 0,
      lookX: 0,
      lookY: 0,
      triggerValue: 0,
      squeezeValue: 0,
    });
    expect(inputManager.isXRActive()).toBe(true);
  });

  it('dispose clears XR state', () => {
    inputManager.setXRInput({
      moveX: 1,
      moveZ: 1,
      lookX: 0,
      lookY: 0,
      triggerValue: 0.5,
      squeezeValue: 0.3,
    });
    inputManager.setXRActionPressed('interact', true);
    inputManager.dispose();

    // Get fresh instance after dispose
    const fresh = InputManager.getInstance();
    expect(fresh.isXRActive()).toBe(false);
    expect(fresh.getXRTriggerValue()).toBe(0);
    expect(fresh.isActionHeld('interact')).toBe(false);
    fresh.dispose();
  });
});
