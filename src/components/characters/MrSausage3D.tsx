import {useFrame, useThree} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {REACTIONS, type Reaction} from './reactions';

interface MrSausage3DProps {
  reaction?: Reaction;
  position?: [number, number, number];
  scale?: number;
  /** Y-axis rotation in radians (e.g. Math.PI to face opposite direction) */
  rotationY?: number;
  /** When true, root subtly rotates to face the active camera */
  trackCamera?: boolean;
}

/**
 * Mr. Sausage -- the iconic head with full facial rigging (R3F version).
 *
 * Hotdog-bun colored head, aviator shades above a lush handlebar mustache,
 * and a white chef toque on top.
 *
 * Rigging controls:
 * - Eyes: peek above sunglasses, with movable pupils and blink lids
 * - Mouth: below mustache, opens/closes with shape
 * - Cheeks: color-shifting blush pads (subtle pink -> deep angry red)
 * - Camera tracking: head slowly follows the player's camera
 */
export const MrSausage3D = ({
  reaction = 'idle',
  position = [0, 0, 0],
  scale = 1,
  rotationY = 0,
  trackCamera = false,
}: MrSausage3DProps) => {
  // --- Refs for animated parts ---
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  // Eyes
  const eyeLRef = useRef<THREE.Group>(null);
  const eyeRRef = useRef<THREE.Group>(null);
  const irisLRef = useRef<THREE.Mesh>(null);
  const irisRRef = useRef<THREE.Mesh>(null);
  const pupilLRef = useRef<THREE.Mesh>(null);
  const pupilRRef = useRef<THREE.Mesh>(null);
  const lidLRef = useRef<THREE.Mesh>(null);
  const lidRRef = useRef<THREE.Mesh>(null);

  // Mouth
  const mouthRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);

  // Cheeks — shared material so both update together
  const cheekMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.92, 0.62, 0.35),
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  // Mustache
  const stacheCenterRef = useRef<THREE.Mesh>(null);
  const curlLRef = useRef<THREE.Mesh>(null);
  const curlRRef = useRef<THREE.Mesh>(null);

  // --- Animation state (persisted across frames via refs) ---
  const reactionRef = useRef<Reaction>(reaction);
  reactionRef.current = reaction;

  const animState = useRef({
    time: 0,
    reactionElapsed: 0,
    prevReaction: reaction as Reaction,
    nextBlink: 2 + Math.random() * 3,
    blinkPhase: 0,
    trackYaw: 0,
    trackPitch: 0,
  });

  const {camera} = useThree();

  // Precompute torus geometries for mustache curls
  const torusGeo = useMemo(() => new THREE.TorusGeometry(0.425, 0.11, 12, 20), []);

  // --- Animation loop ---
  useFrame((_state, delta) => {
    const s = animState.current;
    const dt = Math.min(delta, 0.1); // cap delta to avoid jumps
    s.time += dt;

    const root = rootRef.current;
    const head = headRef.current;
    if (!root || !head) return;

    // Reset animated properties to defaults before applying reaction-specific values
    head.scale.y = 1.05;
    root.position.x = position[0];

    const currentReaction = reactionRef.current;
    const reactionDef = REACTIONS[currentReaction];

    // Detect reaction change
    if (currentReaction !== s.prevReaction) {
      s.prevReaction = currentReaction;
      s.reactionElapsed = 0;
    }
    s.reactionElapsed += dt * 1000;

    const active = reactionDef.loop || s.reactionElapsed <= reactionDef.duration;

    // ---- Camera tracking ----
    if (trackCamera && camera) {
      const rootWorldPos = new THREE.Vector3();
      root.getWorldPosition(rootWorldPos);
      const dir = camera.position.clone().sub(rootWorldPos);

      const targetYaw = Math.atan2(dir.x, dir.z) - rotationY;
      const dist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      const targetPitch = -Math.atan2(dir.y, dist) * 0.3;

      const maxYaw = 0.4;
      const maxPitch = 0.2;
      const clampedYaw = Math.max(-maxYaw, Math.min(maxYaw, targetYaw));
      const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

      s.trackYaw += (clampedYaw - s.trackYaw) * Math.min(3.0 * dt, 1.0);
      s.trackPitch += (clampedPitch - s.trackPitch) * Math.min(3.0 * dt, 1.0);
    }

    // ---- Natural blink ----
    s.nextBlink -= dt;
    if (s.nextBlink <= 0 && s.blinkPhase === 0) {
      s.blinkPhase = 1;
      s.nextBlink = 2.5 + Math.random() * 4;
    }
    if (s.blinkPhase > 0) {
      s.blinkPhase += dt * 12;
      if (s.blinkPhase >= 2) s.blinkPhase = 0;
    }
    const naturalBlink =
      s.blinkPhase > 0 ? (s.blinkPhase < 1 ? s.blinkPhase : 2 - s.blinkPhase) : 0;

    // ---- Default state (reset each frame) ----
    let lidCloseL = naturalBlink;
    let lidCloseR = naturalBlink;
    let pupilX = 0;
    let pupilY = 0;
    let pupilSize = 1.0;
    let mouthOpen = 0;
    let cheekBlush = 0;

    const baseY = position[1];
    const time = s.time;

    // ---- Per-reaction animation ----
    switch (currentReaction) {
      case 'idle': {
        root.position.y = baseY + Math.sin(time * 1.8) * 0.15;
        root.rotation.y = rotationY + s.trackYaw + Math.sin(time * 0.6) * 0.06;
        root.rotation.x = s.trackPitch;
        root.rotation.z = Math.sin(time * 1.2) * 0.03;
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 3) * 0.04;
        if (curlLRef.current) curlLRef.current.rotation.z = Math.sin(time * 3) * 0.05;
        if (curlRRef.current) curlRRef.current.rotation.z = -Math.sin(time * 3) * 0.05;
        pupilX = Math.sin(time * 0.4) * 0.02;
        pupilY = Math.sin(time * 0.3) * 0.01;
        break;
      }
      case 'flinch': {
        if (active) {
          root.rotation.z = -0.15;
          root.rotation.x = -0.1 + s.trackPitch;
          root.position.y = baseY + 0.2;
          root.rotation.y = rotationY + s.trackYaw;
          pupilSize = 0.5;
          mouthOpen = 0.8;
          cheekBlush = 0.1;
        } else {
          const decay = 1 - Math.exp(-10 * dt);
          root.rotation.z += (0 - root.rotation.z) * decay;
          root.rotation.x += (s.trackPitch - root.rotation.x) * decay;
          root.position.y = baseY;
          root.rotation.y = rotationY + s.trackYaw;
          mouthOpen = Math.max(0, mouthOpen - dt * 3);
        }
        break;
      }
      case 'laugh': {
        root.position.x = position[0] + Math.sin(time * 22) * 0.12;
        root.position.y = baseY + Math.abs(Math.sin(time * 7)) * 0.3;
        root.rotation.z = Math.sin(time * 18) * 0.06;
        root.rotation.y = rotationY + s.trackYaw;
        root.rotation.x = s.trackPitch;
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 5) * 0.08;
        lidCloseL = 0.8;
        lidCloseR = 0.8;
        mouthOpen = 0.6 + Math.sin(time * 12) * 0.3;
        cheekBlush = 0.3;
        break;
      }
      case 'disgust': {
        if (active) {
          root.rotation.z = 0.12;
          root.rotation.x = -0.2 + s.trackPitch;
          root.rotation.y = rotationY + s.trackYaw;
          lidCloseL = 0.6;
          lidCloseR = 0.15;
          mouthOpen = 0.3;
          cheekBlush = 0.85;
          pupilSize = 0.7;
          pupilX = 0.04;
        } else {
          const decay = 1 - Math.exp(-10 * dt);
          root.rotation.z += (0 - root.rotation.z) * decay;
          root.rotation.x += (s.trackPitch - root.rotation.x) * decay;
          root.rotation.y = rotationY + s.trackYaw;
        }
        root.position.y = baseY;
        break;
      }
      case 'excitement': {
        root.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.5;
        const pulse = 1 + Math.sin(time * 8) * 0.04;
        head.scale.y = 1.05 * pulse;
        root.rotation.z = Math.sin(time * 10) * 0.05;
        root.rotation.y = rotationY + s.trackYaw;
        root.rotation.x = s.trackPitch;
        pupilSize = 1.5;
        mouthOpen = 0.5 + Math.sin(time * 4) * 0.2;
        cheekBlush = 0.2;
        break;
      }
      case 'nervous': {
        root.position.x = position[0] + Math.sin(time * 14) * 0.04;
        root.position.y = baseY + Math.sin(time * 2) * 0.06;
        root.rotation.z = Math.sin(time * 3) * 0.04;
        root.rotation.y = rotationY + s.trackYaw;
        root.rotation.x = s.trackPitch;
        pupilX = Math.sin(time * 8) * 0.07;
        pupilY = Math.sin(time * 5) * 0.02;
        mouthOpen = 0.05 + Math.sin(time * 6) * 0.05;
        cheekBlush = 0.15;
        pupilSize = 0.8;
        break;
      }
      case 'nod': {
        const nodPhase = (s.reactionElapsed / 300) * Math.PI;
        root.rotation.x = Math.abs(Math.sin(nodPhase)) * 0.25 + s.trackPitch;
        root.rotation.y = rotationY + s.trackYaw;
        root.position.y = baseY;
        const nodClose = Math.abs(Math.sin(nodPhase)) * 0.4;
        lidCloseL = Math.max(naturalBlink, nodClose);
        lidCloseR = Math.max(naturalBlink, nodClose);
        break;
      }
      case 'talk': {
        root.position.y = baseY + Math.sin(time * 2) * 0.05;
        const talkPulse = 1 + Math.sin(time * 10) * 0.015;
        head.scale.y = 1.05 * talkPulse;
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 7) * 0.03;
        root.rotation.y = rotationY + s.trackYaw;
        root.rotation.x = s.trackPitch;
        mouthOpen = 0.15 + Math.abs(Math.sin(time * 8)) * 0.35;
        if (stacheCenterRef.current) stacheCenterRef.current.position.y = -0.35 - mouthOpen * 0.08;
        break;
      }
    }

    // ---- Apply facial rig values ----

    // Lids
    if (lidLRef.current) lidLRef.current.scale.y = Math.max(0, Math.min(1, lidCloseL)) * 0.5;
    if (lidRRef.current) lidRRef.current.scale.y = Math.max(0, Math.min(1, lidCloseR)) * 0.5;

    // Pupil look direction
    const clampX = Math.max(-0.08, Math.min(0.08, pupilX));
    const clampY = Math.max(-0.06, Math.min(0.06, pupilY));
    if (irisLRef.current) {
      irisLRef.current.position.x = clampX;
      irisLRef.current.position.y = clampY;
    }
    if (pupilLRef.current) {
      pupilLRef.current.position.x = clampX;
      pupilLRef.current.position.y = clampY;
    }
    if (irisRRef.current) {
      irisRRef.current.position.x = clampX;
      irisRRef.current.position.y = clampY;
    }
    if (pupilRRef.current) {
      pupilRRef.current.position.x = clampX;
      pupilRRef.current.position.y = clampY;
    }

    // Pupil size
    if (pupilLRef.current) {
      pupilLRef.current.scale.x = pupilSize;
      pupilLRef.current.scale.y = pupilSize;
    }
    if (pupilRRef.current) {
      pupilRRef.current.scale.x = pupilSize;
      pupilRRef.current.scale.y = pupilSize;
    }

    // Mouth openness
    const clampedMouth = Math.max(0, Math.min(1, mouthOpen));
    if (mouthRef.current) mouthRef.current.scale.y = clampedMouth * 0.6;
    if (lowerLipRef.current) lowerLipRef.current.position.y = -0.88 - clampedMouth * 0.25;

    // Cheek blush (shared material — both cheeks update)
    {
      const clampedBlush = Math.max(0, Math.min(1, cheekBlush));
      const r = 0.92 + (0.85 - 0.92) * clampedBlush;
      const g = 0.62 + (0.15 - 0.62) * clampedBlush;
      const b = 0.35 + (0.1 - 0.35) * clampedBlush;
      cheekMat.color.setRGB(r, g, b);
      cheekMat.opacity = 0.6 + clampedBlush * 0.4;
    }
  });

  // --- Mustard zigzag positions (static, computed once) ---
  const mustardPositions = useMemo(() => {
    const count = 10;
    const positions: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const y = 0.6 + t * 1.0;
      positions.push([Math.sin(t * Math.PI * 3) * 0.2, y, -1.55 + t * 0.3]);
    }
    return positions;
  }, []);

  // --- Pleat positions (static, computed once) ---
  const pleatPositions = useMemo(() => {
    const count = 8;
    const positions: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push([Math.cos(angle) * 1.05, 2.2, Math.sin(angle) * 1.05]);
    }
    return positions;
  }, []);

  return (
    <group
      ref={rootRef}
      position={position}
      scale={[scale, scale, scale]}
      rotation={[0, rotationY, 0]}
    >
      {/* ========== HEAD ========== */}
      <mesh ref={headRef} scale={[1.0, 1.05, 0.95]}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial color={[0.92, 0.62, 0.35]} />
      </mesh>

      {/* ========== LEFT EYE GROUP ========== */}
      <group ref={eyeLRef} position={[-0.55, 0.72, -1.35]}>
        {/* Sclera */}
        <mesh scale={[1.0, 0.85, 0.4]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshBasicMaterial color={[0.95, 0.95, 0.92]} />
        </mesh>
        {/* Iris */}
        <mesh ref={irisLRef} position={[0, 0, -0.12]} scale={[1.0, 1.0, 0.3]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color={[0.25, 0.55, 0.3]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={pupilLRef} position={[0, 0, -0.15]} scale={[1.0, 1.0, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={[0.02, 0.02, 0.02]} />
        </mesh>
        {/* Eyelid */}
        <mesh ref={lidLRef} position={[0, 0.12, -0.02]} scale={[1.05, 0.0, 0.45]}>
          <sphereGeometry args={[0.27, 10, 10]} />
          <meshBasicMaterial color={[0.85, 0.55, 0.3]} />
        </mesh>
      </group>

      {/* ========== RIGHT EYE GROUP ========== */}
      <group ref={eyeRRef} position={[0.55, 0.72, -1.35]}>
        {/* Sclera */}
        <mesh scale={[1.0, 0.85, 0.4]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshBasicMaterial color={[0.95, 0.95, 0.92]} />
        </mesh>
        {/* Iris */}
        <mesh ref={irisRRef} position={[0, 0, -0.12]} scale={[1.0, 1.0, 0.3]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color={[0.25, 0.55, 0.3]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={pupilRRef} position={[0, 0, -0.15]} scale={[1.0, 1.0, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={[0.02, 0.02, 0.02]} />
        </mesh>
        {/* Eyelid */}
        <mesh ref={lidRRef} position={[0, 0.12, -0.02]} scale={[1.05, 0.0, 0.45]}>
          <sphereGeometry args={[0.27, 10, 10]} />
          <meshBasicMaterial color={[0.85, 0.55, 0.3]} />
        </mesh>
      </group>

      {/* ========== SUNGLASSES ========== */}
      {/* Left lens */}
      <mesh position={[-0.6, 0.25, -1.45]} scale={[0.95, 0.75, 0.35]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={[0.06, 0.06, 0.12]} />
      </mesh>
      {/* Right lens */}
      <mesh position={[0.6, 0.25, -1.45]} scale={[0.95, 0.75, 0.35]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={[0.06, 0.06, 0.12]} />
      </mesh>
      {/* Bridge */}
      <mesh position={[0, 0.3, -1.55]}>
        <boxGeometry args={[0.5, 0.12, 0.12]} />
        <meshBasicMaterial color={[0.15, 0.15, 0.18]} />
      </mesh>
      {/* Top bar */}
      <mesh position={[0, 0.62, -1.52]}>
        <boxGeometry args={[2.1, 0.15, 0.12]} />
        <meshBasicMaterial color={[0.15, 0.15, 0.18]} />
      </mesh>
      {/* Left temple */}
      <mesh position={[-1.0, 0.55, -1.0]}>
        <boxGeometry args={[0.1, 0.1, 1.0]} />
        <meshBasicMaterial color={[0.15, 0.15, 0.18]} />
      </mesh>
      {/* Right temple */}
      <mesh position={[1.0, 0.55, -1.0]}>
        <boxGeometry args={[0.1, 0.1, 1.0]} />
        <meshBasicMaterial color={[0.15, 0.15, 0.18]} />
      </mesh>

      {/* ========== MOUTH ========== */}
      {/* Mouth opening (dark interior) */}
      <mesh ref={mouthRef} position={[0, -0.85, -1.4]} scale={[1.2, 0.0, 0.35]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color={[0.15, 0.04, 0.02]} />
      </mesh>
      {/* Upper lip */}
      <mesh position={[0, -0.7, -1.48]}>
        <boxGeometry args={[0.8, 0.06, 0.15]} />
        <meshBasicMaterial color={[0.75, 0.35, 0.25]} />
      </mesh>
      {/* Lower lip */}
      <mesh ref={lowerLipRef} position={[0, -0.88, -1.42]}>
        <boxGeometry args={[0.65, 0.06, 0.12]} />
        <meshBasicMaterial color={[0.75, 0.35, 0.25]} />
      </mesh>

      {/* ========== CHEEKS ========== */}
      <mesh position={[-1.1, -0.1, -1.2]} scale={[0.5, 0.4, 0.2]} material={cheekMat}>
        <sphereGeometry args={[0.4, 10, 10]} />
      </mesh>
      <mesh position={[1.1, -0.1, -1.2]} scale={[0.5, 0.4, 0.2]} material={cheekMat}>
        <sphereGeometry args={[0.4, 10, 10]} />
      </mesh>

      {/* ========== MUSTACHE ========== */}
      {/* Center block */}
      <mesh ref={stacheCenterRef} position={[0, -0.35, -1.5]}>
        <boxGeometry args={[1.4, 0.35, 0.3]} />
        <meshBasicMaterial color={[0.35, 0.18, 0.06]} />
      </mesh>
      {/* Left curl (torus) */}
      <mesh
        ref={curlLRef}
        position={[-1.05, -0.38, -1.4]}
        rotation={[-0.15, Math.PI / 2, 0]}
        scale={[1.0, 1.0, 0.5]}
        geometry={torusGeo}
      >
        <meshBasicMaterial color={[0.35, 0.18, 0.06]} />
      </mesh>
      {/* Left curl tip */}
      <mesh position={[-1.55, -0.2, -1.35]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshBasicMaterial color={[0.35, 0.18, 0.06]} />
      </mesh>
      {/* Right curl (torus) */}
      <mesh
        ref={curlRRef}
        position={[1.05, -0.38, -1.4]}
        rotation={[-0.15, -Math.PI / 2, 0]}
        scale={[1.0, 1.0, 0.5]}
        geometry={torusGeo}
      >
        <meshBasicMaterial color={[0.35, 0.18, 0.06]} />
      </mesh>
      {/* Right curl tip */}
      <mesh position={[1.55, -0.2, -1.35]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshBasicMaterial color={[0.35, 0.18, 0.06]} />
      </mesh>

      {/* ========== CHEF HAT (TOQUE) ========== */}
      {/* Brim */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.3, 28]} />
        <meshBasicMaterial color={[0.88, 0.88, 0.85]} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.9, 1.15, 1.3, 24]} />
        <meshBasicMaterial color={[0.95, 0.95, 0.95]} />
      </mesh>
      {/* Pleats */}
      {pleatPositions.map((pos, i) => (
        <mesh key={`pleat_${i}`} position={pos}>
          <boxGeometry args={[0.06, 1.2, 0.06]} />
          <meshBasicMaterial color={[0.88, 0.88, 0.85]} />
        </mesh>
      ))}
      {/* Puff top */}
      <mesh position={[0, 2.95, 0]} scale={[1.0, 0.6, 1.0]}>
        <sphereGeometry args={[1.1, 18, 18]} />
        <meshBasicMaterial color={[0.95, 0.95, 0.95]} />
      </mesh>
      {/* Secondary puff */}
      <mesh position={[0.3, 3.1, -0.2]} scale={[1.0, 0.5, 0.8]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color={[0.95, 0.95, 0.95]} />
      </mesh>

      {/* ========== MUSTARD ZIGZAG ========== */}
      {mustardPositions.map((pos, i) => (
        <mesh key={`mustard_${i}`} position={pos}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={[1.0, 0.82, 0.05]} />
        </mesh>
      ))}
    </group>
  );
};
