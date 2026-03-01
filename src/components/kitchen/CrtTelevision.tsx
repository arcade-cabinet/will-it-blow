import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {MrSausage3D} from '../characters/MrSausage3D';
import type {Reaction} from '../characters/reactions';
import {createCrtMaterial, crtUniforms} from '../effects/CrtShader';

/** Map reactions to CRT signal distortion intensity (0 = calm, 1 = max chaos) */
const REACTION_INTENSITY: Record<Reaction, number> = {
  idle: 0.0,
  flinch: 0.6,
  laugh: 0.9,
  disgust: 0.5,
  excitement: 0.8,
  nervous: 0.3,
  nod: 0.2,
  talk: 0.4,
};

/**
 * TV geometry constants.
 * Housing is the outer plastic shell; screen is the CRT glass inset.
 * The glass bezel sits between them, giving the classic recessed-screen look.
 */
const TV = {
  housing: {width: 3.2, height: 2.6, depth: 1.6},
  screen: {width: 2.2, height: 1.6},
  /** How far forward the screen glass sits from the housing center.
   *  Must be AHEAD of the inner bezel recess front face (bezelZ - 0.04 + 0.04 = bezelZ)
   *  so the CRT shader plane isn't occluded by the dark bezel box. */
  screenZ: 0.835,
  /** Glass bezel dimensions -- slightly larger than screen, slightly proud of housing */
  bezel: {width: 2.5, height: 1.85, depth: 0.12},
  bezelZ: 0.82,
  /** Mr. Sausage scale -- small enough to fit within the screen with headroom */
  sausageScale: 0.22,
  /** Mr. Sausage vertical offset from TV center (nudge down slightly so head is centered) */
  sausageYOffset: -0.15,
};

interface CrtTelevisionProps {
  reaction?: Reaction;
  position: [number, number, number];
}

export const CrtTelevision = ({reaction = 'idle', position}: CrtTelevisionProps) => {
  // --- Refs for animated materials ---
  const housingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glassMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ledMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Reaction smoothing state (persisted across frames)
  const animState = useRef({
    time: 0,
    currentReactionIntensity: 0,
  });

  // Keep reaction ref updated for use in useFrame without re-creating materials
  const reactionRef = useRef<Reaction>(reaction);
  reactionRef.current = reaction;

  // --- CRT shader material (created once) ---
  const crtMaterial = useMemo(() => createCrtMaterial('tvCrt'), []);

  // --- Frame geometry helpers ---
  const frameThickness = 0.12;
  const fw = TV.bezel.width / 2 + frameThickness / 2;
  const fh = TV.bezel.height / 2 + frameThickness / 2;

  // --- Grille slot Y positions (relative to TV center) ---
  const grilleSlots = useMemo(() => {
    const slots: number[] = [];
    for (let i = 0; i < 4; i++) {
      slots.push(-TV.housing.height / 2 + 0.25 + i * 0.08);
    }
    return slots;
  }, []);

  // --- Animation loop ---
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = animState.current;
    s.time += dt;

    // Update CRT time uniform
    crtUniforms.time.value = s.time;

    // Smooth reaction intensity
    const targetIntensity = REACTION_INTENSITY[reactionRef.current] ?? 0;
    const lerpSpeed = targetIntensity > s.currentReactionIntensity ? 8.0 : 3.0;
    s.currentReactionIntensity +=
      (targetIntensity - s.currentReactionIntensity) * Math.min(lerpSpeed * dt, 1.0);
    crtUniforms.reactionIntensity.value = s.currentReactionIntensity;

    // Blink power LED
    const ledBrightness = 0.5 + 0.5 * Math.sin(s.time * 3);
    if (ledMatRef.current) {
      ledMatRef.current.color.setRGB(ledBrightness, 0.0, 0.0);
    }

    // CRT screen light bleed onto housing
    const glowPulse = 0.02 + s.currentReactionIntensity * 0.04;
    const flicker = 1.0 + Math.sin(s.time * 4) * 0.3 * (1.0 + s.currentReactionIntensity);
    const g = glowPulse * flicker;
    if (housingMatRef.current) {
      housingMatRef.current.emissive.setRGB(g * 0.6, g, g * 0.7);
    }

    // Glass reflection pulse
    const glassGlow = 0.01 + s.currentReactionIntensity * 0.03;
    if (glassMatRef.current) {
      glassMatRef.current.color.setRGB(
        0.03 + glassGlow * 0.5,
        0.04 + glassGlow,
        0.03 + glassGlow * 0.7,
      );
    }
  });

  return (
    <group position={position}>
      {/* ========== TV Housing (outer plastic shell) ========== */}
      <mesh>
        <boxGeometry args={[TV.housing.width, TV.housing.height, TV.housing.depth]} />
        <meshStandardMaterial
          ref={housingMatRef}
          color={[0.13, 0.1, 0.08]}
          roughness={0.8}
          metalness={0.05}
          emissive={[0.02, 0.04, 0.025]}
        />
      </mesh>

      {/* ========== Inner bezel recess ========== */}
      <mesh position={[0, 0, TV.bezelZ - 0.04]}>
        <boxGeometry args={[TV.bezel.width + 0.15, TV.bezel.height + 0.15, 0.08]} />
        <meshStandardMaterial color={[0.05, 0.04, 0.03]} roughness={0.95} />
      </mesh>

      {/* ========== CRT Screen (shader plane behind glass) ========== */}
      <mesh position={[0, 0, TV.screenZ]} material={crtMaterial}>
        <planeGeometry args={[TV.screen.width, TV.screen.height]} />
      </mesh>

      {/* ========== Glass bezel (semi-transparent CRT glass surface) ========== */}
      <mesh position={[0, 0, TV.bezelZ + 0.02]}>
        <planeGeometry args={[TV.bezel.width, TV.bezel.height]} />
        <meshBasicMaterial
          ref={glassMatRef}
          color={[0.03, 0.04, 0.03]}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* ========== Frame borders (4 bars around the glass) ========== */}
      {/* Top */}
      <mesh position={[0, fh, TV.bezelZ]}>
        <boxGeometry args={[TV.bezel.width + frameThickness * 2, frameThickness, TV.bezel.depth]} />
        <meshStandardMaterial color={[0.08, 0.07, 0.06]} roughness={0.9} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -fh, TV.bezelZ]}>
        <boxGeometry args={[TV.bezel.width + frameThickness * 2, frameThickness, TV.bezel.depth]} />
        <meshStandardMaterial color={[0.08, 0.07, 0.06]} roughness={0.9} />
      </mesh>
      {/* Left */}
      <mesh position={[-fw, 0, TV.bezelZ]}>
        <boxGeometry args={[frameThickness, TV.bezel.height, TV.bezel.depth]} />
        <meshStandardMaterial color={[0.08, 0.07, 0.06]} roughness={0.9} />
      </mesh>
      {/* Right */}
      <mesh position={[fw, 0, TV.bezelZ]}>
        <boxGeometry args={[frameThickness, TV.bezel.height, TV.bezel.depth]} />
        <meshStandardMaterial color={[0.08, 0.07, 0.06]} roughness={0.9} />
      </mesh>

      {/* ========== Control knobs (right side) ========== */}
      <mesh position={[TV.housing.width / 2 - 0.2, 0.3, TV.bezelZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.15, 12]} />
        <meshStandardMaterial color={[0.2, 0.18, 0.15]} roughness={0.7} />
      </mesh>
      <mesh
        position={[TV.housing.width / 2 - 0.2, -0.15, TV.bezelZ]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.11, 0.11, 0.15, 12]} />
        <meshStandardMaterial color={[0.2, 0.18, 0.15]} roughness={0.7} />
      </mesh>

      {/* ========== Speaker grille (horizontal slots below screen) ========== */}
      {grilleSlots.map((yPos, i) => (
        <mesh key={`grille_${i}`} position={[-0.4, yPos, TV.bezelZ]}>
          <boxGeometry args={[1.0, 0.03, 0.06]} />
          <meshStandardMaterial color={[0.06, 0.05, 0.04]} roughness={0.95} />
        </mesh>
      ))}

      {/* ========== Wall bracket ========== */}
      <mesh position={[0, -1.4, -0.3]}>
        <boxGeometry args={[1.2, 0.15, 0.6]} />
        <meshStandardMaterial color={[0.1, 0.1, 0.1]} roughness={0.9} />
      </mesh>

      {/* ========== Antennas (rabbit ears) ========== */}
      <mesh position={[-0.5, 1.8, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshStandardMaterial color={[0.6, 0.6, 0.6]} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, 1.8, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshStandardMaterial color={[0.6, 0.6, 0.6]} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* ========== Power LED ========== */}
      <mesh position={[TV.housing.width / 2 - 0.2, -0.5, TV.bezelZ]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial ref={ledMatRef} color={[1.0, 0.0, 0.0]} />
      </mesh>

      {/* ========== Mr. Sausage inside TV ========== */}
      {/*
       * MrSausage3D faces -Z by default. Rotate PI around Y so he faces the viewer (+Z).
       * Centered on the screen, scaled to fit within the glass bezel with headroom.
       * Camera tracking enabled so Mr. Sausage creepily follows the player around.
       */}
      <MrSausage3D
        reaction={reaction}
        position={[0, TV.sausageYOffset, TV.screenZ + 0.05]}
        scale={TV.sausageScale}
        rotationY={Math.PI}
        trackCamera
      />
    </group>
  );
};
