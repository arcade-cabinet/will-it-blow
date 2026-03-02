import type {Entity} from '../../types';
import {updateToggles} from '../ToggleSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('ToggleSystem', () => {
  it('flips isOn from false to true on pendingTap', () => {
    const entity: Entity = {
      toggle: {isOn: false, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };

    updateToggles([entity]);
    expect(entity.toggle!.isOn).toBe(true);
    expect(entity.toggle!.pendingTap).toBe(false);
  });

  it('flips isOn from true to false on pendingTap', () => {
    const entity: Entity = {
      toggle: {isOn: true, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };

    updateToggles([entity]);
    expect(entity.toggle!.isOn).toBe(false);
    expect(entity.toggle!.pendingTap).toBe(false);
  });

  it('does nothing when pendingTap is false', () => {
    const entity: Entity = {
      toggle: {isOn: false, pendingTap: false, enabled: true},
      three: makeObject3D(),
    };

    updateToggles([entity]);
    expect(entity.toggle!.isOn).toBe(false);
  });

  it('does nothing when disabled', () => {
    const entity: Entity = {
      toggle: {isOn: false, pendingTap: true, enabled: false},
      three: makeObject3D(),
    };

    updateToggles([entity]);
    expect(entity.toggle!.isOn).toBe(false);
    expect(entity.toggle!.pendingTap).toBe(true);
  });

  it('handles multiple entities independently', () => {
    const e1: Entity = {
      toggle: {isOn: false, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };
    const e2: Entity = {
      toggle: {isOn: true, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };

    updateToggles([e1, e2]);
    expect(e1.toggle!.isOn).toBe(true);
    expect(e2.toggle!.isOn).toBe(false);
  });

  it('handles empty entity list', () => {
    expect(() => updateToggles([])).not.toThrow();
  });
});
