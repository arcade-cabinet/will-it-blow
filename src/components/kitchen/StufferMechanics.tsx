/**
 * @module StufferMechanics
 * Procedural stuffer station geometry with casing drag and crank interaction.
 *
 * Ports the stuffer mechanic from the POC sausage_factory.html (lines 174-202,
 * 375-383, 439-456, 476-487). Renders the full stuffer apparatus — canister,
 * nozzle, tray, descending rod, crank group, water bowl, and three casing
 * stages — and handles all pointer interactions in R3F.
 *
 * Casing lifecycle:
 *  1. **idle**: Squiggly unattached casing sits in water bowl.
 *  2. **drag**: Player clicks water bowl hitbox → unattached hides, dragged
 *     QuadraticBezierCurve3 casing follows pointer. On pointer-up within 2.0
 *     units of the nozzle tip the casing snaps to the nozzle.
 *  3. **crank**: Bunched casing is attached; dragging the crank group rotates
 *     the arm and drives stuffLevel (0→1). Rod descends, bunched casing
 *     shrinks and advances along Z.
 *  4. **done**: stuffLevel ≥ 1.0 triggers onStuffComplete.
 *
 * @see StufferStation — the existing stuffer body driven by challenge props.
 */

import {type ThreeEvent, useFrame, useThree} from '@react-three/fiber';
import {useCallback, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {buildSausageLinksGeometry} from '../../engine/SausageBody';
import {useGameStore} from '../../store/gameStore';

// SquigglyCurve — matches POC line 194 exactly
class SquigglyCurve extends THREE.Curve<THREE.Vector3> {
  // Offset of the water bowl centre in parent-local space (x=+5, z=-1)
  private readonly bx: number;
  private readonly by: number;
  private readonly bz: number;

  constructor(bx: number, by: number, bz: number) {
    super();
    this.bx = bx;
    this.by = by;
    this.bz = bz;
  }

  getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return target.set(
      this.bx + Math.sin(t * 20) * 1,
      this.by + 0.3 + Math.abs(Math.cos(t * 15) * 0.5),
      this.bz + Math.cos(t * 25) * 1,
    );
  }
}

/** Mixing bowl lathe profile — exact from POC L153 (same as GrinderMechanics). */
const BOWL_POINTS = [
  new THREE.Vector2(0.01, 0),
  new THREE.Vector2(3, 0),
  new THREE.Vector2(3.5, 1.5),
  new THREE.Vector2(3.3, 1.6),
  new THREE.Vector2(2.8, 0.2),
  new THREE.Vector2(0.01, 0.2),
];

/** Build the wrinkled bunched-casing geometry (POC line 201). */
function buildBunchedGeo(): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(0.4, 0.4, 2.0, 32, 32, true);
  const pA = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pA.count; i++) {
    const y = pA.getY(i);
    const wrinkle = 1 + 0.1 * Math.sin(y * 40);
    pA.setX(i, pA.getX(i) * wrinkle);
    pA.setZ(i, pA.getZ(i) * wrinkle);
  }
  pA.needsUpdate = true;
  geo.computeVertexNormals();
  // Rotate to face along Z so it sits on the nozzle (POC: rotateX(PI/2))
  geo.rotateX(Math.PI / 2);
  return geo;
}

// ---------------------------------------------------------------------------
// SausageLinksBody — inline R3F component for extruding sausage links
// ---------------------------------------------------------------------------

const LINKS_PARAMS = {
  numLinks: 5,
  thickness: 0.35,
  linkLength: 0.8,
  pathSegments: 150,
  radialSegments: 16,
};

/**
 * Renders a skinned-mesh string of sausage links emerging from the nozzle.
 * As extrusionProgress goes 0→1, links progressively appear.
 * blendColor tints the sausage material with the ingredient mix color.
 */
function SausageLinksBody({
  position,
  visible,
  extrusionProgress,
  blendColor,
}: {
  position: [number, number, number];
  visible: boolean;
  extrusionProgress: number;
  blendColor: string;
}) {
  const geoResult = useMemo(() => buildSausageLinksGeometry(LINKS_PARAMS), []);
  const {geometry, numBones, anchors} = geoResult;

  // Build skeleton: one bone per link
  const {skeleton, rootBone} = useMemo(() => {
    const bones: THREE.Bone[] = [];
    const root = new THREE.Bone();
    root.position.set(0, 0, 0);

    for (let i = 0; i < numBones; i++) {
      const bone = new THREE.Bone();
      bone.position.copy(anchors[i].base);
      root.add(bone);
      bones.push(bone);
    }

    return {skeleton: new THREE.Skeleton([root, ...bones]), rootBone: root};
  }, [numBones, anchors]);

  // Material tinted with blendColor
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(blendColor),
        roughness: 0.55,
        metalness: 0.05,
      }),
    [blendColor],
  );

  // Ref for the SkinnedMesh
  const meshRef = useRef<THREE.SkinnedMesh>(null);

  // Bind skeleton on mount
  const bindRef = useRef(false);
  useFrame(() => {
    if (!bindRef.current && meshRef.current) {
      meshRef.current.add(rootBone);
      meshRef.current.bind(skeleton);
      bindRef.current = true;
    }

    // Per-link visibility: hide bones for links not yet extruded
    for (let i = 0; i < numBones; i++) {
      const linkThreshold = (i + 1) / numBones;
      const boneIdx = i + 1; // +1 because root is at index 0
      const bone = skeleton.bones[boneIdx];
      if (bone) {
        // Scale to zero if not yet extruded, otherwise full size
        const s = extrusionProgress >= linkThreshold ? 1 : 0;
        bone.scale.setScalar(s);
      }
    }
  });

  return (
    <group position={position} visible={visible}>
      <skinnedMesh ref={meshRef} geometry={geometry}>
        <primitive object={material} attach="material" />
      </skinnedMesh>
    </group>
  );
}

/**
 * Props for StufferMechanics.
 */
interface StufferMechanicsProps {
  /** World position from resolveTargets() stuffer entry. */
  position: [number, number, number];
  /** Counter-top Y for baseline geometry alignment. */
  counterY: number;
  /** Whether the component is visible. */
  visible: boolean;
  /** Called with final stuffLevel (0-1) when cranking completes. */
  onStuffComplete?: (stuffLevel: number) => void;
}

// ---------------------------------------------------------------------------
// StufferMechanics
// ---------------------------------------------------------------------------

/**
 * Renders the full stuffer station procedural geometry and handles casing
 * drag + crank interactions.  All positions are relative to the parent group
 * (the `position` prop moves the group; internal offsets mirror the POC's
 * `sX` / `cY`-relative layout with `sX=0` since the group handles X).
 */
export function StufferMechanics({
  position,
  counterY,
  visible,
  onStuffComplete,
}: StufferMechanicsProps) {
  const {gl} = useThree();
  const blendColor = useGameStore(s => s.blendColor);

  // ---- Phase state ----
  const [phase, setPhase] = useState<'idle' | 'drag' | 'crank' | 'done'>('idle');
  const stuffLevelRef = useRef(0);
  const [extrusionProgress, setExtrusionProgress] = useState(0);

  // ---- Drag state ----
  const isDraggingRef = useRef(false);
  const isCrankingRef = useRef(false);

  // ---- Mesh refs ----
  const rodRef = useRef<THREE.Mesh>(null);
  const crankGroupRef = useRef<THREE.Group>(null);
  const unattachedRef = useRef<THREE.Mesh>(null);
  const draggedMeshRef = useRef<THREE.Mesh>(null);
  const attachedRef = useRef<THREE.Mesh>(null);

  // ---- Casing geometry ----
  // Bowl local-space centre: x=+5, z=-1 (relative to stuffer group origin)
  const bowlBx = 5;
  const bowlBz = -1;

  const squigglyCurve = useMemo(() => new SquigglyCurve(bowlBx, counterY, bowlBz), [counterY]);

  const unattachedGeo = useMemo(
    () => new THREE.TubeGeometry(squigglyCurve, 64, 0.3, 12, false),
    [squigglyCurve],
  );

  // QuadraticBezierCurve3 reused for dragged casing — mutated on pointer move
  const draggedCurve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(bowlBx, counterY + 1, bowlBz),
        new THREE.Vector3(2, counterY + 3, 0),
        new THREE.Vector3(0, counterY + 1, 1),
      ),
    [counterY],
  );

  const draggedGeoRef = useRef<THREE.TubeGeometry>(
    new THREE.TubeGeometry(draggedCurve, 32, 0.3, 12, false),
  );

  const bunchedGeo = useMemo(() => buildBunchedGeo(), []);
  const bowlGeo = useMemo(() => new THREE.LatheGeometry(BOWL_POINTS, 32), []);

  // ---- Shared materials ----
  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x9aa0a6,
        roughness: 0.4,
        metalness: 0.8,
      }),
    [],
  );

  const darkMetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.6,
        metalness: 0.7,
      }),
    [],
  );

  const blackPlasticMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.1,
      }),
    [],
  );

  const casingMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffee,
        transmission: 0.8,
        opacity: 1,
        roughness: 0.2,
        thickness: 0.1,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const waterMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xaaccff,
        transmission: 0.9,
        opacity: 1,
      }),
    [],
  );

  // ---- Nozzle tip position in local space (matches POC: sX=0, cY+1.0, z=1.25) ----
  const nozzleTipLocal = useMemo(() => new THREE.Vector3(0, counterY + 1.0, 1.25), [counterY]);

  // ---- Plane for raycasting during drag (Y-up plane at counterY+1) ----
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(counterY + 1)),
    [counterY],
  );

  // Temp vector reused for plane intersection
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  // ---- Pointer event handlers ----

  /** Water bowl hitbox click → start casing drag */
  const handleBowlClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'idle') return;
      e.stopPropagation();
      isDraggingRef.current = true;
      setPhase('drag');
      if (unattachedRef.current) unattachedRef.current.visible = false;
      if (draggedMeshRef.current) draggedMeshRef.current.visible = true;
    },
    [phase],
  );

  /** Crank group pointer down → start cranking */
  const handleCrankDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'crank') return;
      e.stopPropagation();
      isCrankingRef.current = true;
    },
    [phase],
  );

  // ---- useFrame: update rod, casing scale/position during crank ----
  useFrame(() => {
    const sl = stuffLevelRef.current;

    // Rod descends as stuffLevel increases (POC line 446)
    if (rodRef.current) {
      rodRef.current.position.y = counterY + 8 - sl * 5.0;
    }

    // Bunched casing shrinks and advances along Z (POC lines 448-449)
    if (attachedRef.current) {
      attachedRef.current.scale.z = Math.max(0.01, 1.0 - sl);
      attachedRef.current.position.z = 0 - sl * 1.5;
    }

    // Sync extrusion progress — only update state when crossing a link threshold
    // to avoid re-rendering every frame
    const prevLinks = Math.floor(extrusionProgress * LINKS_PARAMS.numLinks);
    const currLinks = Math.floor(sl * LINKS_PARAMS.numLinks);
    if (currLinks !== prevLinks || (sl >= 1.0 && extrusionProgress < 1.0)) {
      setExtrusionProgress(sl);
    }
  });

  // ---- Canvas-level pointer move & up for drag / crank ----
  // We attach these on the canvas DOM element via useEffect-style approach,
  // but R3F's onPointerMove on a large invisible plane is the idiomatic way.
  // Instead we track moves on the gl.domElement directly.
  const onGlobalPointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDraggingRef.current) {
        // Project onto the horizontal plane at counterY+1
        const canvas = gl.domElement;
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // We need camera access — capture via closure on initial register
        // (handled by the separate registerCanvasListeners approach below)
        void nx;
        void ny;
      }

      if (isCrankingRef.current) {
        // Rotate crank by movementY (POC line 445)
        if (crankGroupRef.current) {
          crankGroupRef.current.rotation.x -= e.movementY * 0.05;
        }

        // Increment stuffLevel (POC line 447)
        const prev = stuffLevelRef.current;
        stuffLevelRef.current = Math.min(1.0, prev + Math.abs(e.movementY) * 0.002);

        if (stuffLevelRef.current >= 1.0 && prev < 1.0) {
          isCrankingRef.current = false;
          setPhase('done');
          onStuffComplete?.(stuffLevelRef.current);
        }
      }
    },
    [gl.domElement, onStuffComplete],
  );

  const onGlobalPointerUp = useCallback((_e: PointerEvent) => {
    if (isCrankingRef.current) {
      isCrankingRef.current = false;
    }
  }, []);

  // Register global listeners once
  const listenersAttached = useRef(false);
  if (!listenersAttached.current) {
    listenersAttached.current = true;
    // Defer to avoid SSR issues — will be cleaned up by component lifecycle
  }

  // useFrame also used to keep listeners registered (only once)
  const listenersRef = useRef<{
    move: typeof onGlobalPointerMove;
    up: typeof onGlobalPointerUp;
  } | null>(null);

  useFrame(({camera, raycaster}) => {
    // Re-register listeners when they change (dependencies changed)
    const dom = gl.domElement;
    if (listenersRef.current) {
      dom.removeEventListener('pointermove', listenersRef.current.move as EventListener);
      dom.removeEventListener('pointerup', listenersRef.current.up as EventListener);
    }

    // For drag phase: build a proper raycaster-based intersect
    const currentMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        const canvas = gl.domElement;
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        raycaster.ray.intersectPlane(dragPlane, hitPoint);

        // Update curve end point to pointer position, control point midway (POC line 441)
        draggedCurve.v2.set(hitPoint.x - position[0], hitPoint.y, hitPoint.z - position[2]);
        draggedCurve.v1.set(
          (bowlBx + draggedCurve.v2.x) / 2,
          counterY + 4,
          (bowlBz + draggedCurve.v2.z) / 2,
        );

        // Regenerate TubeGeometry (POC line 442)
        const newGeo = new THREE.TubeGeometry(draggedCurve, 32, 0.3, 12, false);
        if (draggedMeshRef.current) {
          draggedMeshRef.current.geometry.dispose();
          draggedMeshRef.current.geometry = newGeo;
        }
        draggedGeoRef.current = newGeo;
      }

      if (isCrankingRef.current) {
        if (crankGroupRef.current) {
          crankGroupRef.current.rotation.x -= e.movementY * 0.05;
        }
        const prev = stuffLevelRef.current;
        stuffLevelRef.current = Math.min(1.0, prev + Math.abs(e.movementY) * 0.002);

        if (stuffLevelRef.current >= 1.0 && prev < 1.0) {
          isCrankingRef.current = false;
          setPhase('done');
          onStuffComplete?.(stuffLevelRef.current);
        }
      }
    };

    const currentUp = (_e: PointerEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (draggedMeshRef.current) draggedMeshRef.current.visible = false;

        // Check distance of drag endpoint to nozzle tip (POC line 480)
        const endLocal = draggedCurve.v2;
        const dist = endLocal.distanceTo(nozzleTipLocal);
        if (dist < 2.0) {
          // Snap: show bunched casing, hide unattached (POC lines 481-482)
          if (attachedRef.current) attachedRef.current.visible = true;
          if (unattachedRef.current) unattachedRef.current.visible = false;
          setPhase('crank');
        } else {
          // Reset: show unattached again (POC line 483)
          if (unattachedRef.current) unattachedRef.current.visible = true;
          setPhase('idle');
        }
      }
      if (isCrankingRef.current) {
        isCrankingRef.current = false;
      }
    };

    listenersRef.current = {move: currentMove, up: currentUp};
    dom.addEventListener('pointermove', currentMove as EventListener);
    dom.addEventListener('pointerup', currentUp as EventListener);
  });

  // cY alias for counterY for readability
  const cY = counterY;

  return (
    <group position={position} visible={visible}>
      {/* ---- Base plate (POC line 177): BoxGeometry(6,0.5,6) at (0, cY+0.25, -2) ---- */}
      <mesh position={[0, cY + 0.25, -2]}>
        <boxGeometry args={[6, 0.5, 6]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Canister (POC line 178): CylinderGeometry(2,2,6,32) at (0, cY+3.5, -2) ---- */}
      <mesh position={[0, cY + 3.5, -2]}>
        <cylinderGeometry args={[2, 2, 6, 32]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Top block (POC line 179): BoxGeometry(6,1.5,2.5) at (0, cY+7.25, -2) ---- */}
      <mesh position={[0, cY + 7.25, -2]}>
        <boxGeometry args={[6, 1.5, 2.5]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Nozzle (POC line 180): CylinderGeometry(0.3,0.7,2.5,32) rotX(PI/2) at (0, cY+1.0, 0) ---- */}
      <mesh position={[0, cY + 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.7, 2.5, 32]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Tray (POC line 182): BoxGeometry(10,0.2,7) at (0, cY+0.1, 4) ---- */}
      <mesh position={[0, cY + 0.1, 4]}>
        <boxGeometry args={[10, 0.2, 7]} />
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Rod (POC line 185): CylinderGeometry(0.2,0.2,10,16) at (0, cY+8, -2) ---- */}
      <mesh ref={rodRef} position={[0, cY + 8, -2]}>
        <cylinderGeometry args={[0.2, 0.2, 10, 16]} />
        <primitive object={darkMetalMat} attach="material" />
      </mesh>

      {/* ---- Crank group (POC lines 186-188): arm + handle, offset (+3, cY+7.25, -2) ---- */}
      <group ref={crankGroupRef} position={[3, cY + 7.25, -2]} onPointerDown={handleCrankDown}>
        {/* Arm: BoxGeometry(0.3,3,0.3) at local (0, 1.5, 0) */}
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.3, 3, 0.3]} />
          <primitive object={metalMat} attach="material" />
        </mesh>
        {/* Handle: CylinderGeometry(0.2,0.2,1.5) rotX(PI/2) at local (0, 3, 0.75) */}
        <mesh position={[0, 3, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.5]} />
          <primitive object={blackPlasticMat} attach="material" />
        </mesh>
      </group>

      {/* ---- Water bowl (POC line 190): LatheGeometry bowl profile ---- */}
      <mesh position={[5, cY, -1]} geometry={bowlGeo}>
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* ---- Water surface (POC line 191): CylinderGeometry(2.3,2.3,0.1,32) at (5, cY+0.8, -1) ---- */}
      <mesh position={[5, cY + 0.8, -1]}>
        <cylinderGeometry args={[2.3, 2.3, 0.1, 32]} />
        <primitive object={waterMat} attach="material" />
      </mesh>

      {/* ---- Water bowl hitbox for casing drag start (POC line 196) ---- */}
      <mesh position={[5, cY + 0.5, -1]} onPointerDown={handleBowlClick} visible={false}>
        <cylinderGeometry args={[2.5, 2.5, 1.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* ---- Unattached casing (POC line 195): SquigglyCurve TubeGeometry in water bowl ---- */}
      <mesh ref={unattachedRef} geometry={unattachedGeo}>
        <primitive object={casingMat} attach="material" />
      </mesh>

      {/* ---- Dragged casing (POC line 199): QuadraticBezierCurve3 TubeGeometry, hidden initially ---- */}
      <mesh ref={draggedMeshRef} geometry={draggedGeoRef.current} visible={false}>
        <primitive object={casingMat} attach="material" />
      </mesh>

      {/* ---- Attached/bunched casing (POC line 202): wrinkled cylinder, hidden until snap ---- */}
      <mesh ref={attachedRef} geometry={bunchedGeo} position={[0, cY + 1.0, 0]} visible={false}>
        <primitive object={casingMat} attach="material" />
      </mesh>

      {/* ---- Extruded sausage links emerging from nozzle tip ---- */}
      <SausageLinksBody
        position={[0, cY + 1.0, 1.25]}
        visible={phase === 'crank' || phase === 'done'}
        extrusionProgress={extrusionProgress}
        blendColor={blendColor}
      />
    </group>
  );
}
