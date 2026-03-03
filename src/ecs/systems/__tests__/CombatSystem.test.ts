import {detectSwing} from '../CombatSystem';

/** Helper to build a minimal detectSwing input. */
function makeInputs(
  overrides: Partial<Parameters<typeof detectSwing>[0]> = {},
): Parameters<typeof detectSwing>[0] {
  return {
    weaponWorldPos: {x: 0, y: 0, z: 0},
    prevWeaponWorldPos: {x: 0, y: 0, z: 0},
    delta: 0.016,
    weaponDamage: 2,
    weaponRange: 1.5,
    weaponSwingThreshold: 3.0,
    enemyWorldPos: {x: 0.5, y: 0, z: 0},
    enemyHp: 3,
    ...overrides,
  };
}

describe('CombatSystem — detectSwing', () => {
  it('returns no hit when weapon has not moved (zero velocity)', () => {
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
      }),
    );
    expect(result.hit).toBe(false);
    expect(result.velocityMagnitude).toBe(0);
  });

  it('returns no hit when swing velocity is below threshold', () => {
    // Move 0.01 units in delta 0.016s → velocity ≈ 0.625, threshold is 3.0
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.01, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponSwingThreshold: 3.0,
      }),
    );
    expect(result.hit).toBe(false);
    expect(result.velocityMagnitude).toBeCloseTo(0.01 / 0.016);
  });

  it('returns hit when swing velocity exceeds threshold and enemy is within range', () => {
    // Move 0.1 units in 0.016s → velocity ≈ 6.25 > threshold 3.0; enemy at 0.5 < range 1.5
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponSwingThreshold: 3.0,
        weaponRange: 1.5,
        enemyWorldPos: {x: 0.5, y: 0, z: 0},
        weaponDamage: 2,
        enemyHp: 3,
      }),
    );
    expect(result.hit).toBe(true);
    expect(result.remainingHp).toBe(1); // 3 - 2 = 1
  });

  it('returns no hit when enemy is out of range despite fast swing', () => {
    // Enemy is 5 units away, range is 1.5
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponSwingThreshold: 3.0,
        weaponRange: 1.5,
        enemyWorldPos: {x: 5.0, y: 0, z: 0},
      }),
    );
    expect(result.hit).toBe(false);
  });

  it('enemy transitions to stunned state on non-lethal hit (hp > 0 after damage)', () => {
    // 3 HP enemy, 2 damage → 1 HP remains (not dead, would go stunned)
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponDamage: 2,
        enemyHp: 3,
        enemyWorldPos: {x: 0.5, y: 0, z: 0},
        weaponRange: 1.5,
        weaponSwingThreshold: 3.0,
      }),
    );
    expect(result.hit).toBe(true);
    // Caller transitions to 'stunned' when remainingHp > 0
    expect(result.remainingHp).toBeGreaterThan(0);
  });

  it('enemy transitions to dying state on lethal hit (hp === 0 after damage)', () => {
    // 2 HP enemy, 2 damage → 0 HP (dead, would go dying)
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponDamage: 2,
        enemyHp: 2,
        enemyWorldPos: {x: 0.5, y: 0, z: 0},
        weaponRange: 1.5,
        weaponSwingThreshold: 3.0,
      }),
    );
    expect(result.hit).toBe(true);
    expect(result.remainingHp).toBe(0);
  });

  it('flair points are awarded on lethal hit (remainingHp === 0)', () => {
    // flair logic lives in the React component; detectSwing signals the kill via remainingHp === 0
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponDamage: 5,
        enemyHp: 1,
        weaponSwingThreshold: 3.0,
        weaponRange: 2.0,
        enemyWorldPos: {x: 0.5, y: 0, z: 0},
      }),
    );
    // kill signal
    expect(result.hit).toBe(true);
    expect(result.remainingHp).toBe(0);
  });

  it('hp is clamped to 0 (never negative)', () => {
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 0.1, y: 0, z: 0},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 0.016,
        weaponDamage: 100,
        enemyHp: 1,
        weaponSwingThreshold: 3.0,
        weaponRange: 2.0,
        enemyWorldPos: {x: 0.5, y: 0, z: 0},
      }),
    );
    expect(result.remainingHp).toBe(0);
  });

  it('velocity calculation is correct for diagonal movement', () => {
    // 3-4-5 triangle: move 3 on x, 4 on z → dist = 5
    const result = detectSwing(
      makeInputs({
        weaponWorldPos: {x: 3, y: 0, z: 4},
        prevWeaponWorldPos: {x: 0, y: 0, z: 0},
        delta: 1.0,
        weaponSwingThreshold: 10,
        enemyWorldPos: {x: 100, y: 0, z: 0}, // out of range — just testing velocity calc
      }),
    );
    expect(result.velocityMagnitude).toBeCloseTo(5.0);
    expect(result.hit).toBe(false); // threshold not exceeded
  });
});
