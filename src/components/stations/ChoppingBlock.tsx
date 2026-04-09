/**
 * @module ChoppingBlock
 * The chopping station -- player chops ingredients on a blood-stained
 * stump via tap/swipe. Completing all chops in quick succession earns
 * a "Rapid Chop" flair point (design pillar #5: style points throughout).
 *
 * D.2: Emissive tuning -- ChopTargetRing pulse range normalized to
 * 0.3-0.8 (subtle interaction guide, not a beacon).
 *
 * E.4: Chop audio uses PRIMARY sfx_chop_1/sfx_chop_2 alternating,
 * with Tone.js synthesis as fallback.
 *
 * E.5: grime_base_opacity.jpg applied as alphaMap on the cutting surface
 * for additional depth and worn-blood texture.
 */
import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useRef, useState} from 'react';
import type * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {audioEngine} from '../../engine/AudioEngine';
import {asset} from '../../utils/assetPath';
import {requestHandGesture} from '../camera/handGestureStore';
import {alternatingSwing} from '../camera/handGestures';

/** Required chops to complete the chopping phase. */
const REQUIRED_CHOPS = 5;
/** If all chops land within this window (seconds), award Rapid Chop bonus. */
const RAPID_CHOP_WINDOW_MS = 3000;

export function ChoppingBlock() {
  const [colorMap, normalMap, roughnessMap, opacityMap] = useTexture([
    asset('/textures/grime_base_color.jpg'),
    asset('/textures/grime_base_normal.jpg'),
    asset('/textures/grime_base_roughness.jpg'),
    asset('/textures/grime_base_opacity.jpg'),
  ]);

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const recordFlairPoint = useGameStore(state => state.recordFlairPoint);
  const [chopCount, setChopCount] = useState(0);
  const firstChopTime = useRef<number | null>(null);

  const doChop = () => {
    if (gamePhase === 'CHOPPING') {
      // E.4: PRIMARY sfx_chop_1/sfx_chop_2 alternating, FALLBACK Tone.js
      audioEngine.playChop();
      setChopCount(c => {
        // Alternate the swinging hand so the chop feels less robotic.
        requestHandGesture(alternatingSwing(c));

        // Track timing for rapid-chop bonus.
        if (c === 0) {
          firstChopTime.current = Date.now();
        }

        const next = c + 1;
        if (next >= REQUIRED_CHOPS) {
          // Award flair: check if chops were rapid.
          const elapsed = Date.now() - (firstChopTime.current ?? Date.now());
          if (elapsed < RAPID_CHOP_WINDOW_MS) {
            recordFlairPoint('Rapid Chop', 5);
          } else {
            recordFlairPoint('Chopping Complete', 2);
          }
          setGamePhase('FILL_GRINDER');
        }
        return next;
      });
    }
  };

  // Allow clicking to chop for easy desktop testing
  const handleClick = () => {
    doChop();
  };

  // Allow swiping to chop for mobile/advanced interaction
  const bindDrag = useDrag(({swipe: [swipeX, swipeY]}) => {
    if (swipeX !== 0 || swipeY !== 0) {
      doChop();
    }
  });

  return (
    <group position={[1.5, 0.4, 0]}>
      {/* Stump/Base */}
      <RigidBody type="fixed" colliders="hull">
        <Cylinder args={[0.5, 0.6, 0.8, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#5C4033" // Dark wood
            roughness={0.9}
          />
        </Cylinder>
      </RigidBody>

      {/* Cutting Surface (Grimey/Bloody) — E.5: opacityMap adds depth */}
      <RigidBody type="fixed" colliders="hull">
        {/* @ts-ignore */}
        <Cylinder
          {...bindDrag()}
          onClick={handleClick}
          args={[0.5, 0.5, 0.05, 32]}
          position={[0, 0.4, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={roughnessMap}
            alphaMap={opacityMap}
            transparent
            color="#662222" // Blood stained
          />
        </Cylinder>
      </RigidBody>

      {/* Pulsing "chop here" target ring — visible only during CHOPPING phase */}
      {gamePhase === 'CHOPPING' && <ChopTargetRing />}

      {/* Chop progress: small meat chunks accumulate on the surface */}
      {chopCount > 0 && (
        <group position={[0, 0.45, 0]}>
          {Array.from({length: chopCount}, (_, i) => (
            <Box
              key={i}
              args={[0.08, 0.04, 0.08]}
              position={[
                Math.cos((i / REQUIRED_CHOPS) * Math.PI * 2) * 0.2,
                i * 0.02,
                Math.sin((i / REQUIRED_CHOPS) * Math.PI * 2) * 0.2,
              ]}
            >
              <meshStandardMaterial color="#822424" roughness={0.8} />
            </Box>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Pulsing emissive ring that guides the player to chop on the block surface.
 * D.2: Pulse range 0.3-0.8 — subtle interaction guide.
 */
function ChopTargetRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (!ringRef.current) return;
    const pulse = 0.55 + Math.sin(state.clock.elapsedTime * 4) * 0.25;
    (ringRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
  });
  return (
    <mesh ref={ringRef} position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.25, 0.35, 32]} />
      <meshStandardMaterial
        color="#ff2200"
        emissive="#ff2200"
        emissiveIntensity={0.3}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
