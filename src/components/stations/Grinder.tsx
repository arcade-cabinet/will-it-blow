import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

const MAX_PARTICLES = 300;

export function Grinder() {
  const [isGrinderOn, setIsGrinderOn] = useState(false);
  const faceplateRef = useRef<THREE.Mesh>(null);
  const motorRef = useRef<THREE.Group>(null);
  const plungerRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  const [plungerY, setPlungerY] = useState(1.2);

  // Particle data
  const particlesData = useRef(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
    }))
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

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
        color: '#888',
        metalness: 0.8,
        roughness: 0.4,
      }),
    [metalMap, metalNormal, metalRough],
  );

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const setGroundMeatVol = useGameStore(state => state.setGroundMeatVol);
  const groundMeatVol = useGameStore(state => state.groundMeatVol);

  // Chunk state: 0 = in bowl, 1 = on tray, 2 = in chute (ready to grind)
  const [chunks, setChunks] = useState([
    { id: 1, state: 0, pos: [-0.6, 0.4, 0] },
    { id: 2, state: 0, pos: [-0.8, 0.4, 0.2] },
    { id: 3, state: 0, pos: [-0.5, 0.5, 0.3] },
    { id: 4, state: 0, pos: [-0.7, 0.6, -0.2] },
    { id: 5, state: 0, pos: [-0.4, 0.4, -0.3] },
  ]);

  const [bowlPos, setBowlPos] = useState<[number, number, number]>([-0.6, 0.1, 0]);
  const [bowlState, setBowlState] = useState<'SIDE' | 'UNDER'>('SIDE');

  const handleBowlClick = () => {
    if (gamePhase === 'FILL_GRINDER' && bowlState === 'SIDE') {
      setBowlState('UNDER');
      // Slide under the grinder faceplate
      setBowlPos([0.6, 0.1, 0]);
    }
  };

  const handleChunkClick = (chunkId: number) => {
    if (gamePhase !== 'FILL_GRINDER' && gamePhase !== 'GRINDING') return;

    setChunks(prev => prev.map(c => {
      if (c.id === chunkId) {
        if (c.state === 0) return { ...c, state: 1, pos: [0.2, 0.8, 0] }; // Move to tray
        if (c.state === 1) return { ...c, state: 2, pos: [0.2, 0.6, 0] }; // Drop in chute
      }
      return c;
    }));
  };

  const toggleGrinder = () => {
    const nextState = !isGrinderOn;
    setIsGrinderOn(nextState);
    if (nextState && gamePhase === 'FILL_GRINDER' && bowlState === 'UNDER') {
      setGamePhase('GRINDING');
    }
  };

  const bindPlunger = useDrag(({ offset: [, y] }) => {
    if (gamePhase !== 'GRINDING') return;
    if (bowlState !== 'UNDER') return;
    
    // How many chunks are currently in the chute waiting to be ground?
    const chunksInChute = chunks.filter(c => c.state === 2).length;
    
    // Only allow plunging if there is meat in the chute
    if (chunksInChute === 0) return;

    const newY = Math.max(0.5, Math.min(1.2, 1.2 - y * 0.01));
    const plungeDelta = plungerY - newY;
    setPlungerY(newY);

    if (isGrinderOn) {
      const plungePercent = 1.0 - ((newY - 0.5) / 0.7);
      audioEngine.setGrinderSpeed(0.2 + plungePercent * 0.8);

      if (plungeDelta > 0) {
        setGroundMeatVol(prev => {
          const next = Math.min(1.0, prev + plungeDelta * 0.5);
          if (next >= 1.0 && gamePhase === 'GRINDING') {
            setGamePhase('MOVE_BOWL');
          }
          return next;
        });

        // "Consume" the chunks as we grind
        if (plungePercent > 0.8) {
           setChunks(prev => {
             const newChunks = [...prev];
             const cIdx = newChunks.findIndex(c => c.state === 2);
             if (cIdx !== -1) newChunks[cIdx].state = 3; // 3 = consumed/destroyed
             return newChunks;
           });
        }

        // Spawn particles
        const data = particlesData.current;
        for (let i = 0; i < 5; i++) {
          const p = data.find(d => !d.active);
          if (p) {
            p.active = true;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.15;
            // Spawn from faceplate holes
            p.pos.set(0.6, 0 + (Math.random() - 0.5) * 0.2, r * Math.sin(angle));
            p.vel.set(2 + Math.random() * 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
            p.rot.set(Math.random(), Math.random(), Math.random());
          }
        }
      }
    }
  });

  useEffect(() => {
    if (isGrinderOn && gamePhase === 'GRINDING') {
      audioEngine.setGrinderSpeed(0.2);
    } else {
      audioEngine.setGrinderSpeed(0);
    }

    return () => audioEngine.setGrinderSpeed(0);
  }, [isGrinderOn, gamePhase]);

  useFrame((state, delta) => {
    if (isGrinderOn) {
      const t = state.clock.elapsedTime;
      if (faceplateRef.current) {
        faceplateRef.current.rotation.y += delta * 5;
      }
      if (motorRef.current) {
        motorRef.current.position.x = Math.sin(t * 50) * 0.02;
      }
    } else {
      if (motorRef.current) motorRef.current.position.x = 0;
    }

    // Particle Physics update
    if (particlesRef.current) {
      let activeCount = 0;
      const data = particlesData.current;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = data[i];
        if (p.active) {
          p.vel.y -= 15 * delta; // Gravity
          p.pos.addScaledVector(p.vel, delta);
          p.rot.x += delta; 
          p.rot.z += delta;

          // Ground collision in the bowl
          if (p.pos.y < -0.4 + (groundMeatVol * 0.5)) {
            p.active = false;
            dummy.position.set(0, 999, 0); // Hide
          } else {
            dummy.position.copy(p.pos);
            dummy.rotation.copy(p.rot);
            activeCount++;
          }
        } else {
          dummy.position.set(0, 999, 0); // Hide inactive
        }
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
      if (activeCount > 0 || isGrinderOn) {
        particlesRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group position={[-1.5, 0.4, -1.0]}>
      {/* Grinder Body */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.6, 0.8, 0.8]} position={[-0.3, 0, 0]} material={metalMat} castShadow />
      </RigidBody>

      {/* Extruder */}
      <Cylinder
        args={[0.2, 0.2, 0.6, 32]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0.2, 0, 0]}
        material={metalMat}
        castShadow
      />

      {/* Prep Bowl */}
      {(gamePhase === 'FILL_GRINDER' || gamePhase === 'GRINDING' || gamePhase === 'MOVE_BOWL') && (
        <mesh position={bowlPos} castShadow receiveShadow onClick={() => {
          handleBowlClick();
          if (gamePhase === 'MOVE_BOWL') {
            setGamePhase('ATTACH_CASING');
          }
        }}>
          <cylinderGeometry args={[0.3, 0.2, 0.2, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
          {/* Ground Meat inside the bowl */}
          {groundMeatVol > 0 && bowlState === 'UNDER' && (
             <mesh position={[0, 0.05 + groundMeatVol * 0.05, 0]}>
                <sphereGeometry args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#822424" roughness={0.8} />
             </mesh>
          )}
        </mesh>
      )}

      {/* Raw Meat Chunks */}
      {chunks.map(chunk => chunk.state < 3 && (
        <mesh 
          key={chunk.id} 
          position={new THREE.Vector3(...chunk.pos)} 
          castShadow 
          onClick={() => handleChunkClick(chunk.id)}
        >
          <dodecahedronGeometry args={[0.08, 1]} />
          <meshStandardMaterial color="#c85a5a" roughness={0.7} />
        </mesh>
      ))}

      {/* Chute */}
      <Cylinder
        args={[0.25, 0.15, 0.4, 32]}
        position={[0.2, 0.4, 0]}
        material={metalMat}
        castShadow
      />

      {/* Tray */}
      <Box 
        args={[0.8, 0.05, 0.6]} 
        position={[0.2, 0.6, 0]} 
        material={metalMat} 
        castShadow 
      >
        {groundMeatVol > 0 && bowlState !== 'UNDER' && (
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.05 * groundMeatVol, 0.5]} />
            <meshStandardMaterial color="#822424" roughness={0.8} />
          </mesh>
        )}
      </Box>

      {/* Plunger */}
      {/* @ts-ignore - use-gesture typing requires this cast for R3F elements */}
      <group {...bindPlunger()} ref={plungerRef} position={[0.2, plungerY, 0]}>
        <Cylinder args={[0.12, 0.12, 0.6, 16]} position={[0, -0.3, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        <Cylinder args={[0.18, 0.18, 0.05, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        <Cylinder args={[0.05, 0.05, 0.2, 16]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        {/* Invisible larger hit box for easier grabbing */}
        <Cylinder args={[0.3, 0.3, 1.0, 16]} position={[0, -0.2, 0]} visible={false} />
      </group>

      {/* Faceplate */}
      <mesh ref={faceplateRef} position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Switch */}
      <group position={[-0.1, 0.2, 0.45]} onClick={toggleGrinder}>
        <Cylinder args={[0.05, 0.05, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={isGrinderOn ? '#44ff44' : '#ff4444'}
            emissive={isGrinderOn ? '#22aa22' : '#aa2222'}
          />
        </Cylinder>
      </group>

      {/* Meat Particles */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 6]} />
        <meshStandardMaterial color="#822424" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
