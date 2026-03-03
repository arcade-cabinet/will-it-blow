import {useFrame} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import {config} from '../../config';
import {useGameStore} from '../../store/gameStore';
import type {Entity} from '../types';
import {world} from '../world';

/** Counter used to generate unique enemy IDs per session. */
let _enemyCounter = 0;

/** Generate a unique ID for a newly spawned enemy. */
function nextEnemyId(): string {
  _enemyCounter += 1;
  return `enemy-${_enemyCounter}`;
}

// ---------------------------------------------------------------------------
// Pure AI state-machine update (exported for unit testing)
// ---------------------------------------------------------------------------

export interface EnemyAIInputs {
  entity: Entity;
  delta: number;
  addStrike: () => void;
  endCombat: () => void;
}

/**
 * Advance one enemy entity through its AI state machine for one frame.
 * Pure with respect to the ECS entity — no store reads (callers inject
 * required callbacks). Returns true if the entity should be removed.
 */
export function updateEnemyAI(inputs: EnemyAIInputs): boolean {
  const {entity, delta, addStrike, endCombat} = inputs;
  const {enemy, three, transform} = entity;
  if (!enemy || !three || !transform) return false;

  switch (enemy.state) {
    case 'spawning': {
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'approaching';
        enemy.stateTimer = 0;
      }
      break;
    }

    case 'approaching': {
      const [tx, ty, tz] = enemy.targetPosition;
      const px = three.position.x;
      const py = three.position.y;
      const pz = three.position.z;
      const dx = tx - px;
      const dy = ty - py;
      const dz = tz - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.5) {
        enemy.state = 'attacking';
        enemy.stateTimer = 2; // first attack lands after 2s
      } else {
        const step = enemy.speed * delta;
        const ratio = step / dist;
        three.position.x += dx * ratio;
        three.position.y += dy * ratio;
        three.position.z += dz * ratio;
        transform.position[0] = three.position.x;
        transform.position[1] = three.position.y;
        transform.position[2] = three.position.z;
      }
      break;
    }

    case 'attacking': {
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        addStrike();
        enemy.stateTimer = 2; // reset attack interval
      }
      break;
    }

    case 'stunned': {
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'approaching';
        enemy.stateTimer = 0;
      }
      break;
    }

    case 'dying': {
      enemy.stateTimer -= delta;
      const progress = Math.max(0, 1 - enemy.stateTimer / 0.5);
      const s = 1 - progress;
      three.scale.set(s, s, s);
      if (enemy.stateTimer <= 0) {
        enemy.state = 'dead';
        enemy.stateTimer = 3; // linger 3s before removal
        endCombat();
      }
      break;
    }

    case 'dead': {
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        return true; // signal removal
      }
      break;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// React component — the actual ECS system
// ---------------------------------------------------------------------------

/**
 * EnemySpawnSystem
 *
 * Watches for station transitions (currentChallenge changes) and rolls
 * against `difficulty.enemyChance` to decide whether to spawn an enemy.
 * Also runs the AI state machine every frame for all active enemies.
 *
 * Follows the same useFrame pattern as VibrationSystem / RotationSystem.
 */
export function EnemySpawnSystem() {
  const prevChallenge = useRef<number>(-1);

  // Stable refs to store state/actions — avoids re-subscribing every render
  const storeRef = useRef({
    addStrike: useGameStore.getState().addStrike,
    startCombat: useGameStore.getState().startCombat,
    endCombat: useGameStore.getState().endCombat,
    getPlayerPosition: () => useGameStore.getState().playerPosition,
    getCombatActive: () => useGameStore.getState().combatActive,
    getDifficulty: () => useGameStore.getState().difficulty,
    getCurrentChallenge: () => useGameStore.getState().currentChallenge,
  });

  // Watch currentChallenge for transitions
  useEffect(() => {
    const unsub = useGameStore.subscribe(state => {
      const challenge = state.currentChallenge;
      if (challenge === prevChallenge.current) return;
      const wasValid = prevChallenge.current >= 0;
      prevChallenge.current = challenge;

      // Don't spawn on the very first mount (no prior challenge)
      if (!wasValid) return;

      const {getCombatActive, getDifficulty, getPlayerPosition, startCombat} = storeRef.current;
      if (getCombatActive()) return; // one enemy at a time

      const difficulty = getDifficulty();
      if (Math.random() >= difficulty.enemyChance) return;

      // Pick a random enemy definition and spawn cabinet
      const enemyDefs = config.enemies.enemies;
      const cabinets = config.enemies.spawnCabinets;
      const enemyDef = enemyDefs[Math.floor(Math.random() * enemyDefs.length)];
      const cabinet = cabinets[Math.floor(Math.random() * cabinets.length)];

      const id = nextEnemyId();
      const playerPos = getPlayerPosition();

      const entity: Entity = {
        name: id,
        enemy: {
          type: enemyDef.id,
          hp: enemyDef.hp,
          maxHp: enemyDef.hp,
          speed: enemyDef.speed,
          damage: enemyDef.damage,
          state: 'spawning',
          targetPosition: [...playerPos] as [number, number, number],
          stateTimer: enemyDef.reactionWindowMs / 1000,
          spawnCabinetId: cabinet.id,
          deathDropIngredient: enemyDef.deathDropIngredient,
        },
        transform: {
          position: [...cabinet.position] as [number, number, number],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        three: undefined, // renderer will attach
      };

      world.add(entity);

      startCombat({id, type: enemyDef.id, hp: enemyDef.hp, maxHp: enemyDef.hp});
    });

    return unsub;
  }, []);

  // Per-frame AI update
  useFrame((_, delta) => {
    const toRemove: Entity[] = [];

    for (const entity of world.with('enemy', 'transform')) {
      if (!entity.three) continue; // not yet rendered

      const shouldRemove = updateEnemyAI({
        entity,
        delta,
        addStrike: storeRef.current.addStrike,
        endCombat: storeRef.current.endCombat,
      });

      if (shouldRemove) {
        toRemove.push(entity);
      }
    }

    for (const e of toRemove) {
      world.remove(e);
    }
  });

  return null;
}
