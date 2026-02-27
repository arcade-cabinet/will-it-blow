import * as CANNON from 'cannon-es';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scene } from 'reactylon';
import { NativeEngine } from 'reactylon/mobile';
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
import { KitchenEnvironment } from './kitchen/KitchenEnvironment';
import { CrtTelevision } from './kitchen/CrtTelevision';
import { FridgeStation } from './kitchen/FridgeStation';
import { GrinderStation } from './kitchen/GrinderStation';
import { StufferStation } from './kitchen/StufferStation';
import { StoveStation } from './kitchen/StoveStation';
import { getRandomIngredientPool } from '../engine/Ingredients';
import { matchesCriteria } from '../engine/IngredientMatcher';
import { pickVariant } from '../engine/ChallengeRegistry';
import type { IngredientVariant } from '../data/challenges/variants';

// cannon-es compat: Babylon's CannonJSPlugin reads from globalThis.CANNON
(globalThis as any).CANNON = CANNON;

/** Camera positions for each challenge station, in order along the basement. */
const STATION_CAMERAS: { position: [number, number, number]; lookAt: [number, number, number] }[] = [
  // 0: Fridge (left side of room)
  { position: [-4, 1.6, -2], lookAt: [-5, 1.2, -4] },
  // 1: Grinder (center-left)
  { position: [-1.5, 1.6, -3], lookAt: [-1.5, 1.0, -5] },
  // 2: Stuffer (center-right)
  { position: [1.5, 1.6, -2], lookAt: [2.5, 1.0, -4] },
  // 3: Stove (right side)
  { position: [4, 1.6, -3], lookAt: [4, 0.8, -5.5] },
  // 4: Tasting (back to center, facing CRT TV on back wall)
  { position: [0, 1.6, -3], lookAt: [0, 2.5, -6.8] },
];

export const GameWorld = () => {
  const { gameStatus, currentChallenge, variantSeed, challengeProgress, challengePressure, challengeIsPressing, challengeTemperature, challengeHeatLevel, strikes } = useGameStore();
  const [camera, setCamera] = useState<Camera>();
  const walkObserverRef = useRef<Observer<BabylonScene> | null>(null);

  // Fridge station state for 3D visual feedback
  const [fridgeSelectedIds, setFridgeSelectedIds] = useState<Set<number>>(new Set());
  const [fridgeHintActive, setFridgeHintActive] = useState(false);

  const showFridge = gameStatus === 'playing' && currentChallenge === 0;
  const showGrinder = gameStatus === 'playing' && currentChallenge === 1;
  const showStuffer = gameStatus === 'playing' && currentChallenge === 2;
  const showStove = gameStatus === 'playing' && currentChallenge === 3;
  const showTasting = gameStatus === 'playing' && currentChallenge === 4;

  // Grinder station state derived from store
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  // Animate crank angle based on challenge progress changes
  useEffect(() => {
    if (showGrinder) {
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

  // Stuffer station state: detect burst from strike changes
  const [stufferBurst, setStufferBurst] = useState(false);
  const prevStufferStrikesRef = useRef(strikes);
  useEffect(() => {
    if (showStuffer && strikes > prevStufferStrikesRef.current) {
      setStufferBurst(true);
      const timeout = setTimeout(() => setStufferBurst(false), 1000);
      prevStufferStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStufferStrikesRef.current = strikes;
  }, [showStuffer, strikes]);

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

    // Dim ambient fill (fluorescent tubes in KitchenEnvironment provide main light)
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.15;
    ambientLight.groundColor = new Color3(0.1, 0.1, 0.1);

    // Start camera at station 0 (fridge)
    const start = STATION_CAMERAS[0];
    const cam = new FreeCamera(
      'playerCamera',
      new Vector3(start.position[0], start.position[1], start.position[2]),
      scene,
    );
    cam.setTarget(new Vector3(start.lookAt[0], start.lookAt[1], start.lookAt[2]));
    cam.minZ = 0.1;

    cam.keysUp = [];
    cam.keysDown = [];
    cam.keysLeft = [];
    cam.keysRight = [];

    scene.activeCamera = cam;
    setCamera(cam);
  };

  // Auto-walk camera when currentChallenge changes
  useEffect(() => {
    if (!camera || gameStatus !== 'playing') return;

    const cam = camera as FreeCamera;
    const scene = cam.getScene();
    const target = STATION_CAMERAS[currentChallenge];
    if (!target) return;

    // Clean up any in-progress walk
    if (walkObserverRef.current) {
      scene.onBeforeRenderObservable.remove(walkObserverRef.current);
      walkObserverRef.current = null;
    }

    const startPos = cam.position.clone();
    const endPos = new Vector3(target.position[0], target.position[1], target.position[2]);
    const endTarget = new Vector3(target.lookAt[0], target.lookAt[1], target.lookAt[2]);
    const startTarget = cam.getTarget().clone();

    // Skip animation if already at position (e.g. first challenge on game start)
    if (Vector3.Distance(startPos, endPos) < 0.1) return;

    let t = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      t = Math.min(t + dt * 0.4, 1); // ~2.5 second walk
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out quadratic

      cam.position = Vector3.Lerp(startPos, endPos, ease);
      cam.setTarget(Vector3.Lerp(startTarget, endTarget, ease));

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        walkObserverRef.current = null;
      }
    });
    walkObserverRef.current = observer;
  }, [camera, currentChallenge, gameStatus]);

  // Cleanup walk on unmount
  useEffect(() => {
    return () => {
      if (walkObserverRef.current && camera) {
        const scene = (camera as FreeCamera).getScene();
        scene.onBeforeRenderObservable.remove(walkObserverRef.current);
      }
    };
  }, [camera]);

  return (
    <NativeEngine camera={camera as Camera}>
      <Scene onSceneReady={onSceneReady}>
        {camera && (
          <>
            <KitchenEnvironment />
            <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : showTasting ? 'talk' : 'idle'} />
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
            {showStuffer && (
              <StufferStation
                fillLevel={challengeProgress}
                pressureLevel={challengePressure}
                isPressing={challengeIsPressing}
                hasBurst={stufferBurst}
              />
            )}
            {showStove && (
              <StoveStation
                temperature={challengeTemperature}
                heatLevel={challengeHeatLevel}
                holdProgress={challengeProgress}
              />
            )}
          </>
        )}
      </Scene>
    </NativeEngine>
  );
};
