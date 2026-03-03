import {InputManager} from '../InputManager';

// Reset singleton between tests
afterEach(() => {
  try {
    InputManager.getInstance().dispose();
  } catch {
    // Already disposed
  }
});

describe('InputManager', () => {
  it('returns singleton instance', () => {
    const a = InputManager.getInstance();
    const b = InputManager.getInstance();
    expect(a).toBe(b);
  });

  it('returns zero movement with no input', () => {
    const input = InputManager.getInstance();
    const move = input.getMovement();
    expect(move.x).toBe(0);
    expect(move.z).toBe(0);
  });

  it('returns zero look delta with no input', () => {
    const input = InputManager.getInstance();
    const look = input.getLookDelta();
    expect(look.yaw).toBe(0);
    expect(look.pitch).toBe(0);
  });

  it('reads touch joystick refs when set', () => {
    const input = InputManager.getInstance();
    const joystick = {x: 0.5, y: -0.3};
    const lookDelta = {dx: 0, dy: 0};
    input.setTouchRefs(joystick, lookDelta);

    const move = input.getMovement();
    expect(move.x).toBeCloseTo(0.5);
    expect(move.z).toBeCloseTo(0.3); // -(-0.3) = 0.3
  });

  it('drains touch look delta after reading', () => {
    const input = InputManager.getInstance();
    const joystick = {x: 0, y: 0};
    const lookDelta = {dx: 10, dy: 5};
    input.setTouchRefs(joystick, lookDelta);

    const look1 = input.getLookDelta();
    expect(look1.yaw).not.toBe(0);

    // Second read should be zero (drained)
    const look2 = input.getLookDelta();
    expect(look2.yaw).toBe(0);
    expect(look2.pitch).toBe(0);
  });

  it('normalizes diagonal movement to unit length', () => {
    const input = InputManager.getInstance();
    const joystick = {x: 1, y: -1};
    const lookDelta = {dx: 0, dy: 0};
    input.setTouchRefs(joystick, lookDelta);

    const move = input.getMovement();
    const len = Math.sqrt(move.x * move.x + move.z * move.z);
    expect(len).toBeCloseTo(1, 2);
  });

  it('disposes cleanly and resets singleton', () => {
    const input = InputManager.getInstance();
    input.dispose();
    // New instance after dispose
    const input2 = InputManager.getInstance();
    expect(input2).not.toBe(input);
  });

  it('isActionHeld returns false with no input', () => {
    const input = InputManager.getInstance();
    expect(input.isActionHeld('interact')).toBe(false);
    expect(input.isActionHeld('pause')).toBe(false);
  });
});
