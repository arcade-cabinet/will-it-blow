import * as CANNON from 'cannon-es';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';
import {
  CannonJSPlugin,
  type Camera,
  Color3,
  Color4,
  FreeCamera,
  HemisphericLight,
  type Observer,
  type Scene as BabylonScene,
  Vector3,
} from '@babylonjs/core';
import { useGameStore } from '../store/gameStore';
import { useNavigationStore } from '../store/navigationStore';
import { getWaypoint, type WaypointId } from '../engine/WaypointGraph';
import { KitchenEnvironment } from './kitchen/KitchenEnvironment';
import { CrtTelevision } from './kitchen/CrtTelevision';
import { FridgeStation } from './kitchen/FridgeStation';
import { GrinderStation } from './kitchen/GrinderStation';
import { getRandomIngredientPool } from '../engine/Ingredients';
import { matchesCriteria } from '../engine/IngredientMatcher';
import { pickVariant } from '../engine/ChallengeRegistry';
import type { IngredientVariant } from '../data/challenges/variants';

// cannon-es compat: Babylon's CannonJSPlugin reads from globalThis.CANNON
(globalThis as any).CANNON = CANNON;

export const GameWorld = () => {
  const { gameStatus, currentChallenge, variantSeed, challengeProgress, strikes } = useGameStore();
  const { currentWaypoint: navWaypoint } = useNavigationStore();
  const [camera, setCamera] = useState<Camera>();
  const camObserverRef = useRef<Observer<BabylonScene> | null>(null);

  // Fridge station state for 3D visual feedback
  const [fridgeSelectedIds, setFridgeSelectedIds] = useState<Set<number>>(new Set());
  const [fridgeHintActive, setFridgeHintActive] = useState(false);

  const showFridge = gameStatus === 'playing' && currentChallenge === 0;
  const showGrinder = gameStatus === 'playing' && currentChallenge === 1;

  // Grinder station state derived from store
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  // Animate crank angle based on challenge progress changes
  useEffect(() => {
    if (showGrinder) {
      // Map progress to crank rotation (multiple full rotations over the challenge)
      grinderCrankAngle.current = (challengeProgress / 100) * Math.PI * 8;
    }
  }, [showGrinder, challengeProgress]);

  // Detect new strikes to trigger splatter visual
  const [grinderSplattering, setGrinderSplattering] = useState(false);
  useEffect(() => {
    if (showGrinder && strikes > prevStrikesRef.current) {
      setGrinderSplattering(true);
      const timeout = setTimeout(() => setGrinderSplattering(false), 800);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStrikesRef.current = strikes;
  }, [showGrinder, strikes]);

  // Generate a stable ingredient pool + matching indices for the fridge 3D display
  const fridgeData = useMemo(() => {
    if (!showFridge) return null;
    const pool = getRandomIngredientPool(10);
    const v = pickVariant('ingredients', variantSeed) as IngredientVariant | null;
    const matching = new Set<number>();
    if (v) {
      pool.forEach((ing, i) => {
        if (matchesCriteria(ing, v.criteria)) matching.add(i);
      });
    }
    return { pool, matching };
  }, [showFridge, variantSeed]);

  const onSceneReady = (scene: any) => {
    scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);
    scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());

    // Dim ambient light (horror atmosphere)
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.3;
    ambientLight.groundColor = new Color3(0.1, 0.08, 0.06);

    // FreeCamera at center waypoint
    const startWp = getWaypoint('center');
    const cam = new FreeCamera(
      'playerCamera',
      new Vector3(startWp.position[0], startWp.position[1], startWp.position[2]),
      scene,
    );
    cam.setTarget(new Vector3(startWp.lookAt[0], startWp.lookAt[1], startWp.lookAt[2]));
    cam.minZ = 0.1;

    // Disable WASD/arrow key movement (waypoint-only navigation)
    cam.keysUp = [];
    cam.keysDown = [];
    cam.keysLeft = [];
    cam.keysRight = [];

    // Enable mouse/touch rotation
    cam.attachControl(scene.getEngine().getRenderingCanvas(), true);

    scene.activeCamera = cam;
    setCamera(cam);
  };

  // Navigate to a new waypoint with smooth camera interpolation
  const navigateToWaypoint = useCallback(
    (targetId: WaypointId) => {
      if (!camera) return;
      const cam = camera as FreeCamera;
      const scene = cam.getScene();
      const target = getWaypoint(targetId);

      // Remove previous animation
      if (camObserverRef.current) {
        scene.onBeforeRenderObservable.remove(camObserverRef.current);
        camObserverRef.current = null;
      }

      const startPos = cam.position.clone();
      const endPos = new Vector3(target.position[0], target.position[1], target.position[2]);
      const endTarget = new Vector3(target.lookAt[0], target.lookAt[1], target.lookAt[2]);

      let t = 0;
      const observer = scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        t = Math.min(t + dt * 2.0, 1); // ~0.5s transition
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic

        cam.position = Vector3.Lerp(startPos, endPos, ease);
        cam.setTarget(Vector3.Lerp(cam.getTarget(), endTarget, ease * 0.5 + 0.5));

        if (t >= 1) {
          scene.onBeforeRenderObservable.remove(observer);
          camObserverRef.current = null;
        }
      });
      camObserverRef.current = observer;

      useNavigationStore.getState().setCurrentWaypoint(targetId);
    },
    [camera],
  );

  // Register navigate function in the navigation store once camera is ready
  useEffect(() => {
    if (camera) {
      useNavigationStore.getState().setNavigateTo(navigateToWaypoint);
    }
  }, [camera, navigateToWaypoint]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (camObserverRef.current && camera) {
        const scene = (camera as FreeCamera).getScene();
        scene.onBeforeRenderObservable.remove(camObserverRef.current);
      }
    };
  }, [camera]);

  // reactylon Engine types are incomplete — antialias/style work at runtime
  const engineProps = {
    engineOptions: { preserveDrawingBuffer: true, stencil: true, antialias: true },
    style: { width: '100%', height: '100%' },
  } as any;

  return (
    <Engine {...engineProps}>
      <Scene onSceneReady={onSceneReady}>
        {camera && (
          <>
            <KitchenEnvironment />
            <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : 'idle'} />
            {showFridge && fridgeData && (
              <FridgeStation
                ingredients={fridgeData.pool}
                selectedIds={fridgeSelectedIds}
                hintActive={fridgeHintActive}
                matchingIndices={fridgeData.matching}
                onSelect={(index) => {
                  setFridgeSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.add(index);
                    return next;
                  });
                }}
              />
            )}
            {showGrinder && (
              <GrinderStation
                grindProgress={challengeProgress}
                crankAngle={grinderCrankAngle.current}
                isSplattering={grinderSplattering}
              />
            )}
          </>
        )}
      </Scene>
    </Engine>
  );
};
