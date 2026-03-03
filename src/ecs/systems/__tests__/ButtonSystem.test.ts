import type {Entity} from '../../types';
import {updateButtons} from '../ButtonSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('ButtonSystem', () => {
  it('sets fired to true on pendingTap when enabled', () => {
    const entity: Entity = {
      button: {fired: false, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };

    updateButtons([entity]);
    expect(entity.button!.fired).toBe(true);
    expect(entity.button!.pendingTap).toBe(false);
  });

  it('resets fired to false every frame before processing', () => {
    const entity: Entity = {
      button: {fired: true, pendingTap: false, enabled: true},
      three: makeObject3D(),
    };

    updateButtons([entity]);
    // fired should be reset because no pendingTap this frame
    expect(entity.button!.fired).toBe(false);
  });

  it('does nothing when disabled (fired still resets)', () => {
    const entity: Entity = {
      button: {fired: false, pendingTap: true, enabled: false},
      three: makeObject3D(),
    };

    updateButtons([entity]);
    expect(entity.button!.fired).toBe(false);
    expect(entity.button!.pendingTap).toBe(true);
  });

  it('does nothing when pendingTap is false (fired resets)', () => {
    const entity: Entity = {
      button: {fired: true, pendingTap: false, enabled: true},
      three: makeObject3D(),
    };

    updateButtons([entity]);
    expect(entity.button!.fired).toBe(false);
  });

  it('handles multiple buttons — one tapped, one not', () => {
    const e1: Entity = {
      button: {fired: false, pendingTap: true, enabled: true},
      three: makeObject3D(),
    };
    const e2: Entity = {
      button: {fired: true, pendingTap: false, enabled: true},
      three: makeObject3D(),
    };

    updateButtons([e1, e2]);
    expect(e1.button!.fired).toBe(true);
    expect(e1.button!.pendingTap).toBe(false);
    expect(e2.button!.fired).toBe(false); // reset since no pendingTap
  });

  it('handles empty entity list', () => {
    expect(() => updateButtons([])).not.toThrow();
  });
});
