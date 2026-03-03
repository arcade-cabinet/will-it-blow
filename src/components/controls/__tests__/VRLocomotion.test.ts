import * as THREE from 'three';

// Test the clampToRoom utility logic (extracted inline since it's a module-private fn)
// We verify the clamping behavior by testing with known room dimensions.

// These match the values in VRLocomotion.tsx (DEFAULT_ROOM from FurnitureLayout)
// DEFAULT_ROOM = { w: 8, d: 6.5, h: 5.5 }, wallMargin = 0.5
const ROOM_HALF_W = 8 / 2 - 0.5; // 3.5
const ROOM_HALF_D = 6.5 / 2 - 0.5; // 2.75

function clampToRoom(pos: THREE.Vector3): THREE.Vector3 {
  pos.x = Math.max(-ROOM_HALF_W, Math.min(ROOM_HALF_W, pos.x));
  pos.z = Math.max(-ROOM_HALF_D, Math.min(ROOM_HALF_D, pos.z));
  return pos;
}

describe('VRLocomotion room clamping', () => {
  it('does not modify position within bounds', () => {
    const pos = new THREE.Vector3(1, 0, 1);
    clampToRoom(pos);
    expect(pos.x).toBeCloseTo(1);
    expect(pos.z).toBeCloseTo(1);
  });

  it('clamps X to positive room boundary', () => {
    const pos = new THREE.Vector3(10, 0, 0);
    clampToRoom(pos);
    expect(pos.x).toBeCloseTo(ROOM_HALF_W);
  });

  it('clamps X to negative room boundary', () => {
    const pos = new THREE.Vector3(-10, 0, 0);
    clampToRoom(pos);
    expect(pos.x).toBeCloseTo(-ROOM_HALF_W);
  });

  it('clamps Z to positive room boundary', () => {
    const pos = new THREE.Vector3(0, 0, 10);
    clampToRoom(pos);
    expect(pos.z).toBeCloseTo(ROOM_HALF_D);
  });

  it('clamps Z to negative room boundary', () => {
    const pos = new THREE.Vector3(0, 0, -10);
    clampToRoom(pos);
    expect(pos.z).toBeCloseTo(-ROOM_HALF_D);
  });

  it('clamps both X and Z simultaneously', () => {
    const pos = new THREE.Vector3(100, 0, -100);
    clampToRoom(pos);
    expect(pos.x).toBeCloseTo(ROOM_HALF_W);
    expect(pos.z).toBeCloseTo(-ROOM_HALF_D);
  });

  it('does not modify Y coordinate', () => {
    const pos = new THREE.Vector3(100, 5.5, 100);
    clampToRoom(pos);
    expect(pos.y).toBeCloseTo(5.5);
  });

  it('handles zero position', () => {
    const pos = new THREE.Vector3(0, 0, 0);
    clampToRoom(pos);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });
});

describe('VRLocomotion store integration', () => {
  it('store has vrLocomotionMode with default smooth', () => {
    // Import store lazily to avoid circular dependency issues in test setup
    const {useGameStore} = require('../../../store/gameStore');
    const state = useGameStore.getState();
    expect(state.vrLocomotionMode).toBe('smooth');
  });

  it('setVrLocomotionMode updates the store', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setVrLocomotionMode('teleport');
    expect(useGameStore.getState().vrLocomotionMode).toBe('teleport');

    // Reset
    useGameStore.getState().setVrLocomotionMode('smooth');
    expect(useGameStore.getState().vrLocomotionMode).toBe('smooth');
  });
});

describe('ComfortVignette', () => {
  it('store has comfortVignette with default true', () => {
    const {useGameStore} = require('../../../store/gameStore');
    const state = useGameStore.getState();
    expect(state.comfortVignette).toBe(true);
  });

  it('setComfortVignette toggles the setting', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setComfortVignette(false);
    expect(useGameStore.getState().comfortVignette).toBe(false);

    // Reset
    useGameStore.getState().setComfortVignette(true);
  });
});

describe('Seated mode height offset', () => {
  const SEATED_HEIGHT_OFFSET = -0.4;

  it('standing mode has zero offset', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setXrSeatedMode(false);
    expect(useGameStore.getState().xrSeatedMode).toBe(false);
    // In VRLocomotion, originY = isSeated ? SEATED_HEIGHT_OFFSET : 0
    const originY = useGameStore.getState().xrSeatedMode ? SEATED_HEIGHT_OFFSET : 0;
    expect(originY).toBe(0);
  });

  it('seated mode lowers origin', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setXrSeatedMode(true);
    const originY = useGameStore.getState().xrSeatedMode ? SEATED_HEIGHT_OFFSET : 0;
    expect(originY).toBe(SEATED_HEIGHT_OFFSET);

    // Reset
    useGameStore.getState().setXrSeatedMode(false);
  });
});

describe('Snap turn configuration', () => {
  it('snapTurnAngle 0 means smooth turning', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setSnapTurnAngle(0);
    const angle = useGameStore.getState().snapTurnAngle;
    expect(angle).toBe(0);
    // In VRLocomotion: snapTurnAngle === 0 → { type: 'smooth' }
  });

  it('snapTurnAngle 45 means snap turning at 45 degrees', () => {
    const {useGameStore} = require('../../../store/gameStore');
    useGameStore.getState().setSnapTurnAngle(45);
    const angle = useGameStore.getState().snapTurnAngle;
    expect(angle).toBe(45);

    // Reset
    useGameStore.getState().setSnapTurnAngle(0);
  });
});
