import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

class SquigglyCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    return target.set(
      Math.sin(t * 20) * 0.15,
      0.05 + Math.abs(Math.cos(t * 15)) * 0.05,
      Math.cos(t * 25) * 0.15,
    );
  }
}

export function Stuffer() {
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const stuffLevel = useGameStore(state => state.stuffLevel);
  const setStuffLevel = useGameStore(state => state.setStuffLevel);

  const crankRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);
  const dragCurveRef = useRef(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.5, 0.2, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(0, 0.2, 0),
    ),
  );

  const [isDraggingCasing, setIsDraggingCasing] = useState(false);
  const [dragTarget, setDragTarget] = useState(new THREE.Vector3(0.5, 0.2, 0));

  const [metalMap, metalNormal, metalRough] = useTexture([
    require('../../../public/textures/concrete_color.jpg'),
    require('../../../public/textures/concrete_normal.jpg'),
    require('../../../public/textures/concrete_roughness.jpg'),
  ]);

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: metalMap,
        normalMap: metalNormal,
        roughnessMap: metalRough,
        color: '#aaa',
        metalness: 0.9,
        roughness: 0.3,
      }),
    [metalMap, metalNormal, metalRough],
  );

  const casingMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffee',
        transmission: 0.8,
        opacity: 1,
        transparent: true,
        roughness: 0.2,
        thickness: 0.1,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const bunchedCasingGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 32, 32, true);
    const pA = geo.attributes.position;
    for (let i = 0; i < pA.count; i++) {
      pA.setX(i, pA.getX(i) * (1 + 0.1 * Math.sin(pA.getY(i) * 40)));
      pA.setZ(i, pA.getZ(i) * (1 + 0.1 * Math.sin(pA.getY(i) * 40)));
    }
    geo.computeVertexNormals();
    geo.rotateZ(-Math.PI / 2);
    return geo;
  }, []);

  const squigglyGeo = useMemo(
    () => new THREE.TubeGeometry(new SquigglyCurve(), 64, 0.04, 8, false),
    [],
  );

  const bindCrank = useDrag(({movement: [, my]}) => {
    if (gamePhase !== 'STUFFING') return;

    const newLevel = Math.max(0, Math.min(1.0, stuffLevel + my * 0.002));
    setStuffLevel(newLevel);

    if (crankRef.current) {
      crankRef.current.rotation.x = -newLevel * Math.PI * 10;
    }
    if (rodRef.current) {
      rodRef.current.position.y = 1.0 - newLevel * 0.8;
    }

    if (newLevel >= 1.0) {
      setGamePhase('TIE_CASING');
    }
  });

  const bindCasing = useDrag(({active, movement: [mx, my]}) => {
    if (gamePhase !== 'ATTACH_CASING') return;

    setIsDraggingCasing(active);

    if (active) {
      setDragTarget(new THREE.Vector3(0.5 + mx * 0.002, 0.2 - my * 0.002, 0));
    } else {
      if (dragTarget.distanceTo(new THREE.Vector3(0.4, 0.2, 0)) < 0.3) {
        setGamePhase('STUFFING');
      }
    }
  });

  useFrame(() => {
    if (isDraggingCasing) {
      dragCurveRef.current.v2.copy(dragTarget);
      dragCurveRef.current.v1.set((0.5 + dragTarget.x) / 2, Math.max(0.5, dragTarget.y + 0.2), 0);
    }
  });

  const handleNozzleClick = () => {
    if (gamePhase === 'ATTACH_CASING') {
      setGamePhase('STUFFING');
    }
  };

  const handleSausageClick = () => {
    if (gamePhase === 'MOVE_SAUSAGE') {
      setGamePhase('MOVE_PAN');
    }
  };

  return (
    <group position={[-2.8, 0.4, 2]}>
      {/* Stuffer Base */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[1.0, 0.1, 1.0]} position={[0, 0, 0]} material={metalMat} receiveShadow />
      </RigidBody>

      {/* Water Bowl and Casing */}
      <group position={[0.5, 0.05, 0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.1, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.02, 32]} />
          <meshPhysicalMaterial color="#aaccff" transmission={0.9} opacity={1} ior={1.33} />
        </mesh>

        {(gamePhase === 'ATTACH_CASING' || gamePhase === 'MOVE_BOWL') && !isDraggingCasing && (
          <mesh
            geometry={squigglyGeo}
            material={casingMat}
            {...(bindCasing() as any)}
            position={[0, 0.05, 0]}
          />
        )}
      </group>

      {/* Dragging Casing line */}
      {isDraggingCasing && (
        <mesh material={casingMat}>
          <tubeGeometry args={[dragCurveRef.current, 32, 0.04, 8, false]} />
        </mesh>
      )}

      {/* Canister */}
      <RigidBody type="fixed" colliders="hull">
        <Cylinder
          args={[0.3, 0.3, 1.0, 32]}
          position={[0, 0.5, 0]}
          material={metalMat}
          castShadow
        />
      </RigidBody>

      {/* Nozzle */}
      <Cylinder
        args={[0.05, 0.1, 0.4, 32]}
        rotation={[0, 0, -Math.PI / 2]}
        position={[0.4, 0.2, 0]}
        material={metalMat}
        castShadow
        onClick={handleNozzleClick}
      >
        {(gamePhase === 'STUFFING' ||
          gamePhase === 'MOVE_SAUSAGE' ||
          gamePhase === 'TIE_CASING') && (
          <mesh
            geometry={bunchedCasingGeo}
            material={casingMat}
            position={[0, 0.2, 0]}
            scale={[1, Math.max(0.1, 1.0 - stuffLevel), 1]}
          />
        )}
      </Cylinder>

      {/* Sausage visual for picking up */}
      {gamePhase === 'MOVE_SAUSAGE' && (
        <mesh position={[0.8, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} onClick={handleSausageClick}>
          <cylinderGeometry args={[0.08, 0.08, stuffLevel * 0.8]} />
          <meshStandardMaterial color="#822424" roughness={0.6} />
        </mesh>
      )}

      {/* Support Pillars */}
      <Box args={[0.05, 1.2, 0.05]} position={[-0.4, 0.6, 0]} material={metalMat} />
      <Box args={[0.05, 1.2, 0.05]} position={[0.4, 0.6, 0]} material={metalMat} />

      {/* Top Bar */}
      <Box args={[1.0, 0.2, 0.3]} position={[0, 1.2, 0]} material={metalMat} castShadow />

      {/* Threaded Rod */}
      <mesh ref={rodRef} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.5, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Crank */}
      <group {...(bindCrank() as any)} ref={crankRef} position={[0.5, 1.2, 0]}>
        <Box args={[0.05, 0.4, 0.05]} position={[0, 0.2, 0]} material={metalMat} />
        <Cylinder
          args={[0.03, 0.03, 0.1, 16]}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.4, 0.05]}
        >
          <meshStandardMaterial color="#111" roughness={0.9} />
        </Cylinder>
        <Box args={[0.4, 0.6, 0.4]} position={[0, 0.2, 0]} visible={false} />
      </group>
    </group>
  );
}
