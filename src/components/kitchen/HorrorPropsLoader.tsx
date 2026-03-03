/**
 * @module HorrorPropsLoader
 * Data-driven loader for PSX horror scene dressing props.
 *
 * Reads horror-props.json config and loads each GLB via drei's useGLTF.
 * Props are split into two tiers:
 * - Tier 1 (centerpieces): rendered immediately
 * - Tier 2 (atmosphere): deferred 2s after mount to avoid blocking initial load
 *
 * Props with `modelOn` are PSX lamp variants that flicker by swapping between
 * the off (_off.glb) and on (_on.glb) mesh variants using a randomized timer.
 * This is cheaper than ECS flicker (no PointLight entity needed).
 *
 * All props are grouped under a single <group> for easy toggling.
 */

import {useGLTF} from '@react-three/drei';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import type {HorrorPropDef} from '../../config/types';
import {getAssetUrl} from '../../engine/assetUrl';

const TIER_2_DELAY_MS = 2000;

function resolveModelUrl(model: string): string {
  return getAssetUrl('models', model);
}

// ---------------------------------------------------------------------------
// PsxFlickerProp — swaps off/on GLB scenes on a randomized timer
// ---------------------------------------------------------------------------

function PsxFlickerProp({prop}: {prop: HorrorPropDef & {modelOn: string}}) {
  const offUrl = resolveModelUrl(prop.model);
  const onUrl = resolveModelUrl(prop.modelOn);

  const {scene: offScene} = useGLTF(offUrl);
  const {scene: onScene} = useGLTF(onUrl);

  const offClone = useMemo(() => offScene.clone(true), [offScene]);
  const onClone = useMemo(() => onScene.clone(true), [onScene]);

  const [isOn, setIsOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [intervalMin, intervalMax] = prop.flickerInterval ?? [1.5, 4.0];

  useEffect(() => {
    function scheduleNext() {
      const delay = (intervalMin + Math.random() * (intervalMax - intervalMin)) * 1000;
      timerRef.current = setTimeout(() => {
        setIsOn(prev => !prev);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [intervalMin, intervalMax]);

  return (
    <group
      name={prop.id}
      position={prop.position}
      rotation={[prop.rotation[0], prop.rotation[1], prop.rotation[2]]}
      scale={prop.scale}
    >
      <primitive object={isOn ? onClone : offClone} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// HorrorProp — static GLB prop with material fixes
// ---------------------------------------------------------------------------

/** Single horror prop — loads GLB and positions from config. */
function HorrorProp({prop}: {prop: HorrorPropDef}) {
  const url = resolveModelUrl(prop.model);
  const {scene} = useGLTF(url);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.material.side = THREE.FrontSide;
        if (child.material.isMeshStandardMaterial) {
          child.material.envMapIntensity = 0.05;
        }
      }
    });
  }, [cloned]);

  return (
    <group
      name={prop.id}
      position={prop.position}
      rotation={[prop.rotation[0], prop.rotation[1], prop.rotation[2]]}
      scale={prop.scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// HorrorPropsLoader — tiered prop mounting
// ---------------------------------------------------------------------------

/** Loads all horror props from config with tiered rendering. */
export function HorrorPropsLoader() {
  const [showTier2, setShowTier2] = useState(false);
  const allProps = config.scene.horrorProps.props;

  const tier1 = useMemo(() => allProps.filter(p => p.tier === 1), [allProps]);
  const tier2 = useMemo(() => allProps.filter(p => p.tier === 2), [allProps]);

  useEffect(() => {
    const timer = setTimeout(() => setShowTier2(true), TIER_2_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function renderProp(prop: HorrorPropDef) {
    if (prop.modelOn) {
      return <PsxFlickerProp key={prop.id} prop={prop as HorrorPropDef & {modelOn: string}} />;
    }
    return <HorrorProp key={prop.id} prop={prop} />;
  }

  return (
    <group>
      {tier1.map(renderProp)}
      {showTier2 && tier2.map(renderProp)}
    </group>
  );
}
