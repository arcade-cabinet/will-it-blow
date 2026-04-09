/**
 * @module DisgustIndicator
 * Diegetic disgust meter — a physical pressure gauge mounted on the wall
 * next to the Jigsaw Billy TV. The needle swings from green (safe) through
 * yellow (warning) to deep red (critical) as the hungerDisgustMeter climbs
 * toward the threshold.
 *
 * Visual escalation beats:
 * - 0-49%: needle in green zone, no pulsing
 * - 50-74%: needle enters yellow, gauge frame starts a slow red pulse
 * - 75-99%: needle in red, emissive intensity ramps, gauge vibrates
 * - 100%: full red, rapid pulse — game-over imminent
 *
 * Zero HTML. Fully diegetic geometry mounted inside the R3F scene.
 */
import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';

/** Gauge position: on the left wall above and to the right of the TV. */
const GAUGE_POS: [number, number, number] = [-2.85, 2.5, 0.8];

/** Total angular sweep of the needle from min (green) to max (red). */
const NEEDLE_ARC = Math.PI * 0.8; // ~144 degrees
/** Start angle (pointing left = green). */
const NEEDLE_START = Math.PI * 0.4;

/**
 * Map a 0-1 ratio to a color on the green->yellow->red gradient.
 */
function disgustColor(ratio: number): THREE.Color {
  if (ratio < 0.5) {
    // Green to yellow
    const t = ratio / 0.5;
    return new THREE.Color().lerpColors(new THREE.Color('#22cc44'), new THREE.Color('#cccc22'), t);
  }
  // Yellow to deep red
  const t = (ratio - 0.5) / 0.5;
  return new THREE.Color().lerpColors(new THREE.Color('#cccc22'), new THREE.Color('#cc1111'), t);
}

export function DisgustIndicator() {
  const disgustMeter = useGameStore(s => s.hungerDisgustMeter);
  const disgustThreshold = useGameStore(s => s.hungerDisgustThreshold);
  const posture = useGameStore(s => s.posture);

  const needleRef = useRef<THREE.Group>(null);
  const needleMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const arcMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Arc geometry for the colored background sweep
  const arcGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const segments = 32;
    const innerR = 0.12;
    const outerR = 0.18;
    // Outer arc
    for (let i = 0; i <= segments; i++) {
      const angle = NEEDLE_START - (i / segments) * NEEDLE_ARC;
      shape.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    // Inner arc (reverse)
    for (let i = segments; i >= 0; i--) {
      const angle = NEEDLE_START - (i / segments) * NEEDLE_ARC;
      shape.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame(state => {
    // Only visible when standing (player is playing)
    if (groupRef.current) {
      groupRef.current.visible = posture === 'standing';
    }
    if (posture !== 'standing') return;

    const ratio = Math.min(1, disgustMeter / Math.max(1, disgustThreshold));
    const t = state.clock.elapsedTime;

    // Needle rotation
    if (needleRef.current) {
      const targetAngle = NEEDLE_START - ratio * NEEDLE_ARC;
      // Smooth toward target
      const current = needleRef.current.rotation.z;
      needleRef.current.rotation.z += (targetAngle - current) * 0.08;

      // Vibrate when critical (>75%)
      if (ratio > 0.75) {
        const vibration = Math.sin(t * 25) * 0.015 * (ratio - 0.75) * 4;
        needleRef.current.rotation.z += vibration;
      }
    }

    // Needle color
    if (needleMatRef.current) {
      const color = disgustColor(ratio);
      needleMatRef.current.color.copy(color);
      needleMatRef.current.emissive.copy(color);
      // Pulsing emissive above 50%
      if (ratio >= 0.5) {
        const pulseSpeed = 2 + ratio * 6;
        const pulseDepth = 0.3 + ratio * 0.7;
        needleMatRef.current.emissiveIntensity =
          0.3 + (Math.sin(t * pulseSpeed) * 0.5 + 0.5) * pulseDepth;
      } else {
        needleMatRef.current.emissiveIntensity = 0.1;
      }
    }

    // Arc background color
    if (arcMatRef.current) {
      const color = disgustColor(ratio);
      arcMatRef.current.color.copy(color);
      arcMatRef.current.emissive.copy(color);
      arcMatRef.current.emissiveIntensity = ratio > 0.5 ? 0.15 : 0.05;
    }

    // Frame glow when critical
    if (frameMatRef.current) {
      if (ratio >= 0.75) {
        const pulse = (Math.sin(t * 4) * 0.5 + 0.5) * ratio;
        frameMatRef.current.emissive.setRGB(pulse * 0.8, 0, 0);
        frameMatRef.current.emissiveIntensity = 0.5;
      } else {
        frameMatRef.current.emissive.setRGB(0, 0, 0);
        frameMatRef.current.emissiveIntensity = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={GAUGE_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* Circular frame (dark metal ring) */}
      <mesh>
        <ringGeometry args={[0.19, 0.22, 32]} />
        <meshStandardMaterial ref={frameMatRef} color="#333" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Background plate */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.19, 32]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* Colored arc sweep */}
      <mesh position={[0, 0, 0.001]}>
        <primitive object={arcGeo} attach="geometry" />
        <meshStandardMaterial
          ref={arcMatRef}
          color="#22cc44"
          emissive="#22cc44"
          emissiveIntensity={0.05}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Needle */}
      <group ref={needleRef} rotation={[0, 0, NEEDLE_START]}>
        <mesh position={[0.08, 0, 0.002]}>
          <boxGeometry args={[0.16, 0.012, 0.005]} />
          <meshStandardMaterial
            ref={needleMatRef}
            color="#cc1111"
            emissive="#cc1111"
            emissiveIntensity={0.1}
            toneMapped={false}
          />
        </mesh>
        {/* Needle pivot cap */}
        <mesh position={[0, 0, 0.003]}>
          <circleGeometry args={[0.015, 16]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Label: "DISGUST" in small text below the gauge */}
      <mesh position={[0, -0.25, 0.001]}>
        <planeGeometry args={[0.2, 0.04]} />
        <meshStandardMaterial
          color="#FF1744"
          emissive="#FF1744"
          emissiveIntensity={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
