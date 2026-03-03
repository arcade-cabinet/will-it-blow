/**
 * @module HorrorPropsLoader
 * Data-driven loader for PSX horror scene dressing props.
 *
 * Reads horror-props.json config and loads each GLB via drei's useGLTF.
 * Props are split into two tiers:
 * - Tier 1 (centerpieces): rendered immediately
 * - Tier 2 (atmosphere): deferred 2s after mount to avoid blocking initial load
 *
 * All props are grouped under a single <group> for easy toggling.
 */

import {useGLTF} from '@react-three/drei';
import {useEffect, useMemo, useState} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import type {HorrorPropDef} from '../../config/types';
import {getAssetUrl} from '../../engine/assetUrl';

const TIER_2_DELAY_MS = 2000;

function resolveModelUrl(model: string): string {
  return getAssetUrl('models', model);
}

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
      position={prop.position}
      rotation={[prop.rotation[0], prop.rotation[1], prop.rotation[2]]}
      scale={prop.scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

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

  return (
    <group>
      {tier1.map(prop => (
        <HorrorProp key={prop.id} prop={prop} />
      ))}
      {showTier2 && tier2.map(prop => <HorrorProp key={prop.id} prop={prop} />)}
    </group>
  );
}
