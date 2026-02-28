import {
  createGrab,
  createLook,
  createPress,
  createRelease,
  createSwipe,
  createTap,
} from '../InputActions';

describe('InputActions', () => {
  it('createGrab returns grab action with meshId', () => {
    const action = createGrab('ingredient_3');
    expect(action).toEqual({type: 'grab', meshId: 'ingredient_3'});
  });

  it('createRelease returns release action with meshId', () => {
    const action = createRelease('ingredient_3');
    expect(action).toEqual({type: 'release', meshId: 'ingredient_3'});
  });

  it('createLook returns look action with clamped yaw and pitch', () => {
    const action = createLook(0.5, -0.3);
    expect(action).toEqual({type: 'look', yaw: 0.5, pitch: -0.3});
  });

  it('createLook clamps yaw to ±0.52 rad (~30°)', () => {
    const action = createLook(1.5, 0);
    expect(action.yaw).toBeCloseTo(0.52, 2);
    const neg = createLook(-1.5, 0);
    expect(neg.yaw).toBeCloseTo(-0.52, 2);
  });

  it('createLook clamps pitch to ±0.35 rad (~20°)', () => {
    const action = createLook(0, 1.0);
    expect(action.pitch).toBeCloseTo(0.35, 2);
  });

  it('createPress returns press action with force 0-1', () => {
    const action = createPress(0.75);
    expect(action).toEqual({type: 'press', force: 0.75});
  });

  it('createPress clamps force to [0, 1]', () => {
    expect(createPress(-0.5).force).toBe(0);
    expect(createPress(1.5).force).toBe(1);
  });

  it('createSwipe returns swipe action with direction and velocity', () => {
    const action = createSwipe('cw', 2.5);
    expect(action).toEqual({type: 'swipe', direction: 'cw', velocity: 2.5});
  });

  it('createTap returns tap action with meshId', () => {
    const action = createTap('fridge_door');
    expect(action).toEqual({type: 'tap', meshId: 'fridge_door'});
  });
});
