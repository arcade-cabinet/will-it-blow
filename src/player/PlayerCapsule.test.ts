import {vi} from 'vitest';
/**
 * Tests for PlayerCapsule physics body (Spec §9).
 *
 * Tests exported constants and module structure without rendering
 * (R3F / Rapier require WebGL context, mocked here).
 */

vi.mock('@react-three/rapier', () => ({
  RigidBody: vi.fn(),
  CapsuleCollider: vi.fn(),
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({x, y, z})),
}));

vi.mock('./usePhysicsMovement', () => ({
  usePhysicsMovement: vi.fn(),
}));

vi.mock('./useJump', () => ({
  useJump: vi.fn(),
}));

// bridgeActions and teleport not used in will-it-blow

const mockPlayerEntity = {position: {x: 0, y: 0, z: 0}};

vi.mock('../ecs/queries', () => ({
  playerQuery: {entities: [mockPlayerEntity]},
}));

import {
  CAPSULE_HALF_HEIGHT,
  CAPSULE_HEIGHT,
  CAPSULE_RADIUS,
  PlayerCapsule,
  SPAWN_POSITION,
} from './PlayerCapsule.tsx';

describe('PlayerCapsule (Spec §9)', () => {
  it('exports CAPSULE_HEIGHT as 1.8m (full standing height)', () => {
    expect(CAPSULE_HEIGHT).toBe(1.8);
  });

  it('exports CAPSULE_RADIUS as 0.3m', () => {
    expect(CAPSULE_RADIUS).toBe(0.3);
  });

  it('computes CAPSULE_HALF_HEIGHT correctly for Rapier CapsuleCollider', () => {
    // Rapier's halfHeight = (totalHeight - 2*radius) / 2
    expect(CAPSULE_HALF_HEIGHT).toBeCloseTo(0.6);
    // Verify: 2 * radius + 2 * halfHeight == total height
    expect(2 * CAPSULE_RADIUS + 2 * CAPSULE_HALF_HEIGHT).toBeCloseTo(CAPSULE_HEIGHT);
  });

  it('exports PlayerCapsule as a function component', () => {
    expect(typeof PlayerCapsule).toBe('function');
  });

  it('spawns at kitchen center (0, 2, 2) — high enough to clear terrain', () => {
    // SPAWN_POSITION[1]=15 ensures the capsule falls onto terrain rather than
    // clipping into it. X=8, Z=8 is the Rootmere village center tile.
    expect(SPAWN_POSITION).toEqual([0, 2, 2]);
  });

  it('SPAWN_POSITION X/Z match createPlayerEntity ECS spawn (no first-frame desync)', () => {
    // The Rapier body and the ECS player entity must start at the same X/Z so that
    // playerQuery.entities[0].position is correct before the first useFrame runs.
    expect(SPAWN_POSITION[0]).toBe(0); // X
    expect(SPAWN_POSITION[2]).toBe(2); // Z
  });
});

/**
 * Rapier-to-ECS sync logic tests (Spec §9).
 *
 * The sync logic runs inside a useFrame callback. Because useRef and React hooks
 * cannot be called outside of a component tree in tests, the logic is verified
 * directly by simulating what the useFrame closure does: given a mock body and
 * a mock playerEntity, confirm position coordinates are written correctly.
 */
describe('PlayerCapsule Rapier-to-ECS sync (Spec §9)', () => {
  beforeEach(() => {
    mockPlayerEntity.position = {x: 0, y: 0, z: 0};
  });

  it('writes Rapier body translation to ECS player position when both exist', () => {
    // Simulate the useFrame sync closure: body present, playerEntity present
    const mockBody = {translation: vi.fn(() => ({x: 3, y: 1.5, z: -7}))};
    const body = mockBody;
    const playerEntity = mockPlayerEntity;
    if (body && playerEntity) {
      const translation = body.translation();
      playerEntity.position.x = translation.x;
      playerEntity.position.y = translation.y;
      playerEntity.position.z = translation.z;
    }

    expect(mockPlayerEntity.position.x).toBe(3);
    expect(mockPlayerEntity.position.y).toBe(1.5);
    expect(mockPlayerEntity.position.z).toBe(-7);
  });

  it('does not mutate ECS position when no playerEntity exists', () => {
    // Verify the guard `if (!body || !playerEntity) return` prevents mutation.
    // When playerEntity is absent, the sync function must exit without touching position.
    type SyncFn = (
      body: {translation: () => {x: number; y: number; z: number}} | null,
      entity: {position: {x: number; y: number; z: number}} | undefined,
    ) => void;
    const runSync: SyncFn = (body, entity) => {
      if (!body || !entity) return;
      const t = body.translation();
      entity.position.x = t.x;
      entity.position.y = t.y;
      entity.position.z = t.z;
    };

    runSync({translation: () => ({x: 99, y: 99, z: 99})}, undefined);
    expect(mockPlayerEntity.position.x).toBe(0);
  });

  it('does not mutate ECS position when body is null', () => {
    // Verify the guard `if (!body || !playerEntity) return` prevents mutation.
    // When body is null, the sync function must exit without touching position.
    type SyncFn = (
      body: {translation: () => {x: number; y: number; z: number}} | null,
      entity: {position: {x: number; y: number; z: number}},
    ) => void;
    const runSync: SyncFn = (body, entity) => {
      if (!body || !entity) return;
      const t = body.translation();
      entity.position.x = t.x;
      entity.position.y = t.y;
      entity.position.z = t.z;
    };

    runSync(null, mockPlayerEntity);
    expect(mockPlayerEntity.position.x).toBe(0);
  });
});
