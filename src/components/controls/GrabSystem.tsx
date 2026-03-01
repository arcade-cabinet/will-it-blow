import {useFrame, useThree} from '@react-three/fiber';
import {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

/** Rapier RigidBodyType numeric values (avoids importing the enum directly) */
const BODY_TYPE_DYNAMIC = 0;
const BODY_TYPE_KINEMATIC_POSITION = 2;

/** How far in front of the camera the grabbed object floats */
const CARRY_DISTANCE = 0.5;
/** Vertical offset below camera center when carrying */
const CARRY_Y_OFFSET = -0.15;
/** Amplitude of the carry bob animation */
const BOB_AMPLITUDE = 0.02;
/** Frequency of the carry bob animation */
const BOB_FREQUENCY = 2.5;
/** Opacity while carrying */
const CARRY_OPACITY = 0.7;
/** Emissive pulse speed for receiver highlight */
const RECEIVER_PULSE_SPEED = 4;

// Reusable vectors to avoid per-frame allocation
const _carryTarget = new THREE.Vector3();
const _screenCenter = new THREE.Vector2(0, 0);

interface GrabbedState {
  /** The Three.js mesh that was grabbed */
  mesh: THREE.Mesh;
  /** The Rapier rigid body ref attached to the mesh's parent */
  rigidBody: any;
  /** Original material opacity */
  originalOpacity: number;
  /** Original material transparent flag */
  originalTransparent: boolean;
  /** userData from the mesh */
  objectType: string;
  objectId: string;
}

/**
 * GrabSystem — raycasting grab/carry/drop mechanic for physics objects.
 *
 * Rendered inside SceneContent (within the Physics provider).
 * Web-only: returns null on native platforms.
 *
 * Click to grab a `userData.grabbable` mesh → carries it in front of camera.
 * Click again to drop: places on a `userData.receiver` mesh, or releases to physics.
 */
export function GrabSystem() {
  if (Platform.OS !== 'web') return null;

  return <GrabSystemInner />;
}

function GrabSystemInner() {
  const {camera, scene, gl} = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const grabbedRef = useRef<GrabbedState | null>(null);
  const hoveredReceiverRef = useRef<THREE.Mesh | null>(null);
  const originalEmissiveRef = useRef<{color: THREE.Color; intensity: number} | null>(null);
  const clockRef = useRef(0);

  const setGrabbedObject = useGameStore(s => s.setGrabbedObject);

  // Walk up the scene graph to find the nearest grabbable ancestor.
  // Raycasts hit child meshes, but userData.grabbable lives on the parent group.
  const findGrabbableRoot = useCallback((obj: THREE.Object3D | null): THREE.Object3D | null => {
    let current = obj;
    while (current) {
      if (current.userData?.grabbable) return current;
      current = current.parent;
    }
    return null;
  }, []);

  // Find the Rapier rigid body for a mesh by walking up the scene graph.
  // @react-three/rapier attaches the rigid body API to the parent Object3D.
  const findRigidBody = useCallback((mesh: THREE.Object3D): any | null => {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      const rb = (current as any).__rb;
      if (rb) return rb;
      // @react-three/rapier stores the api on the object's userData or via ref
      if ((current as any).rigidBody) return (current as any).rigidBody;
      // Check if the rapier instance ref was forwarded
      const userData = current.userData as any;
      if (userData?.rigidBody) return userData.rigidBody;
      current = current.parent;
    }
    return null;
  }, []);

  // Collect all intersectable meshes from the scene
  const getIntersections = useCallback(() => {
    raycaster.current.setFromCamera(_screenCenter, camera);
    return raycaster.current.intersectObjects(scene.children, true);
  }, [camera, scene]);

  // Clear receiver highlight helper — restore original emissive state
  const clearReceiverHighlight = useCallback(() => {
    const prev = hoveredReceiverRef.current;
    if (prev) {
      const mat = prev.material as THREE.MeshStandardMaterial;
      if (mat && originalEmissiveRef.current) {
        mat.emissive.copy(originalEmissiveRef.current.color);
        mat.emissiveIntensity = originalEmissiveRef.current.intensity;
      }
      hoveredReceiverRef.current = null;
      originalEmissiveRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: MouseEvent) => {
      // Only respond during pointer lock (FPS mode)
      const canvas = gl.domElement;
      if (document.pointerLockElement !== canvas) return;

      // Prevent the FPSController click-to-lock from firing again
      e.stopPropagation();

      const grabbed = grabbedRef.current;

      if (grabbed) {
        // --- DROP ---
        const intersections = getIntersections();

        // Check if pointing at a receiver
        let receiverHit: THREE.Mesh | null = null;
        for (const hit of intersections) {
          // Skip the carried object itself
          if (hit.object === grabbed.mesh) continue;
          if (hit.object.userData?.receiver) {
            receiverHit = hit.object as THREE.Mesh;
            break;
          }
        }

        // Restore original material
        const mat = grabbed.mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.opacity = grabbed.originalOpacity;
          mat.transparent = grabbed.originalTransparent;
        }

        if (receiverHit) {
          // Place on receiver: fire callback
          const {onReceive} = receiverHit.userData;
          if (typeof onReceive === 'function') {
            onReceive(grabbed.objectType, grabbed.objectId);
          }
          // Hide the dropped object and deactivate its rigid body
          audioEngine.playDrop();
          grabbed.mesh.visible = false;
          if (grabbed.rigidBody) {
            grabbed.rigidBody.setLinvel({x: 0, y: 0, z: 0}, true);
            grabbed.rigidBody.setAngvel({x: 0, y: 0, z: 0}, true);
            grabbed.rigidBody.setTranslation({x: 0, y: -1000, z: 0}, true);
          }
        } else {
          // Release to physics — let it fall
          if (grabbed.rigidBody) {
            grabbed.rigidBody.setBodyType(BODY_TYPE_DYNAMIC, true);
            // Give a small forward toss
            const forward = _carryTarget.set(0, 0, -1).applyQuaternion(camera.quaternion);
            grabbed.rigidBody.setLinvel({x: forward.x * 1.5, y: 0.5, z: forward.z * 1.5}, true);
          }
        }

        grabbedRef.current = null;
        setGrabbedObject(null);
        clearReceiverHighlight();
      } else {
        // --- GRAB ---
        const intersections = getIntersections();

        for (const hit of intersections) {
          // Walk up the scene graph to find the grabbable root (userData lives on parent group)
          const grabbableRoot = findGrabbableRoot(hit.object);
          if (grabbableRoot) {
            const mesh = hit.object as THREE.Mesh;
            const rb = findRigidBody(grabbableRoot);

            // Switch to kinematic so we control its position
            if (rb) {
              rb.setBodyType(BODY_TYPE_KINEMATIC_POSITION, true);
            }

            // Store original material state
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const origOpacity = mat?.opacity ?? 1;
            const origTransparent = mat?.transparent ?? false;

            // Make semi-transparent while carrying
            if (mat) {
              mat.opacity = CARRY_OPACITY;
              mat.transparent = true;
            }

            grabbedRef.current = {
              mesh,
              rigidBody: rb,
              originalOpacity: origOpacity,
              originalTransparent: origTransparent,
              objectType: grabbableRoot.userData.objectType ?? 'unknown',
              objectId: grabbableRoot.userData.objectId ?? '',
            };

            setGrabbedObject(grabbableRoot.userData.objectId ?? grabbableRoot.name ?? 'object');
            audioEngine.playGrab();
            break;
          }
        }
      }
    },
    [
      camera,
      gl,
      getIntersections,
      findGrabbableRoot,
      findRigidBody,
      setGrabbedObject,
      clearReceiverHighlight,
    ],
  );

  // Register click handler on the canvas
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gl, handlePointerDown]);

  // Per-frame: update carried object position + receiver highlight
  useFrame((_state, delta) => {
    clockRef.current += delta;
    const grabbed = grabbedRef.current;
    if (!grabbed) {
      clearReceiverHighlight();
      return;
    }

    // Compute carry position: in front of camera with gentle bob
    const bob = Math.sin(clockRef.current * BOB_FREQUENCY) * BOB_AMPLITUDE;
    _carryTarget
      .set(0, CARRY_Y_OFFSET + bob, -CARRY_DISTANCE)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);

    // Update rigid body position (kinematic)
    if (grabbed.rigidBody) {
      grabbed.rigidBody.setNextKinematicTranslation({
        x: _carryTarget.x,
        y: _carryTarget.y,
        z: _carryTarget.z,
      });
    } else {
      // Fallback: move mesh directly
      grabbed.mesh.position.copy(_carryTarget);
    }

    // --- Receiver highlight ---
    const intersections = getIntersections();
    let foundReceiver: THREE.Mesh | null = null;
    for (const hit of intersections) {
      if (hit.object === grabbed.mesh) continue;
      if (hit.object.userData?.receiver) {
        foundReceiver = hit.object as THREE.Mesh;
        break;
      }
    }

    // Update highlight state
    if (foundReceiver !== hoveredReceiverRef.current) {
      clearReceiverHighlight();
      hoveredReceiverRef.current = foundReceiver;
      // Store original emissive state for restoration
      if (foundReceiver) {
        const mat = foundReceiver.material as THREE.MeshStandardMaterial;
        if (mat) {
          originalEmissiveRef.current = {
            color: mat.emissive.clone(),
            intensity: mat.emissiveIntensity,
          };
        }
      }
    }

    // Pulse the hovered receiver's emissive
    if (hoveredReceiverRef.current) {
      const mat = hoveredReceiverRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(clockRef.current * RECEIVER_PULSE_SPEED));
        mat.emissive.set('#44ff44');
        mat.emissiveIntensity = pulse * 0.5;
      }
    }
  });

  return null;
}
