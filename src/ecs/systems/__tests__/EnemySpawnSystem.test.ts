import type {Entity} from '../../types';
import {updateEnemyAI} from '../EnemySpawnSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0, set: jest.fn()},
    rotation: {x: 0, y: 0, z: 0},
    scale: {
      x: 1,
      y: 1,
      z: 1,
      set: jest.fn(function (
        this: {x: number; y: number; z: number},
        x: number,
        y: number,
        z: number,
      ) {
        this.x = x;
        this.y = y;
        this.z = z;
      }),
    },
    visible: true,
  } as unknown as Entity['three'];
}

function makeEnemy(overrides: Partial<NonNullable<Entity['enemy']>> = {}): Entity {
  const three = makeObject3D()!;
  return {
    name: 'test-enemy',
    enemy: {
      type: 'giant-rat',
      hp: 2,
      maxHp: 2,
      speed: 3,
      damage: 1,
      state: 'approaching',
      targetPosition: [0, 0, 0],
      stateTimer: 0,
      spawnCabinetId: 'cabinet-lower-left',
      deathDropIngredient: 'Mystery Meat',
      ...overrides,
    },
    transform: {
      position: [0, 0, 5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    three,
  };
}

// ---------------------------------------------------------------------------
// updateEnemyAI — state: spawning
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — spawning state', () => {
  it('decrements stateTimer each frame', () => {
    const entity = makeEnemy({state: 'spawning', stateTimer: 1.0});
    const addStrike = jest.fn();
    const endCombat = jest.fn();

    updateEnemyAI({entity, delta: 0.4, addStrike, endCombat});

    expect(entity.enemy!.stateTimer).toBeCloseTo(0.6);
    expect(entity.enemy!.state).toBe('spawning');
    expect(addStrike).not.toHaveBeenCalled();
  });

  it('transitions to approaching when stateTimer reaches 0', () => {
    const entity = makeEnemy({state: 'spawning', stateTimer: 0.3});
    const addStrike = jest.fn();
    const endCombat = jest.fn();

    updateEnemyAI({entity, delta: 0.5, addStrike, endCombat});

    expect(entity.enemy!.state).toBe('approaching');
    expect(entity.enemy!.stateTimer).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// updateEnemyAI — state: approaching
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — approaching state', () => {
  it('moves enemy toward target position', () => {
    // Enemy at [0,0,5], target at [0,0,0]. Speed 3, delta 0.1 → step 0.3
    const entity = makeEnemy({
      state: 'approaching',
      targetPosition: [0, 0, 0],
      speed: 3,
    });
    entity.three!.position.x = 0;
    entity.three!.position.y = 0;
    entity.three!.position.z = 5;

    updateEnemyAI({entity, delta: 0.1, addStrike: jest.fn(), endCombat: jest.fn()});

    // Should have moved 0.3 units toward target (z decreases)
    expect(entity.three!.position.z).toBeCloseTo(4.7);
    expect(entity.enemy!.state).toBe('approaching');
  });

  it('transitions to attacking when within 1.5 units', () => {
    const entity = makeEnemy({
      state: 'approaching',
      targetPosition: [0, 0, 0],
      speed: 3,
    });
    entity.three!.position.x = 0;
    entity.three!.position.y = 0;
    entity.three!.position.z = 1.0; // < 1.5 from target

    updateEnemyAI({entity, delta: 0.016, addStrike: jest.fn(), endCombat: jest.fn()});

    expect(entity.enemy!.state).toBe('attacking');
    expect(entity.enemy!.stateTimer).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// updateEnemyAI — state: attacking
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — attacking state', () => {
  it('does not call addStrike before timer expires', () => {
    const entity = makeEnemy({state: 'attacking', stateTimer: 1.5});
    const addStrike = jest.fn();

    updateEnemyAI({entity, delta: 0.5, addStrike, endCombat: jest.fn()});

    expect(addStrike).not.toHaveBeenCalled();
    expect(entity.enemy!.stateTimer).toBeCloseTo(1.0);
  });

  it('calls addStrike and resets timer when attack lands', () => {
    const entity = makeEnemy({state: 'attacking', stateTimer: 0.1});
    const addStrike = jest.fn();

    updateEnemyAI({entity, delta: 0.2, addStrike, endCombat: jest.fn()});

    expect(addStrike).toHaveBeenCalledTimes(1);
    expect(entity.enemy!.stateTimer).toBe(2); // reset to 2s
    expect(entity.enemy!.state).toBe('attacking');
  });
});

// ---------------------------------------------------------------------------
// updateEnemyAI — state: stunned
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — stunned state', () => {
  it('transitions back to approaching after stateTimer expires', () => {
    const entity = makeEnemy({state: 'stunned', stateTimer: 0.2});

    updateEnemyAI({entity, delta: 0.5, addStrike: jest.fn(), endCombat: jest.fn()});

    expect(entity.enemy!.state).toBe('approaching');
    expect(entity.enemy!.stateTimer).toBe(0);
  });

  it('stays stunned while timer is positive', () => {
    const entity = makeEnemy({state: 'stunned', stateTimer: 0.4});

    updateEnemyAI({entity, delta: 0.1, addStrike: jest.fn(), endCombat: jest.fn()});

    expect(entity.enemy!.state).toBe('stunned');
  });
});

// ---------------------------------------------------------------------------
// updateEnemyAI — state: dying
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — dying state', () => {
  it('shrinks enemy scale while dying', () => {
    const entity = makeEnemy({state: 'dying', stateTimer: 0.5});

    updateEnemyAI({entity, delta: 0.25, addStrike: jest.fn(), endCombat: jest.fn()});

    // stateTimer goes from 0.5 → 0.25. progress = 1 - 0.25/0.5 = 0.5. s = 0.5
    expect(entity.three!.scale.set).toHaveBeenCalledWith(
      expect.closeTo(0.5, 1),
      expect.closeTo(0.5, 1),
      expect.closeTo(0.5, 1),
    );
    expect(entity.enemy!.state).toBe('dying');
  });

  it('transitions to dead and calls endCombat when dying timer expires', () => {
    const entity = makeEnemy({state: 'dying', stateTimer: 0.1});
    const endCombat = jest.fn();

    updateEnemyAI({entity, delta: 0.2, addStrike: jest.fn(), endCombat});

    expect(entity.enemy!.state).toBe('dead');
    expect(entity.enemy!.stateTimer).toBe(3); // linger 3s
    expect(endCombat).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// updateEnemyAI — state: dead
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — dead state', () => {
  it('returns false (no removal) while linger timer is positive', () => {
    const entity = makeEnemy({state: 'dead', stateTimer: 2.0});

    const result = updateEnemyAI({
      entity,
      delta: 0.5,
      addStrike: jest.fn(),
      endCombat: jest.fn(),
    });

    expect(result).toBe(false);
    expect(entity.enemy!.stateTimer).toBeCloseTo(1.5);
  });

  it('returns true (trigger removal) when linger timer expires', () => {
    const entity = makeEnemy({state: 'dead', stateTimer: 0.1});

    const result = updateEnemyAI({
      entity,
      delta: 0.2,
      addStrike: jest.fn(),
      endCombat: jest.fn(),
    });

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Guard: missing components
// ---------------------------------------------------------------------------

describe('EnemySpawnSystem — guard clauses', () => {
  it('returns false and does nothing when entity has no enemy component', () => {
    const entity: Entity = {
      transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three: makeObject3D(),
    };
    const addStrike = jest.fn();
    const endCombat = jest.fn();

    const result = updateEnemyAI({entity, delta: 0.1, addStrike, endCombat});

    expect(result).toBe(false);
    expect(addStrike).not.toHaveBeenCalled();
    expect(endCombat).not.toHaveBeenCalled();
  });

  it('returns false when entity has no three component', () => {
    const entity = makeEnemy({state: 'attacking', stateTimer: 0.0});
    entity.three = undefined;
    const addStrike = jest.fn();

    const result = updateEnemyAI({entity, delta: 0.1, addStrike, endCombat: jest.fn()});

    expect(result).toBe(false);
    expect(addStrike).not.toHaveBeenCalled();
  });
});
