import {Torus, useGLTF} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

const fboSize = 256;
const fboOptions = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
};

export function Stove() {
  const {gl} = useThree();
  const [burnerLevels, setBurnerLevels] = useState([0, 0]); // FrontLeft, BackRight
  const dialFL = useRef<THREE.Group>(null);
  const dialBR = useRef<THREE.Group>(null);

  // FBO setup
  const rtPrev = useRef(new THREE.WebGLRenderTarget(fboSize, fboSize, fboOptions));
  const rtCurr = useRef(new THREE.WebGLRenderTarget(fboSize, fboSize, fboOptions));
  const rtNext = useRef(new THREE.WebGLRenderTarget(fboSize, fboSize, fboOptions));
  const rtNormal = useRef(new THREE.WebGLRenderTarget(fboSize, fboSize, fboOptions));

  const fboCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const fboScene = useMemo(() => new THREE.Scene(), []);
  const fboQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), []);

  const simMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          u_current: {value: null},
          u_previous: {value: null},
          u_damping: {value: 0.98},
          u_texelSize: {value: new THREE.Vector2(1 / fboSize, 1 / fboSize)},
        },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position,1.0);}`,
        fragmentShader: `uniform sampler2D u_current, u_previous; uniform float u_damping; uniform vec2 u_texelSize; varying vec2 vUv; void main(){ float c=texture2D(u_current,vUv).r, p=texture2D(u_previous,vUv).r, l=texture2D(u_current,vUv+vec2(-u_texelSize.x,0)).r, r=texture2D(u_current,vUv+vec2(u_texelSize.x,0)).r, u=texture2D(u_current,vUv+vec2(0,-u_texelSize.y)).r, d=texture2D(u_current,vUv+vec2(0,u_texelSize.y)).r; gl_FragColor=vec4((((l+r+u+d)*0.5)-p)*u_damping, 0.0, 0.0, 1.0); }`,
      }),
    [],
  );

  const normMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          u_height: {value: null},
          u_texelSize: {value: new THREE.Vector2(1 / fboSize, 1 / fboSize)},
          u_scale: {value: 2.5},
        },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position,1.0);}`,
        fragmentShader: `uniform sampler2D u_height; uniform vec2 u_texelSize; uniform float u_scale; varying vec2 vUv; void main(){ float hL=texture2D(u_height,vUv+vec2(-u_texelSize.x,0)).r, hR=texture2D(u_height,vUv+vec2(u_texelSize.x,0)).r, hD=texture2D(u_height,vUv+vec2(0,-u_texelSize.y)).r, hU=texture2D(u_height,vUv+vec2(0,u_texelSize.y)).r; gl_FragColor=vec4(normalize(vec3((hL-hR)*u_scale, (hD-hU)*u_scale, 1.0))*0.5+0.5, 1.0); }`,
      }),
    [],
  );

  useEffect(() => {
    fboScene.add(fboQuad);
    return () => {
      fboScene.remove(fboQuad);
    };
  }, [fboScene, fboQuad]);

  const splatScene = useMemo(() => new THREE.Scene(), []);
  const splatCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const splatMesh = useMemo(() => {
    const sCtx = document.createElement('canvas').getContext('2d');
    if (sCtx) {
      sCtx.canvas.width = 32;
      sCtx.canvas.height = 32;
      const sGrd = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      sGrd.addColorStop(0, 'rgba(255,255,255,0.05)');
      sGrd.addColorStop(1, 'rgba(255,255,255,0)');
      sCtx.fillStyle = sGrd;
      sCtx.fillRect(0, 0, 32, 32);
    }
    const mat = new THREE.MeshBasicMaterial({
      map: sCtx ? new THREE.CanvasTexture(sCtx.canvas) : null,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    return new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, 100);
  }, []);

  useEffect(() => {
    splatScene.add(splatMesh);
    return () => {
      splatScene.remove(splatMesh);
    };
  }, [splatScene, splatMesh]);

  const splatDummy = useMemo(() => new THREE.Object3D(), []);

  const greasePoolMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xcca600,
        transparent: true,
        opacity: 0.8,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.2,
        ior: 1.4,
        depthWrite: false,
        displacementMap: rtCurr.current.texture,
        displacementScale: 0.2,
        normalMap: rtNormal.current.texture,
        normalScale: new THREE.Vector2(1, 1),
      }),
    [],
  );

  const oven = useGLTF('/models/kitchen_oven_large.glb') as any;
  const pan = useGLTF('/models/frying_pan.glb') as any;
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const cookLevel = useGameStore(state => state.cookLevel);
  const setCookLevel = useGameStore(state => state.setCookLevel);

  const [panPos, setPanPos] = useState(new THREE.Vector3(0.8, 0, 0)); // BR Burner

  const bindPan = useDrag(({active, movement: [x, y]}) => {
    if (gamePhase !== 'MOVE_PAN') return;
    if (active) {
      setPanPos(new THREE.Vector3(0.8 + x * 0.01, 0, y * 0.01));
    } else {
      if (
        new THREE.Vector3(0.8 + x * 0.01, 0, y * 0.01).distanceTo(new THREE.Vector3(0, 0, 0.8)) <
        0.5
      ) {
        setPanPos(new THREE.Vector3(0, 0, 0.8));
        setGamePhase('COOKING');
      } else {
        setPanPos(new THREE.Vector3(0.8, 0, 0));
      }
    }
  });

  const updateSizzle = (l1: number, l2: number) => {
    if (gamePhase === 'COOKING') {
      audioEngine.setSizzleLevel(Math.max(l1, l2));
    }
  };

  const bindDialFL = useDrag(({movement: [, my]}) => {
    const level = Math.max(0, Math.min(1.0, burnerLevels[0] - my * 0.005));
    setBurnerLevels([level, burnerLevels[1]]);
    if (dialFL.current) dialFL.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(level, burnerLevels[1]);
  });

  const bindDialBR = useDrag(({movement: [, my]}) => {
    const level = Math.max(0, Math.min(1.0, burnerLevels[1] - my * 0.005));
    setBurnerLevels([burnerLevels[0], level]);
    if (dialBR.current) dialBR.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(burnerLevels[0], level);
  });

  // Cook logic & FBO Physics
  useFrame((state, delta) => {
    if (gamePhase === 'COOKING') {
      const maxHeat = Math.max(burnerLevels[0], burnerLevels[1]);
      if (maxHeat > 0) {
        const nextCook = Math.min(1.0, cookLevel + maxHeat * delta * 0.1); // Takes 10s at full heat
        setCookLevel(nextCook);
        if (nextCook >= 1.0) {
          setGamePhase('DONE');
        }
      }

      // FBO Grease logic
      let splatCount = 0;
      if (maxHeat > 0.1) {
        // Add random boiling splats based on heat
        for (let i = 0; i < Math.floor(maxHeat * 5); i++) {
          splatDummy.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0);
          splatDummy.scale.setScalar(0.05 + Math.random() * 0.1);
          splatDummy.updateMatrix();
          splatMesh.setMatrixAt(splatCount++, splatDummy.matrix);
        }
      }

      splatMesh.count = splatCount;
      if (splatCount > 0) {
        splatMesh.instanceMatrix.needsUpdate = true;
        gl.setRenderTarget(rtCurr.current);
        gl.autoClear = false;
        gl.render(splatScene, splatCamera);
        gl.autoClear = true;
      }

      fboQuad.material = simMat;
      simMat.uniforms.u_current.value = rtCurr.current.texture;
      simMat.uniforms.u_previous.value = rtPrev.current.texture;
      simMat.uniforms.u_damping.value = 0.98 - maxHeat * 0.02;

      gl.setRenderTarget(rtNext.current);
      gl.render(fboScene, fboCamera);

      fboQuad.material = normMat;
      normMat.uniforms.u_height.value = rtNext.current.texture;

      gl.setRenderTarget(rtNormal.current);
      gl.render(fboScene, fboCamera);

      // Swap buffers
      const temp = rtPrev.current;
      rtPrev.current = rtCurr.current;
      rtCurr.current = rtNext.current;
      rtNext.current = temp;

      // Restore render target to screen
      gl.setRenderTarget(null);

      // Update materials with latest textures
      greasePoolMat.displacementMap = rtCurr.current.texture;
      greasePoolMat.normalMap = rtNormal.current.texture;

      // Change color based on cookLevel
      greasePoolMat.color.lerpColors(
        new THREE.Color(0xcca600),
        new THREE.Color(0x8a5a00),
        cookLevel,
      );
    }
  });

  return (
    <group position={[2.8, 0.0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Stove Base (Model) */}
      {oven.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={oven.scene.clone()} position={[0, 0, 0]} scale={1.2} />
        </RigidBody>
      )}

      {/* Burners & Pans */}
      <group position={[-0.4, 0.9, -0.4]}>
        {/* Frying Pan (Draggable) */}
        {pan.scene && (
          // @ts-expect-error
          <group {...bindPan()} position={panPos}>
            <primitive object={pan.scene.clone()} scale={0.7} position={[0, -0.02, 0]} />
            {/* Grease Pool inside the pan */}
            {(gamePhase === 'COOKING' || gamePhase === 'DONE') &&
              burnerLevels[0] > 0 &&
              panPos.z > 0.5 && (
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.45, 0.45, 64, 64]} />
                  <primitive object={greasePoolMat} attach="material" />
                </mesh>
              )}
          </group>
        )}

        {/* Burner FL */}
        <Torus args={[0.2, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.8]}>
          <meshStandardMaterial
            color={new THREE.Color().lerpColors(
              new THREE.Color('#333'),
              new THREE.Color('#ff4400'),
              burnerLevels[0],
            )}
            emissive={new THREE.Color().lerpColors(
              new THREE.Color('#000'),
              new THREE.Color('#ff2200'),
              burnerLevels[0],
            )}
          />
        </Torus>

        {/* Burner BR */}
        <Torus args={[0.2, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0.8, 0, 0]}>
          <meshStandardMaterial
            color={new THREE.Color().lerpColors(
              new THREE.Color('#333'),
              new THREE.Color('#ff4400'),
              burnerLevels[1],
            )}
            emissive={new THREE.Color().lerpColors(
              new THREE.Color('#000'),
              new THREE.Color('#ff2200'),
              burnerLevels[1],
            )}
          />
        </Torus>
      </group>

      {/* Dials */}
      <group position={[0.4, 0.75, 0.85]} rotation={[0, Math.PI / 2, 0]}>
        {/* @ts-ignore */}
        <group {...bindDialFL()} ref={dialFL} position={[0.4, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh visible={false}>
            <boxGeometry args={[0.2, 0.3, 0.3]} />
          </mesh>
        </group>

        {/* @ts-ignore */}
        <group {...bindDialBR()} ref={dialBR} position={[-0.4, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh visible={false}>
            <boxGeometry args={[0.2, 0.3, 0.3]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/models/kitchen_oven_large.glb');
