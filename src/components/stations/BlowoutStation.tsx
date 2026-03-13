import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

const MAX_SPLATTERS = 50;

export function BlowoutStation() {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const table = useGLTF('/models/table_styloo.glb') as any;
  const chair = useGLTF('/models/chair_styloo.glb') as any;

  const [pressure, setPressure] = useState(0);
  const [isBlowing, setIsBlowing] = useState(false);
  const [hasBlown, setHasBlown] = useState(false);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particlesData = useRef(
    Array.from({length: MAX_SPLATTERS}, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
    })),
  );

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const _setGroundMeatVol = useGameStore(state => state.setGroundMeatVol);
  const _setStuffLevel = useGameStore(state => state.setStuffLevel);
  const _setCookLevel = useGameStore(state => state.setCookLevel);
  const nextRound = useGameStore(state => state.nextRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const currentRound = useGameStore(state => state.currentRound);
  const finalScore = useGameStore(state => state.finalScore);

  const drawCerealBox = useCallback((ctx: CanvasRenderingContext2D, clear = false) => {
    if (clear) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px Impact';
      ctx.textAlign = 'center';
      ctx.fillText("MR. SAUSAGE'S", 256, 100);
      ctx.font = '72px Impact';
      ctx.fillText('FLAKES', 256, 180);
      ctx.fillStyle = '#aa4400';
      ctx.fillText('100% MEAT', 256, 400);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawCerealBox(ctx, true);
    }

    textureRef.current = new THREE.CanvasTexture(canvas);
    textureRef.current.needsUpdate = true;
  }, [drawCerealBox]);

  const triggerBlowout = () => {
    if (hasBlown) return;
    setHasBlown(true);

    const data = particlesData.current;
    for (let i = 0; i < Math.floor(pressure * MAX_SPLATTERS); i++) {
      const p = data[i];
      p.active = true;
      p.pos.set((Math.random() - 0.5) * 0.5, 1.0 + (Math.random() - 0.5) * 0.5, 1.5);
      p.vel.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -5 - Math.random() * 5);
    }

    setTimeout(() => {
      setGamePhase('MOVE_SAUSAGE');
    }, 1500);
  };

  useFrame((state, delta) => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }

    if (gamePhase === 'BLOWOUT') {
      if (isBlowing && !hasBlown) {
        setPressure(p => Math.min(1.0, p + delta * 0.5));
        state.camera.position.x += (Math.random() - 0.5) * pressure * 0.05;
        state.camera.position.y += (Math.random() - 0.5) * pressure * 0.05;
      }
    }

    if (particlesRef.current && hasBlown) {
      let _activeCount = 0;
      const data = particlesData.current;
      const ctx = canvasRef.current.getContext('2d');

      for (let i = 0; i < MAX_SPLATTERS; i++) {
        const p = data[i];
        if (p.active) {
          p.vel.y -= 9.8 * delta;
          p.pos.addScaledVector(p.vel, delta);

          if (p.pos.z < 0.1 && p.pos.y > 0.5 && p.pos.y < 1.3 && Math.abs(p.pos.x) < 0.3) {
            p.active = false;
            dummy.position.set(0, -999, 0);

            if (ctx) {
              const uvX = ((p.pos.x + 0.2) / 0.4) * 512;
              const uvY = ((1.3 - p.pos.y) / 0.8) * 512;
              ctx.fillStyle = 'rgba(150, 0, 0, 0.8)';
              ctx.beginPath();
              ctx.arc(uvX, uvY, 10 + Math.random() * 20, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.pos.y < 0) {
            p.active = false;
            dummy.position.set(0, -999, 0);
          } else {
            dummy.position.copy(p.pos);
            _activeCount++;
          }
          dummy.updateMatrix();
          particlesRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const handleRestart = () => {
    if (gamePhase === 'DONE') {
      if (finalScore && finalScore.totalScore < 50) {
        // Permadeath or failure triggers full reset
        window.location.reload();
      } else if (currentRound < totalRounds) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) drawCerealBox(ctx, true);
        setHasBlown(false);
        setPressure(0);
        nextRound();
      }
    }
  };

  return (
    <group position={[-1.5, 0.0, 1.5]}>
      {gamePhase === 'BLOWOUT' && (
        <mesh
          position={[0, 1.5, 1.0]}
          visible={false}
          onPointerDown={() => setIsBlowing(true)}
          onPointerUp={() => {
            setIsBlowing(false);
            triggerBlowout();
          }}
          onPointerOut={() => {
            if (isBlowing) {
              setIsBlowing(false);
              triggerBlowout();
            }
          }}
        >
          <planeGeometry args={[5, 5]} />
        </mesh>
      )}

      <instancedMesh ref={particlesRef} args={[undefined, undefined, MAX_SPLATTERS]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#822424" roughness={0.6} />
      </instancedMesh>

      {table.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={table.scene.clone()} position={[0, 0, 0]} scale={1.2} />
        </RigidBody>
      )}

      {chair.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive
            object={chair.scene.clone()}
            position={[0, 0, 0.8]}
            rotation={[0, Math.PI, 0]}
            scale={1.2}
          />
        </RigidBody>
      )}

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.95, 0]} castShadow receiveShadow onClick={handleRestart}>
          <boxGeometry args={[0.4, 0.6, 0.15]} />
          {textureRef.current ? (
            <meshStandardMaterial map={textureRef.current} roughness={0.6} />
          ) : (
            <meshStandardMaterial color="#ffaa00" roughness={0.6} />
          )}
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="hull">
        <mesh position={[0, 0.75, 0.3]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.2, 0.05, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
        </mesh>
      </RigidBody>
    </group>
  );
}

useGLTF.preload('/models/table_styloo.glb');
useGLTF.preload('/models/chair_styloo.glb');
