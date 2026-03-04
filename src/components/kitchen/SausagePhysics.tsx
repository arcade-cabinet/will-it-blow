/**
 * @module SausagePhysics
 * R3F component that wraps the coil SausageBody visual geometry with Rapier physics.
 *
 * Activated when `sausagePlaced === true` in the Zustand store.
 * Position is driven from the stuffer output target (passed as prop).
 *
 * Architecture:
 * - 4-8 `RigidBody` segments (type="dynamic") placed along the sausage length.
 * - Each segment gets a `BallCollider` matching the sausage radius (~0.5).
 * - First segment is `kinematicPosition`, anchored to the nozzle/stuffer output.
 * - Spring-damper impulses (computeSpringImpulse) pull segments toward rest positions.
 * - Twist/pinch points from Zustand reduce spring stiffness at those segments.
 * - Exceeding tension threshold at a break point separates the joint (sets a flag).
 * - Grab interaction: segments with `userData.grabbable = true` switch to kinematic.
 * - Cooking deformation via `applyCookingShrinkage` when cookLevel > 0.
 *
 * Only renders on web (Rapier WASM unavailable on native).
 */

import {useFrame} from '@react-three/fiber';
import {BallCollider, type RapierRigidBody, RigidBody} from '@react-three/rapier';
import {useMemo, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {getChallengeIndex} from '../../engine/ChallengeManifest';
import {
  applyCookingShrinkage,
  buildSausageGeometry,
  computeSpringImpulse,
} from '../../engine/SausageBody';
import {useGameStore} from '../../store/gameStore';

const COOKING_INDEX = getChallengeIndex('cooking');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of physics segments along the coil sausage. */
const NUM_SEGMENTS = 6;

/** Sausage tube radius for BallCollider. */
const SAUSAGE_RADIUS = 0.5;

/** Spring stiffness for normal (non-twist) segments. */
const SPRING_K_NORMAL = 80;

/** Reduced spring stiffness at twist/pinch points. */
const SPRING_K_PINCH = 20;

/** Damping applied to all segment velocities. */
const SPRING_DAMPING = 10;

/**
 * Tension (distance from rest position) above which a pinch-point joint breaks.
 * At twist points the reduced stiffness means more stretch before break.
 */
const BREAK_TENSION_THRESHOLD = 2.5;

/** Default SausageCurve params for the coil visual. */
const SAUSAGE_PARAMS = {
  loops: 4,
  thickness: SAUSAGE_RADIUS,
  pathSegments: 300,
  radialSegments: 32,
};

// ---------------------------------------------------------------------------
// SausagePhysicsInner — the actual physics-wired component
// ---------------------------------------------------------------------------

interface SausagePhysicsInnerProps {
  position: [number, number, number];
}

function SausagePhysicsInner({position}: SausagePhysicsInnerProps) {
  // ---- store ----
  const sausagePlaced = useGameStore(s => s.sausagePlaced);
  const twistPoints = useGameStore(s => s.playerDecisions.twistPoints);
  const blendColor = useGameStore(s => s.blendColor);
  const cookLevel = useGameStore(s => s.playerDecisions.finalCookLevel);
  const isCooking = useGameStore(
    s => s.gameStatus === 'playing' && s.currentChallenge === COOKING_INDEX,
  );

  // ---- geometry (coil sausage) ----
  const geoResult = useMemo(() => buildSausageGeometry(SAUSAGE_PARAMS), []);

  // ---- material ----
  // Color is applied each frame via material.color.set(blendColor) in useFrame.
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.6,
        metalness: 0.0,
      }),
    [],
  );

  // ---- skeleton / bones ----
  const {bones, skinnedMesh} = useMemo(() => {
    const _bones: THREE.Bone[] = [];
    const rootBone = new THREE.Bone();

    for (let i = 0; i < geoResult.numBones; i++) {
      const bone = new THREE.Bone();
      bone.position.copy(geoResult.anchors[i].base);
      rootBone.add(bone);
      _bones.push(bone);
    }

    const skeleton = new THREE.Skeleton(_bones);
    const mesh = new THREE.SkinnedMesh(geoResult.geometry, material);
    mesh.add(rootBone);
    mesh.bind(skeleton);
    mesh.frustumCulled = false;

    return {bones: _bones, skinnedMesh: mesh};
  }, [geoResult, material]);

  // ---- Rapier refs ----
  /** One ref per physics segment (NUM_SEGMENTS total) */
  const segmentRefs = useRef<(RapierRigidBody | null)[]>(Array(NUM_SEGMENTS).fill(null));

  /** Which segment indices have broken joints at their pre-segment pinch point */
  const brokenJoints = useRef<Set<number>>(new Set());

  /** Whether each segment is currently grabbed (kinematic overridden by GrabSystem) */
  const grabbedSegment = useRef<number | null>(null);

  // Refs for values read inside useFrame (avoids stale closures)
  const twistRef = useRef(twistPoints);
  twistRef.current = twistPoints;
  const cookLevelRef = useRef(cookLevel);
  cookLevelRef.current = cookLevel;
  const isCookingRef = useRef(isCooking);
  isCookingRef.current = isCooking;
  const placedRef = useRef(sausagePlaced);
  placedRef.current = sausagePlaced;

  // Reusable Vector3 for spring target
  const springTargetVec = useRef(new THREE.Vector3());

  // ---- useFrame: spring physics → bone positions ----
  useFrame(({clock}, delta) => {
    if (!placedRef.current) return;

    const time = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // Map each physics segment to the bone indices it controls.
    // Segments are spaced evenly across numBones.
    const bonesPerSegment = Math.floor(geoResult.numBones / NUM_SEGMENTS);

    for (let s = 0; s < NUM_SEGMENTS; s++) {
      const body = segmentRefs.current[s];
      if (!body) continue;

      // The anchor index this segment is responsible for
      const anchorIndex = Math.min(
        Math.floor((s + 0.5) * (geoResult.numBones / NUM_SEGMENTS)),
        geoResult.numBones - 1,
      );
      const anchor = geoResult.anchors[anchorIndex];

      // Skip grab segment — GrabSystem drives it kinematically
      if (grabbedSegment.current === s) continue;

      // Determine whether this segment sits at a twist point
      const segNorm = s / (NUM_SEGMENTS - 1);
      const isTwistSeg = twistRef.current.some(tp => Math.abs(segNorm - tp) < 1 / NUM_SEGMENTS);

      // Cooking deformation on the anchor base position
      if (cookLevelRef.current > 0) {
        applyCookingShrinkage(
          anchor,
          cookLevelRef.current,
          time,
          anchorIndex,
          isCookingRef.current,
        );
      }

      // Rest position in world space
      springTargetVec.current.set(
        position[0] + anchor.base.x,
        position[1] + anchor.base.y,
        position[2] + anchor.base.z,
      );

      const bodyPos = body.translation();
      const bodyVel = body.linvel();

      // Break logic at twist/pinch points: if tension exceeds threshold, break joint
      if (isTwistSeg && !brokenJoints.current.has(s)) {
        const dx = bodyPos.x - springTargetVec.current.x;
        const dy = bodyPos.y - springTargetVec.current.y;
        const dz = bodyPos.z - springTargetVec.current.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > BREAK_TENSION_THRESHOLD) {
          brokenJoints.current.add(s);
          // Enable gravity for broken segments so they fall away
          body.setGravityScale(1, true);
        }
      }

      // Apply spring force (reduced stiffness at twist points, zero at broken joints)
      const isBroken = brokenJoints.current.has(s);
      if (!isBroken) {
        const k = isTwistSeg ? SPRING_K_PINCH : SPRING_K_NORMAL;
        const impulse = computeSpringImpulse(
          springTargetVec.current,
          bodyPos,
          bodyVel,
          dt,
          k,
          SPRING_DAMPING,
        );
        body.applyImpulse(impulse, true);
      }

      // Read back position into the bones this segment controls
      const pos = body.translation();
      const startBone = s * bonesPerSegment;
      const endBone = Math.min(startBone + bonesPerSegment, geoResult.numBones);
      for (let b = startBone; b < endBone; b++) {
        const boneAnchor = geoResult.anchors[b];
        // Interpolate between previous segment position and this one for smooth skinning
        const lerpT = (b - startBone) / Math.max(1, bonesPerSegment - 1);
        const prevBody = s > 0 ? segmentRefs.current[s - 1] : null;
        if (prevBody && lerpT < 1) {
          const prevPos = prevBody.translation();
          bones[b]?.position.set(
            prevPos.x * (1 - lerpT) + pos.x * lerpT - position[0],
            prevPos.y * (1 - lerpT) + pos.y * lerpT - position[1],
            prevPos.z * (1 - lerpT) + pos.z * lerpT - position[2],
          );
        } else {
          bones[b]?.position.set(pos.x - position[0], pos.y - position[1], pos.z - position[2]);
        }

        // Update anchor base so cooking deformation accumulates
        if (boneAnchor) {
          boneAnchor.base.set(pos.x - position[0], pos.y - position[1], pos.z - position[2]);
        }
      }
    }

    // Update material color from blend (once per frame, not recreated)
    material.color.set(blendColor);
  });

  if (!sausagePlaced) return null;

  // Compute evenly-spaced rest positions for each segment along the coil
  const segmentRestPositions: [number, number, number][] = Array.from(
    {length: NUM_SEGMENTS},
    (_, s) => {
      const anchorIndex = Math.min(
        Math.floor((s + 0.5) * (geoResult.numBones / NUM_SEGMENTS)),
        geoResult.numBones - 1,
      );
      const anchor = geoResult.anchors[anchorIndex];
      return [
        position[0] + anchor.base.x,
        position[1] + anchor.base.y,
        position[2] + anchor.base.z,
      ];
    },
  );

  return (
    <group>
      {/* Skinned mesh — visual coil geometry */}
      <primitive object={skinnedMesh} />

      {/* Physics segments */}
      {segmentRestPositions.map((segPos, s) => {
        const isAnchor = s === 0;
        return (
          <RigidBody
            key={s}
            ref={(ref: RapierRigidBody | null) => {
              segmentRefs.current[s] = ref;
            }}
            type={isAnchor ? 'kinematicPosition' : 'dynamic'}
            position={segPos}
            linearDamping={8}
            angularDamping={5}
            gravityScale={0}
            colliders={false}
            userData={{
              grabbable: !isAnchor,
              objectType: 'sausage',
              objectId: `sausage-segment-${s}`,
              segmentIndex: s,
            }}
          >
            <BallCollider args={[SAUSAGE_RADIUS * 0.3]} mass={1} restitution={0} />
          </RigidBody>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// SausagePhysics — public export, web-only guard
// ---------------------------------------------------------------------------

export interface SausagePhysicsProps {
  /** World-space position — should match the stuffer output target. */
  position: [number, number, number];
}

/**
 * Rapier-physics coil sausage component.
 *
 * Web-only: returns null on native platforms (Rapier WASM unavailable).
 * Must be rendered inside a `<Physics>` provider (already present in GameWorld).
 * Activates automatically when `sausagePlaced` is true in the Zustand store.
 *
 * @param props.position - World-space origin from the stuffer output target.
 */
export function SausagePhysics({position}: SausagePhysicsProps) {
  if (Platform.OS !== 'web') return null;
  return <SausagePhysicsInner position={position} />;
}
