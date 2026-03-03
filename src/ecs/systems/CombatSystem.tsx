import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';
import {enemies, weapons, world} from '../world';

/** Camera shake duration in seconds after a hit. */
const CAMERA_SHAKE_DURATION = 0.1;
/** Camera shake amplitude. */
const CAMERA_SHAKE_AMPLITUDE = 0.04;
/** Enemy proximity warning radius (units). */
const PROXIMITY_WARNING_RADIUS = 3;

// Reusable vectors — avoid per-frame allocation.
const _weaponPos = new THREE.Vector3();
const _enemyPos = new THREE.Vector3();
const _prevWeaponPos = new THREE.Vector3();

/**
 * Pure update function — detects weapon swings and applies damage to enemies.
 * Exported for unit testing.
 *
 * Returns the remaining HP after the hit, or -1 if no hit occurred.
 */
export function detectSwing(inputs: {
  weaponWorldPos: {x: number; y: number; z: number};
  prevWeaponWorldPos: {x: number; y: number; z: number};
  delta: number;
  weaponDamage: number;
  weaponRange: number;
  weaponSwingThreshold: number;
  enemyWorldPos: {x: number; y: number; z: number};
  enemyHp: number;
}): {hit: boolean; remainingHp: number; velocityMagnitude: number} {
  const dx = inputs.weaponWorldPos.x - inputs.prevWeaponWorldPos.x;
  const dy = inputs.weaponWorldPos.y - inputs.prevWeaponWorldPos.y;
  const dz = inputs.weaponWorldPos.z - inputs.prevWeaponWorldPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const velocityMagnitude = inputs.delta > 0 ? dist / inputs.delta : 0;

  if (velocityMagnitude < inputs.weaponSwingThreshold) {
    return {hit: false, remainingHp: inputs.enemyHp, velocityMagnitude};
  }

  const ex = inputs.enemyWorldPos.x - inputs.weaponWorldPos.x;
  const ey = inputs.enemyWorldPos.y - inputs.weaponWorldPos.y;
  const ez = inputs.enemyWorldPos.z - inputs.weaponWorldPos.z;
  const enemyDist = Math.sqrt(ex * ex + ey * ey + ez * ez);

  if (enemyDist > inputs.weaponRange) {
    return {hit: false, remainingHp: inputs.enemyHp, velocityMagnitude};
  }

  const remainingHp = Math.max(0, inputs.enemyHp - inputs.weaponDamage);
  return {hit: true, remainingHp, velocityMagnitude};
}

/**
 * CombatSystem — ECS system that:
 * 1. Tags kitchen objects matching weapon config as ECS weapon entities.
 * 2. Each frame, tracks swing velocity of the grabbed weapon.
 * 3. Deals damage when swing speed exceeds threshold and an enemy is in range.
 * 4. Applies camera shake on hit, proximity warning near enemies.
 * 5. Awards flair points on kill.
 *
 * This system does NOT handle grab/drop — GrabSystem owns that.
 * CombatSystem reads grabbedObject from the store and detects swings.
 */
export function CombatSystem() {
  const {camera} = useThree();

  // Store selectors — minimal subscriptions to avoid re-renders.
  const grabbedObject = useGameStore(s => s.grabbedObject);
  const combatActive = useGameStore(s => s.combatActive);
  const damageEnemy = useGameStore(s => s.damageEnemy);
  const endCombat = useGameStore(s => s.endCombat);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);
  const activeEnemy = useGameStore(s => s.activeEnemy);

  /** Previous frame weapon world position. */
  const prevWeaponPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  /** Whether we have a valid previous position. */
  const hasPrevPosRef = useRef(false);
  /** Camera shake timer (seconds remaining). */
  const shakeTimerRef = useRef(0);
  /** Original camera position for shake restoration. */
  const cameraBaseRef = useRef(new THREE.Vector3());
  /** Whether we are mid-shake and have stored the base. */
  const shakingRef = useRef(false);
  /** Cooldown after a hit to prevent multi-hit per swing (seconds). */
  const hitCooldownRef = useRef(0);
  /** Ref to expose proximity warning status (read by HUD without store overhead). */
  const proximityWarningRef = useRef(false);

  // On mount: tag any scene objects matching weapon config with the `weapon`
  // ECS component and flag them as grabbable.
  useEffect(() => {
    const weaponDefs = config.enemies.weapons;

    // Walk the Three.js scene looking for objects whose userData.objectId or
    // name matches a weapon model filename.
    const scene = camera.parent;
    if (!scene) return;

    function tagRecursive(obj: THREE.Object3D) {
      const id: string = obj.userData?.objectId ?? obj.name ?? '';
      for (const wDef of weaponDefs) {
        // Match by model stem (e.g. 'frying_pan' in 'frying_pan.glb') or exact objectId.
        const modelStem =
          wDef.model
            .replace(/\.glb$/, '')
            .split('/')
            .pop() ?? '';
        if (id === wDef.id || id.includes(modelStem)) {
          // Mark as grabbable for GrabSystem.
          obj.userData.grabbable = true;
          obj.userData.objectId = wDef.id;
          obj.userData.objectType = 'weapon';

          // Tag with weapon ECS component if not already present.
          const existing = [...weapons].find(e => e.three === obj);
          if (!existing) {
            world.add({
              name: wDef.id,
              three: obj,
              weapon: {
                id: wDef.id,
                damage: wDef.damage,
                range: wDef.range,
                knockback: wDef.knockback,
                swingSpeedThreshold: wDef.swingSpeedThreshold,
                hitSfx: wDef.hitSfx,
              },
            });
          }
        }
      }
      for (const child of obj.children) {
        tagRecursive(child);
      }
    }

    // Walk the whole scene graph from root.
    let root: THREE.Object3D = camera;
    while (root.parent) root = root.parent;
    tagRecursive(root);
  }, [camera]);

  useFrame((_state, delta) => {
    // Tick cooldown.
    if (hitCooldownRef.current > 0) {
      hitCooldownRef.current = Math.max(0, hitCooldownRef.current - delta);
    }

    // --- Camera shake ---
    if (shakeTimerRef.current > 0) {
      shakeTimerRef.current -= delta;
      if (shakeTimerRef.current <= 0) {
        // Shake over — restore camera.
        if (shakingRef.current) {
          camera.position.copy(cameraBaseRef.current);
          shakingRef.current = false;
        }
      } else {
        const amp = CAMERA_SHAKE_AMPLITUDE * (shakeTimerRef.current / CAMERA_SHAKE_DURATION);
        camera.position.x = cameraBaseRef.current.x + (Math.random() - 0.5) * 2 * amp;
        camera.position.y = cameraBaseRef.current.y + (Math.random() - 0.5) * 2 * amp;
      }
    }

    // --- Proximity warning ---
    let nearEnemy = false;
    for (const enemyEntity of enemies) {
      if (!enemyEntity.three) continue;
      enemyEntity.three.getWorldPosition(_enemyPos);
      const dx = _enemyPos.x - camera.position.x;
      const dz = _enemyPos.z - camera.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < PROXIMITY_WARNING_RADIUS) {
        nearEnemy = true;
        break;
      }
    }
    proximityWarningRef.current = nearEnemy;

    // --- Swing detection ---
    if (!combatActive || !activeEnemy || !grabbedObject) {
      hasPrevPosRef.current = false;
      return;
    }

    // Find the grabbed weapon entity.
    const weaponEntity = [...weapons].find(
      e => e.weapon?.id === grabbedObject || e.name === grabbedObject,
    );
    if (!weaponEntity?.three || !weaponEntity.weapon) {
      hasPrevPosRef.current = false;
      return;
    }

    weaponEntity.three.getWorldPosition(_weaponPos);

    if (!hasPrevPosRef.current) {
      prevWeaponPosRef.current.copy(_weaponPos);
      hasPrevPosRef.current = true;
      return;
    }

    // Find the active enemy entity.
    const enemyEntity = [...enemies].find(
      e => e.enemy?.state !== 'dead' && e.enemy?.state !== 'dying',
    );
    if (!enemyEntity?.three || !enemyEntity.enemy) {
      _prevWeaponPos.copy(_weaponPos);
      prevWeaponPosRef.current.copy(_weaponPos);
      return;
    }

    enemyEntity.three.getWorldPosition(_enemyPos);

    if (hitCooldownRef.current <= 0) {
      const result = detectSwing({
        weaponWorldPos: {x: _weaponPos.x, y: _weaponPos.y, z: _weaponPos.z},
        prevWeaponWorldPos: {
          x: prevWeaponPosRef.current.x,
          y: prevWeaponPosRef.current.y,
          z: prevWeaponPosRef.current.z,
        },
        delta,
        weaponDamage: weaponEntity.weapon.damage,
        weaponRange: weaponEntity.weapon.range,
        weaponSwingThreshold: weaponEntity.weapon.swingSpeedThreshold,
        enemyWorldPos: {x: _enemyPos.x, y: _enemyPos.y, z: _enemyPos.z},
        enemyHp: enemyEntity.enemy.hp,
      });

      if (result.hit) {
        // Apply damage via store.
        const remainingHp = damageEnemy(weaponEntity.weapon.damage);

        // Knockback: push enemy Object3D away from weapon.
        const knockback = weaponEntity.weapon.knockback;
        if (knockback > 0 && enemyEntity.three) {
          const kx = _enemyPos.x - _weaponPos.x;
          const kz = _enemyPos.z - _weaponPos.z;
          const kLen = Math.sqrt(kx * kx + kz * kz) || 1;
          enemyEntity.three.position.x += (kx / kLen) * knockback;
          enemyEntity.three.position.z += (kz / kLen) * knockback;
        }

        // Update enemy ECS state.
        if (remainingHp > 0) {
          enemyEntity.enemy.state = 'stunned';
          enemyEntity.enemy.stateTimer = 0;
        } else {
          enemyEntity.enemy.state = 'dying';
          enemyEntity.enemy.stateTimer = 0;
          endCombat();
          recordFlairPoint('combat-kill', 10);
        }

        // Play hit SFX (best-effort mapping to available audio samples).
        try {
          audioEngine.playChop();
        } catch {
          // Audio may not be initialized during tests.
        }

        // Camera shake.
        if (!shakingRef.current) {
          cameraBaseRef.current.copy(camera.position);
          shakingRef.current = true;
        }
        shakeTimerRef.current = CAMERA_SHAKE_DURATION;

        // Cooldown to prevent multi-hit.
        hitCooldownRef.current = 0.3;
      }
    }

    prevWeaponPosRef.current.copy(_weaponPos);
  });

  return null;
}
