/**
 * @module CookingMechanics
 * R3F component for the cooking station — stove, burners, dials, draggable
 * frying pan, animated grease pool, and steam particles.
 *
 * Ported from POC sausage_factory.html (cooking station section, lines 204-250
 * and cooking logic lines 513-586).
 *
 * **State machine (phase):**
 *   - 'place'   : pan starts on back-right burner; drag it to front-left
 *   - 'dial'    : pan is on front-left burner; click the front-left dial to ignite
 *   - 'cooking' : heat is on; cookLevel advances each frame; grease + steam animate
 *   - 'done'    : cookLevel >= 1.0; onCookComplete is called once
 *
 * **Interactions (from POC L396-407):**
 *   - Pan draggable across stove top via pointer events + raycaster plane intersection
 *   - Snaps to front-left burner when distance < 1.0
 *   - Front-left dial click starts cooking; burner changes to orange/red glow
 *
 * **Cooking loop (useFrame, from POC L514-530):**
 *   - cookLevel += delta * 0.06
 *   - updateCookingAppearance() on meat material
 *   - updateGrease() on grease material
 *   - Sausage group scale: (1 - cookLevel*0.15, 1, 1 - cookLevel*0.15)
 *   - Steam particles: spawn from sausage center, rise with noise
 *
 * **Geometry (from POC L207-250, raw POC scale):**
 *   - Stove base:        BoxGeometry(12,1,11)          color #111111
 *   - Stove back:        BoxGeometry(12,3,1)           same material
 *   - Burner (back-right):  TorusGeometry(1.5,0.15,8,32)  dark metal
 *   - Burner (front-left):  same torus, lights up when cooking
 *   - Dials:             CylinderGeometry(0.4,0.4,0.3) rotated to face forward
 *   - Pan body:          LatheGeometry with exact POC profile
 *   - Pan handle:        CylinderGeometry(0.2,0.3,6)   rotateZ+translate
 *   - Grease pool:       PlaneGeometry(8.6,8.6,64,64)  circle-clipped vertices
 *   - Steam particles:   Points geometry, 200 particles, canvas radial gradient
 *   - Thermometer:       tube + mercury fill + bulb on right side of stove
 *
 * Import path note: THREE imported from 'three/webgpu' per project convention.
 */

import {useFrame, useThree} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {
  createGreaseMaterial,
  GreaseWaveSimulation,
  updateGrease,
} from '../../engine/GreaseSimulation';
import {createMeatMaterial, updateCookingAppearance} from '../../engine/MeatTexture';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CookingMechanicsProps {
  /** World position from resolveTargets() stove position */
  position: [number, number, number];
  /** Y coordinate of the counter surface (absolute world Y) */
  counterY: number;
  /** Whether the station is visible (current challenge = cooking) */
  visible: boolean;
  /** Called with final cookLevel (0-1) when cooking completes */
  onCookComplete?: (cookLevel: number) => void;
}

type Phase = 'place' | 'dial' | 'cooking' | 'done';

// ---------------------------------------------------------------------------
// Constants — ported from POC at raw POC scale (world units)
// ---------------------------------------------------------------------------

// Stove geometry (POC L207-208)
const STOVE_BASE_W = 12;
const STOVE_BASE_H = 1;
const STOVE_BASE_D = 11;
const STOVE_BACK_H = 3;
const STOVE_BACK_D = 1;
const STOVE_BACK_Y = 2;

// Burner positions relative to stove group center (POC L212-213)
const BURNER_Y = 0.5 + 1 / 2; // 1.0 — top of stove base
const BURNER_BR: [number, number, number] = [2.5, BURNER_Y, -2];
const BURNER_FL: [number, number, number] = [-2.5, BURNER_Y, 2];
const BURNER_MAJOR_R = 1.5;
const BURNER_TUBE_R = 0.15;

// Dial positions (POC L216-217)
const DIAL_Y = 2.5;
const DIAL_BR: [number, number, number] = [3, DIAL_Y, -4.4];
const DIAL_FL: [number, number, number] = [-3, DIAL_Y, -4.4];
const DIAL_R = 0.4;
const DIAL_H = 0.3;

// Pan geometry (POC L221-226)
// LatheGeometry profile — exact POC vector list
const PAN_PROFILE_POINTS = [
  new THREE.Vector2(0.001, 0),
  new THREE.Vector2(4.5, 0),
  new THREE.Vector2(5.5, 1.2),
  new THREE.Vector2(5.2, 1.2),
  new THREE.Vector2(4.3, 0.2),
  new THREE.Vector2(0.001, 0.2),
];

// Pan handle: CylinderGeometry(0.2,0.3,6) rotateZ+translate from POC L224
const PAN_HANDLE_R_TOP = 0.2;
const PAN_HANDLE_R_BOTTOM = 0.3;
const PAN_HANDLE_LEN = 6;
const PAN_HANDLE_OFFSET_X = 8;
const PAN_HANDLE_OFFSET_Y = 0.8;

// Grease pool (POC L231-232)
const GREASE_SIZE = 8.6;
const GREASE_SEGS = 64;
const GREASE_CLIP_R = 4.3;
const GREASE_Y_BASE = 0.25;
const GREASE_Y_COOKING = 0.35;

// Steam particles (POC L248-250)
const STEAM_COUNT = 200;
const STEAM_PARTICLE_SIZE = 3;
const STEAM_SPAWN_PROB_PER_FRAME = 0.5;

// Snap distance for pan drag
const PAN_SNAP_DIST = 1.0;

// Thermometer (from deleted StoveStation)
const THERMO_TUBE_R = 0.03;
const THERMO_TUBE_H = 0.8;
const THERMO_FILL_R = 0.025;
const THERMO_BULB_R = 0.06;
const THERMO_X = STOVE_BASE_W / 2 + 0.5; // right side of stove

// Cook rate (POC L515)
const COOK_RATE = 0.06;

// Colors
const BLACK_PLASTIC = 0x111111;
const DARK_METAL = 0x444444;
const METAL = 0xe0e0e0;
const BURNER_HOT_COLOR = new THREE.Color(0xff3300);
const BURNER_HOT_EMISSIVE = new THREE.Color(0xaa1100);
const BURNER_OFF_COLOR = new THREE.Color(DARK_METAL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the circle-clipped grease PlaneGeometry.
 *
 * Directly ported from POC L231-232: iterate vertices of a PlaneGeometry
 * and clamp any vertex outside radius GREASE_CLIP_R to exactly that radius,
 * preserving direction. This creates a circular plane mesh.
 */
function buildGreaseGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(GREASE_SIZE, GREASE_SIZE, GREASE_SEGS, GREASE_SEGS);
  // PlaneGeometry is in XY plane; after rotateX(-PI/2) it sits in XZ — clip now in XZ
  // Rotate first so position attribute is in XZ, then clip
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.sqrt(x * x + z * z);
    if (d > GREASE_CLIP_R) {
      pos.setX(i, (x / d) * GREASE_CLIP_R);
      pos.setZ(i, (z / d) * GREASE_CLIP_R);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build the steam particle canvas texture (radial gradient, 64×64).
 * Ported from POC L249.
 *
 * Returns null in non-browser environments (e.g. Jest / React Native tests)
 * where `document` is unavailable. The PointsMaterial handles a null map
 * gracefully — particles still render as solid squares.
 */
function buildSteamTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// CookingMechanics
// ---------------------------------------------------------------------------

/**
 * Full cooking station: stove body, two burners, two dials, draggable frying
 * pan, grease pool, and steam particles.
 *
 * All positions are relative to the parent `<group position={position}>`.
 * The stove surface sits at y=0 within that group (y=counterY in world space
 * is handled by the parent positioning).
 */
export function CookingMechanics({position, visible, onCookComplete}: CookingMechanicsProps) {
  const {gl, camera} = useThree();

  // Phase state machine
  const [_phase, setPhase] = useState<Phase>('place');
  const phaseRef = useRef<Phase>('place');

  // Refs shared with useFrame
  const cookLevelRef = useRef(0);
  const timeRef = useRef(0);
  const onCookCompleteRef = useRef(onCookComplete);
  onCookCompleteRef.current = onCookComplete;

  // Pan position (local to stove group)
  const panPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...BURNER_BR));
  const panGroupRef = useRef<THREE.Group>(null);

  // Drag state
  const isDraggingRef = useRef(false);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const dragPoint = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  // Burner FL mesh ref for color changes
  const burnerFLRef = useRef<THREE.Mesh>(null);
  const burnerFLMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Dial FL mesh ref for rotation animation
  const dialFLRef = useRef<THREE.Mesh>(null);
  const dialTurnedRef = useRef(false);

  // Sausage group ref (for scale shrink during cooking)
  const sausageGroupRef = useRef<THREE.Group>(null);

  // Thermometer mercury fill ref (height driven by cookLevel)
  const mercuryRef = useRef<THREE.Mesh>(null);

  // Grease wave simulation (browser-only)
  const greaseSim = useRef<GreaseWaveSimulation | null>(null);
  if (!greaseSim.current && typeof document !== 'undefined') {
    greaseSim.current = new GreaseWaveSimulation(128);
  }

  // Grease pool refs
  const greasePoolRef = useRef<THREE.Mesh>(null);
  const greaseMat = useMemo(() => createGreaseMaterial(greaseSim.current ?? undefined), []);

  // Meat material for the sausage inside the pan
  const meatMat = useMemo(() => createMeatMaterial(), []);

  // Steam particles — BufferGeometry updated each frame
  const steamGeoRef = useRef<THREE.BufferGeometry>(null);
  const steamPosArray = useMemo(() => new Float32Array(STEAM_COUNT * 3), []);
  const steamLifeRef = useRef(new Float32Array(STEAM_COUNT));
  const steamVelRef = useRef<Array<[number, number, number]>>(
    Array.from({length: STEAM_COUNT}, () => [0, 0, 0]),
  );

  // Steam texture (built once — canvas radial gradient; null in non-browser envs)
  const steamTexture = useMemo(() => buildSteamTexture(), []);

  // Grease geometry (built once — circle-clipped plane)
  const greaseGeo = useMemo(() => buildGreaseGeometry(), []);

  // Pan lathe geometry (built once — exact POC profile)
  const panLatheGeo = useMemo(() => new THREE.LatheGeometry(PAN_PROFILE_POINTS, 64), []);

  // Pan handle geometry: cylinder rotated Z then translated (mirrors POC L224)
  const panHandleGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(PAN_HANDLE_R_TOP, PAN_HANDLE_R_BOTTOM, PAN_HANDLE_LEN, 16);
    g.rotateZ(Math.PI / 2);
    g.translate(PAN_HANDLE_OFFSET_X, PAN_HANDLE_OFFSET_Y, 0);
    return g;
  }, []);

  // Pan material
  const panMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.6,
        metalness: 0.8,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Stove materials
  const blackPlasticMat = useMemo(
    () => new THREE.MeshStandardMaterial({color: BLACK_PLASTIC, roughness: 0.8}),
    [],
  );
  const metalMat = useMemo(
    () => new THREE.MeshStandardMaterial({color: METAL, roughness: 0.3, metalness: 0.9}),
    [],
  );
  // ---------------------------------------------------------------------------
  // Pointer event handlers for pan dragging (POC L396-407, L457-473)
  // ---------------------------------------------------------------------------

  const getMouseNDC = useCallback(
    (e: PointerEvent | MouseEvent): THREE.Vector2 => {
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    },
    [gl],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current !== 'place') return;
    isDraggingRef.current = true;
    e.stopPropagation();
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || phaseRef.current !== 'place') return;

      const ndcMouse = getMouseNDC(e);
      mouse.copy(ndcMouse);
      raycaster.setFromCamera(mouse, camera);

      // Intersect with the stove top plane (y = STOVE_BASE_H / 2 in local coords)
      // We compute in local stove-group space by offsetting the plane
      // dragPlane normal is (0,1,0) with constant = 0 (local group y=0)
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        // Clamp to stove surface area
        const clampedX = Math.max(
          -STOVE_BASE_W / 2 + BURNER_MAJOR_R,
          Math.min(STOVE_BASE_W / 2 - BURNER_MAJOR_R, dragPoint.x - position[0]),
        );
        const clampedZ = Math.max(
          -STOVE_BASE_D / 2 + BURNER_MAJOR_R,
          Math.min(STOVE_BASE_D / 2 - BURNER_MAJOR_R, dragPoint.z - position[2]),
        );

        panPosRef.current.set(clampedX, BURNER_Y, clampedZ);

        if (panGroupRef.current) {
          panGroupRef.current.position.copy(panPosRef.current);
        }

        // Check snap to front-left burner (POC L463)
        const flWorld = new THREE.Vector3(
          position[0] + BURNER_FL[0],
          position[1] + BURNER_FL[1],
          position[2] + BURNER_FL[2],
        );
        const panWorld = new THREE.Vector3(
          position[0] + panPosRef.current.x,
          position[1] + panPosRef.current.y,
          position[2] + panPosRef.current.z,
        );

        if (panWorld.distanceTo(flWorld) < PAN_SNAP_DIST) {
          panPosRef.current.set(BURNER_FL[0], BURNER_FL[1], BURNER_FL[2]);
          if (panGroupRef.current) {
            panGroupRef.current.position.copy(panPosRef.current);
          }
          isDraggingRef.current = false;
          phaseRef.current = 'dial';
          setPhase('dial');
        }
      }
    },
    [camera, dragPlane, dragPoint, mouse, raycaster, position, getMouseNDC],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Attach global pointer events for drag (R3F canvas events don't fire outside mesh)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleAttachCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('pointermove', handlePointerMove);
        canvasRef.current.removeEventListener('pointerup', handlePointerUp);
      }
      canvasRef.current = canvas;
      if (canvas) {
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
      }
    },
    [handlePointerMove, handlePointerUp],
  );

  // Register global pointer events on the canvas for drag (runs once on mount)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      handleAttachCanvas(gl.domElement);
    }
    return () => handleAttachCanvas(null);
  }, [gl.domElement, handleAttachCanvas]);

  // ---------------------------------------------------------------------------
  // Dial click (POC L401-406)
  // ---------------------------------------------------------------------------

  const handleDialClick = useCallback(() => {
    if (phaseRef.current !== 'dial') return;

    // Animate dial rotation
    if (dialFLRef.current && !dialTurnedRef.current) {
      dialTurnedRef.current = true;
      dialFLRef.current.rotation.x = Math.PI / 2 - Math.PI / 4;
    }

    // Burner color → orange/red glow (POC L405)
    if (burnerFLMatRef.current) {
      burnerFLMatRef.current.color.copy(BURNER_HOT_COLOR);
      burnerFLMatRef.current.emissive.copy(BURNER_HOT_EMISSIVE);
    }

    phaseRef.current = 'cooking';
    setPhase('cooking');
  }, []);

  // ---------------------------------------------------------------------------
  // useFrame — cooking logic (POC L513-586)
  // ---------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const t = timeRef.current;

    if (phaseRef.current !== 'cooking') return;

    const cookLevel = cookLevelRef.current;

    // Advance cook level (POC L515)
    const newCookLevel = Math.min(1.0, cookLevel + dt * COOK_RATE);
    cookLevelRef.current = newCookLevel;

    // Update meat appearance (POC L518-521)
    updateCookingAppearance(meatMat, newCookLevel);

    // Update grease opacity and shimmer (POC L524)
    updateGrease(greaseMat, newCookLevel, t);

    // Wave simulation — add splats proportional to cook level, then step
    if (greaseSim.current && phaseRef.current === 'cooking') {
      if (Math.random() < newCookLevel * 0.3) {
        greaseSim.current.addSplat(
          0.3 + Math.random() * 0.4, // u: center area
          0.3 + Math.random() * 0.4, // v: center area
          0.05 + Math.random() * 0.05, // radius
          0.1 + newCookLevel * 0.2, // strength increases with cook
        );
      }
      greaseSim.current.step(0.96);
      greaseSim.current.computeNormals(2.0);
      greaseSim.current.update();
    }

    // Raise grease pool slightly during cooking
    if (greasePoolRef.current) {
      greasePoolRef.current.position.y =
        GREASE_Y_BASE + (GREASE_Y_COOKING - GREASE_Y_BASE) * newCookLevel;
    }

    // Thermometer mercury fill height
    if (mercuryRef.current) {
      const fillH = Math.max(0.01, THERMO_TUBE_H * newCookLevel);
      mercuryRef.current.scale.y = newCookLevel || 0.01;
      mercuryRef.current.position.y = -THERMO_TUBE_H / 2 + fillH / 2;
    }

    // Sausage shrinks as it cooks (POC L522)
    if (sausageGroupRef.current) {
      const shrink = 1 - newCookLevel * 0.15;
      sausageGroupRef.current.scale.set(shrink, 1, shrink);
    }

    // Burner flicker (visual-only; just jitter emissive intensity slightly)
    if (burnerFLMatRef.current && phaseRef.current === 'cooking') {
      const flicker = Math.sin(t * 60) * 0.05;
      burnerFLMatRef.current.emissiveIntensity = 1.0 + flicker;
    }

    // Steam particles (POC L572-585)
    const sPos = steamPosArray;
    const sLife = steamLifeRef.current;
    const sVel = steamVelRef.current;

    for (let i = 0; i < STEAM_COUNT; i++) {
      // Spawn (POC L574)
      if (sLife[i] <= 0 && Math.random() < newCookLevel * STEAM_SPAWN_PROB_PER_FRAME * dt) {
        // Spawn from sausage area (roughly inside pan radius)
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * GREASE_CLIP_R * 0.7;
        sPos[i * 3] = r * Math.cos(angle);
        sPos[i * 3 + 1] = GREASE_Y_COOKING;
        sPos[i * 3 + 2] = r * Math.sin(angle);
        sVel[i][0] = (Math.random() - 0.5) * 0.3;
        sVel[i][1] = 0.3 * (1 + Math.random() * 2); // rise velocity
        sVel[i][2] = (Math.random() - 0.5) * 0.3;
        sLife[i] = 1.0; // normalized lifetime
      }

      if (sLife[i] > 0) {
        // Update (POC L579-581): advance position, drain life
        sLife[i] -= dt * 0.5;
        sPos[i * 3] += sVel[i][0] * dt;
        sPos[i * 3 + 1] += sVel[i][1] * dt;
        sPos[i * 3 + 2] += sVel[i][2] * dt;

        if (sLife[i] <= 0) {
          // Hide by moving far away
          sPos[i * 3] = 999;
          sPos[i * 3 + 1] = 0;
          sPos[i * 3 + 2] = 0;
        }
      }
    }

    // Push updated positions to GPU
    if (steamGeoRef.current) {
      const attr = steamGeoRef.current.attributes.position;
      if (attr) {
        (attr as THREE.BufferAttribute).set(steamPosArray);
        attr.needsUpdate = true;
      }
    }

    // Completion (POC L526-529)
    if (newCookLevel >= 1.0 && phaseRef.current === 'cooking') {
      phaseRef.current = 'done';
      setPhase('done');
      onCookCompleteRef.current?.(newCookLevel);
    }
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!visible) return null;

  return (
    <group position={position}>
      {/* --- Stove base (POC L207) --- */}
      <mesh position={[0, STOVE_BASE_H / 2, 0]} material={blackPlasticMat}>
        <boxGeometry args={[STOVE_BASE_W, STOVE_BASE_H, STOVE_BASE_D]} />
      </mesh>

      {/* --- Stove back panel (POC L208) --- */}
      <mesh
        position={[0, STOVE_BASE_H / 2 + STOVE_BACK_Y, -STOVE_BASE_D / 2 - STOVE_BACK_D / 2]}
        material={blackPlasticMat}
      >
        <boxGeometry args={[STOVE_BASE_W, STOVE_BACK_H, STOVE_BACK_D]} />
      </mesh>

      {/* --- Burner: back-right (always dark, POC L212) --- */}
      <mesh position={BURNER_BR} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BURNER_MAJOR_R, BURNER_TUBE_R, 8, 32]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.7} metalness={0.8} />
      </mesh>

      {/* --- Burner: front-left (heats up on dial click, POC L213) --- */}
      <mesh ref={burnerFLRef} position={BURNER_FL} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BURNER_MAJOR_R, BURNER_TUBE_R, 8, 32]} />
        <meshStandardMaterial
          ref={burnerFLMatRef}
          color={BURNER_OFF_COLOR}
          roughness={0.7}
          metalness={0.8}
          emissive={new THREE.Color(0x000000)}
        />
      </mesh>

      {/* --- Dial: back-right (POC L216, rotateX PI/2 to face forward) --- */}
      <mesh position={DIAL_BR} rotation={[Math.PI / 2, 0, 0]} material={metalMat}>
        <cylinderGeometry args={[DIAL_R, DIAL_R, DIAL_H, 16]} />
      </mesh>

      {/* --- Dial: front-left — clickable (POC L217-218) --- */}
      <mesh
        ref={dialFLRef}
        position={DIAL_FL}
        rotation={[Math.PI / 2, 0, 0]}
        material={metalMat}
        onClick={handleDialClick}
      >
        <cylinderGeometry args={[DIAL_R, DIAL_R, DIAL_H, 16]} />
      </mesh>

      {/* --- Frying pan group (draggable, starts on BR burner, POC L223-228) --- */}
      <group ref={panGroupRef} position={BURNER_BR}>
        {/* Pan body: LatheGeometry with exact POC profile */}
        <mesh
          geometry={panLatheGeo}
          material={panMat}
          castShadow
          onPointerDown={handlePointerDown}
        />

        {/* Pan handle: cylinder rotated + translated (POC L224) */}
        <mesh geometry={panHandleGeo} material={panMat} castShadow />

        {/* --- Invisible hitbox for easier pan picking (POC L228) --- */}
        <mesh position={[0, 1, 0]} onPointerDown={handlePointerDown}>
          <cylinderGeometry args={[5.5, 5.5, 2, 16]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* --- Grease pool (POC L241, circle-clipped plane) --- */}
        <mesh
          ref={greasePoolRef}
          geometry={greaseGeo}
          material={greaseMat}
          position={[0, GREASE_Y_BASE, 0]}
        />

        {/* --- Sausage inside pan (from MeatTexture) --- */}
        <group ref={sausageGroupRef} position={[0, 0.25, 0]}>
          {/* Coil-shaped sausage approximation: a few overlapping capsule segments */}
          {Array.from({length: 5}, (_, i) => {
            const angle = (i / 5) * Math.PI * 2;
            const r = 1.8;
            return (
              <mesh
                key={`sausage_${i}`}
                position={[r * Math.cos(angle), 0, r * Math.sin(angle)]}
                rotation={[Math.PI / 2, 0, angle + Math.PI / 2]}
                material={meatMat}
              >
                <cylinderGeometry args={[0.3, 0.3, 1.4, 8]} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* --- Steam particles (POC L248-250) --- */}
      {/* Rendered in world-group space, positions written each frame */}
      <points>
        <bufferGeometry ref={steamGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[steamPosArray, 3]}
            count={STEAM_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          map={steamTexture}
          size={STEAM_PARTICLE_SIZE}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* --- Thermometer (right side of stove, from deleted StoveStation) --- */}
      <group position={[THERMO_X, STOVE_BASE_H, 0]}>
        {/* Glass tube */}
        <mesh position={[0, THERMO_TUBE_H / 2, 0]}>
          <cylinderGeometry args={[THERMO_TUBE_R, THERMO_TUBE_R, THERMO_TUBE_H, 8]} />
          <meshStandardMaterial color={0xcccccc} transparent opacity={0.4} />
        </mesh>
        {/* Mercury fill — scale.y driven by cookLevel in useFrame */}
        <mesh ref={mercuryRef} position={[0, 0, 0]}>
          <cylinderGeometry args={[THERMO_FILL_R, THERMO_FILL_R, THERMO_TUBE_H, 8]} />
          <meshStandardMaterial color={0xff0000} />
        </mesh>
        {/* Bulb at bottom */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[THERMO_BULB_R, 8, 8]} />
          <meshStandardMaterial color={0xff0000} />
        </mesh>
      </group>

      {/* --- Phase indicator: instructions text (minimal, handled by overlay) --- */}
    </group>
  );
}
