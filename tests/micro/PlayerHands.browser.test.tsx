/**
 * Browser test — the PSX first-person hand rig.
 *
 * Focus: the **visibility gate**. The hands MUST be hidden while the
 * player is lying on the mattress (posture !== 'standing') and during
 * the whole intro sequence (introActive === true), and they MUST
 * appear the moment both conditions clear. This is a hard design rule
 * — see `src/components/camera/PlayerHands.tsx` top-of-file comment.
 *
 * We also sanity-check that the rig loads the GLB at all — i.e. the
 * URL resolves, `useGLTF` returns a non-empty scene, and at least a
 * few meshes mount into the tree.
 */
import type * as THREE from 'three';
import {expect, test} from 'vitest';
import {resetHandGesture} from '../../src/components/camera/handGestureStore';
import {PlayerHands} from '../../src/components/camera/PlayerHands';
import {useGameStore} from '../../src/ecs/hooks';
import {
  countMeshes,
  installR3FTestHooks,
  renderR3FAndSettle,
  waitForR3F,
} from '../harness/render/renderR3F';

installR3FTestHooks();

/**
 * Walk the whole scene graph looking for the first `<group>` whose
 * descendants include skinned meshes (the PSX rig has 7 of them).
 * Returns the group's computed world visibility — `true` only if
 * every ancestor has `visible === true`.
 */
function findHandsGroupVisibility(scene: THREE.Object3D): {
  found: boolean;
  visible: boolean;
  skinnedMeshCount: number;
} {
  let found = false;
  let visible = false;
  let skinnedMeshCount = 0;

  scene.traverse(obj => {
    const maybeSkinned = obj as THREE.SkinnedMesh;
    if (maybeSkinned.isSkinnedMesh) {
      skinnedMeshCount += 1;
      if (!found) {
        found = true;
        // Walk up the chain and AND all `visible` flags together —
        // the rig is two nested `<group>`s under our visibility-gated
        // outer `<group ref={group} visible={visible}>`.
        visible = true;
        let cursor: THREE.Object3D | null = obj;
        while (cursor) {
          if (cursor.visible === false) {
            visible = false;
            break;
          }
          cursor = cursor.parent;
        }
      }
    }
  });

  return {found, visible, skinnedMeshCount};
}

test('PlayerHands: hidden during intro + prone, visible when standing', async () => {
  // Start the scene in the "player is lying on the mattress during
  // the intro sequence" state — the FPS arms should be invisible.
  const store = useGameStore.getState();
  store.setIntroActive(true);
  store.setPosture('prone');
  resetHandGesture();

  const handle = await renderR3FAndSettle(<PlayerHands />, {
    cameraPosition: [0, 1.6, 0],
    cameraTarget: [0, 1.6, -1],
    cameraFov: 75,
    // PlayerHands is unlit skinning — it only needs ambient.
    ambientIntensity: 0.8,
    preserveDrawingBuffer: false,
  });

  // Let the GLB load + mount at least 1 skinned mesh. The PSX rig has
  // 7 but we only assert >= 1 so the test stays robust if the author
  // re-packs the GLB.
  await waitForR3F(
    handle,
    () => {
      const {found} = findHandsGroupVisibility(handle.getState().scene);
      return found;
    },
    {timeoutMs: 10_000, description: 'PSX hands skinned mesh mounted'},
  );

  // Extra settle for any late animation bindings.
  await handle.advance(200);

  const proneState = findHandsGroupVisibility(handle.getState().scene);
  expect(proneState.found).toBe(true);
  expect(proneState.skinnedMeshCount).toBeGreaterThanOrEqual(1);
  expect(proneState.visible).toBe(false);

  // Flip to "player sat up but intro still running" — should stay hidden.
  useGameStore.getState().setPosture('sitting');
  await handle.advance(64);
  const sittingState = findHandsGroupVisibility(handle.getState().scene);
  expect(sittingState.visible).toBe(false);

  // Standing but intro still running — STILL hidden. Intro is the
  // authoritative gate when both are true.
  useGameStore.getState().setPosture('standing');
  await handle.advance(64);
  const standingIntroState = findHandsGroupVisibility(handle.getState().scene);
  expect(standingIntroState.visible).toBe(false);

  // Intro ends + standing → hands appear.
  useGameStore.getState().setIntroActive(false);
  await handle.advance(64);
  const standingState = findHandsGroupVisibility(handle.getState().scene);
  expect(standingState.visible).toBe(true);

  // The mesh count sanity check — the PSX rig ships 7 meshes; even
  // counting the cloned scene we should see at least that many.
  expect(countMeshes(handle)).toBeGreaterThanOrEqual(1);

  // Reset the store for downstream tests.
  useGameStore.getState().setPosture('prone');
  useGameStore.getState().setIntroActive(true);
  resetHandGesture();
});
