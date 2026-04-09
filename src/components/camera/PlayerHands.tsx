/**
 * @module PlayerHands
 * First-person PSX FPS hands anchored to the camera, driven by an
 * animation state machine that reacts to game-level interactions.
 *
 * The rig is `public/models/psx_fps_arms.glb` — 1 skeleton, 7
 * meshes, **23 baked animation clips** (idle, grab L/R, melee swing
 * L/R with recoil, punch L/R, pistol, flashlight, lantern, inspect,
 * thumbs-up, flip-off, T-pose). The full vocabulary is documented
 * in `handGestures.ts`; we use a curated subset that matches the
 * game's interaction verbs.
 *
 * Design rules:
 *
 *  1. **Standing only.** The hands are hidden the moment `posture`
 *     drops to `prone` or `sitting` — the intro sequence shows
 *     nothing sticking out of the camera while Mr. Sausage (the
 *     player) is flat on the mattress.
 *
 *  2. **State machine.** A module-level `handGestureStore` lets
 *     any component request a gesture. The animator picks it up
 *     inside `useFrame` and either loops or plays-once the matching
 *     clip. `once` clips auto-revert to `idle` on end; `hold` clips
 *     stay on the last frame until superseded.
 *
 *  3. **No per-frame React re-renders.** The gesture request lives
 *     in a singleton, not Koota — requesting a new gesture never
 *     invalidates the React tree. This matches the pattern in
 *     `playerPosition.ts` and `useMouseLook.ts`.
 *
 *  4. **Camera-anchored.** The rig tracks `camera.position` and
 *     `camera.quaternion` each frame with soft damping so it feels
 *     weighted. The local offset is tuned so the hands sit in the
 *     bottom-third of the viewport like a normal FPS.
 *
 *  5. **Size calibration.** The raw GLB is in Blender units (~38
 *     units wide). The scale factor reduces that to roughly 0.04
 *     so the hands fit the eye-level FPS frame.
 *
 *  6. **E.5: hands_base.png** is applied as a diffuse texture map to
 *     all meshes in the rig, overlaying the PSX base skin tone.
 */
import {useAnimations, useGLTF, useTexture} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {asset} from '../../utils/assetPath';
import {readHandGesture, resetHandGesture} from './handGestureStore';
import type {HandGesture, HandGestureConfig} from './handGestures';
import {HAND_GESTURES} from './handGestures';

const PSX_HANDS_URL = asset('/models/psx_fps_arms.glb');

/**
 * Local offset from the camera to the hand root. Tuned so the
 * arms enter from the bottom of the frame without crowding the
 * reticle area. Z is negative (into the view) so the hands sit
 * *ahead* of the camera in view-space.
 */
const HAND_LOCAL_OFFSET = new THREE.Vector3(0, -0.35, -0.45);

/** Scale that maps the Blender-unit rig into world-space metres. */
const HAND_SCALE = 0.04;

export function PlayerHands() {
  const {camera} = useThree();
  const group = useRef<THREE.Group>(null);
  const posture = useGameStore(s => s.posture);
  const introActive = useGameStore(s => s.introActive);

  // E.5: Load hands_base.png as diffuse texture for the PSX arms.
  const handsBaseTexture = useTexture(asset('/textures/hands_base.png'));

  // `useGLTF` returns the parsed GLTF with `animations` + `scene`.
  // `useAnimations` wires up the AnimationMixer and exposes a
  // named `.actions` dict we drive in `useFrame`.
  const gltf = useGLTF(PSX_HANDS_URL) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const {actions, mixer} = useAnimations(gltf.animations, group);

  // Clone the scene so multiple <PlayerHands> mounts (tests, dev
  // HMR reloads) don't share skeletons. One instance in production
  // but tests may mount the canvas multiple times in a file.
  // E.5: Apply hands_base.png as diffuse map on all mesh materials.
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false; // hands stay visible even at edge-of-view
        mesh.castShadow = false; // no ghost-arm shadows on walls
        // Apply hands_base texture as the diffuse map
        if (mesh.material && handsBaseTexture) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.isMeshStandardMaterial) {
            const cloneMat = mat.clone();
            cloneMat.map = handsBaseTexture;
            cloneMat.needsUpdate = true;
            mesh.material = cloneMat;
          }
        }
      }
    });
    return clone;
  }, [gltf.scene, handsBaseTexture]);

  // Animation state is held in refs so `useFrame` can mutate without
  // churning the React tree. `activeGesture` is the currently-playing
  // gesture; `lastToken` is the last token we acted on from the
  // gesture store.
  const activeGestureRef = useRef<HandGesture>('idle');
  const lastTokenRef = useRef<number>(-1);

  // Start with the idle loop as soon as the mixer is ready.
  useEffect(() => {
    if (!actions) return;
    const idle = actions[HAND_GESTURES.idle.clip];
    if (idle) {
      idle.reset().play();
      idle.setLoop(THREE.LoopRepeat, Infinity);
    }
    // Dispose all mixer state on unmount so we don't leak
    // animation bindings across HMR reloads / test re-mounts.
    return () => {
      mixer?.stopAllAction();
    };
  }, [actions, mixer]);

  /**
   * Play a gesture — stops the current action, fades in the new
   * one, and hooks `finished` if it's a `once` clip so we can
   * auto-revert. A `hold` clip clamps on its last frame.
   */
  const playGesture = (gesture: HandGesture): void => {
    if (!actions) return;
    const config: HandGestureConfig = HAND_GESTURES[gesture];
    const nextAction = actions[config.clip];
    if (!nextAction) return;

    // Fade the current one out for a smoother blend than hard cut.
    const prevConfig = HAND_GESTURES[activeGestureRef.current];
    const prev = actions[prevConfig.clip];
    if (prev && prev !== nextAction) {
      prev.fadeOut(0.08);
    }

    nextAction.reset();
    nextAction.timeScale = config.speed ?? 1;
    if (config.mode === 'loop') {
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
      nextAction.clampWhenFinished = false;
    } else {
      nextAction.setLoop(THREE.LoopOnce, 1);
      nextAction.clampWhenFinished = config.mode === 'hold';
    }
    nextAction.fadeIn(0.08).play();

    activeGestureRef.current = gesture;
  };

  // Auto-revert `once` clips when they finish. `hold` clips stay
  // on their last frame by design. `playGesture` is omitted from the
  // dep array because it only reads/writes refs and has no React
  // state capture — adding it would force the effect to re-attach
  // every render for no behavioural reason.
  // biome-ignore lint/correctness/useExhaustiveDependencies: playGesture is ref-stable by design
  useEffect(() => {
    if (!mixer) return;
    const onFinished = (event: {action: THREE.AnimationAction}) => {
      const current = activeGestureRef.current;
      const cfg = HAND_GESTURES[current];
      if (cfg.mode !== 'once') return;
      // Only act on the action we were tracking.
      if (event.action !== actions?.[cfg.clip]) return;
      const followUp = cfg.followUp ?? 'idle';
      playGesture(followUp);
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, actions]);

  // Every frame: pick up new gesture requests, step the mixer,
  // and track the camera with damped lerp/slerp.
  useFrame((state, delta) => {
    if (!group.current) return;

    // 1. Poll the gesture store for a new request.
    const req = readHandGesture();
    if (req.token !== lastTokenRef.current) {
      lastTokenRef.current = req.token;
      if (req.gesture !== activeGestureRef.current) {
        playGesture(req.gesture);
      }
    }

    // 2. Advance the mixer.
    mixer?.update(delta);

    // 3. Track the camera. We compute the target position in
    //    world space by rotating the local offset by the camera's
    //    orientation. This gives the classic "hands in front of
    //    the eye" feel without parenting the rig to the camera
    //    (which would make it render in post-scene and ignore
    //    lighting).
    const targetPos = _tmpVec.copy(HAND_LOCAL_OFFSET);
    targetPos.applyQuaternion(camera.quaternion);
    targetPos.add(camera.position);

    const lerpFactor = 1 - 0.001 ** delta;
    group.current.position.lerp(targetPos, lerpFactor);
    group.current.quaternion.slerp(camera.quaternion, lerpFactor);

    // Soft breathing bob while idle, only when standing — never
    // during the prone/sitting intro (the group is hidden anyway,
    // but we skip the math to save a few cycles).
    if (posture === 'standing') {
      const t = state.clock.elapsedTime;
      group.current.position.y += Math.sin(t * 2) * 0.004;
    }
  });

  // STANDING-ONLY visibility. Hidden during the whole intro and
  // for any other non-standing posture.
  const visible = posture === 'standing' && !introActive;

  // Whenever the player leaves the standing posture (or re-enters the
  // intro), force any in-flight gesture back to idle so the next time
  // the hands appear they're not stuck mid-grab. `resetHandGesture`
  // bumps the token so the next `useFrame` picks up the change.
  useEffect(() => {
    if (!visible) {
      resetHandGesture();
      activeGestureRef.current = 'idle';
    }
  }, [visible]);

  return (
    <group ref={group} visible={visible}>
      {/*
        Scale + face-forward rotation. The GLB authors the rig
        pointing down +Z in Blender; we rotate pi around Y so the
        arms face the camera's forward axis (-Z in Three.js).
      */}
      <group scale={HAND_SCALE} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// Shared scratch vector so `useFrame` doesn't allocate per tick.
const _tmpVec = new THREE.Vector3();

useGLTF.preload(PSX_HANDS_URL);
