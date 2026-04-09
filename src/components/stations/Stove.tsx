/**
 * @module Stove
 * The grease-pool simulator station. Two burners with knobs, a draggable
 * frying pan, and an FBO ripple sim that paints normal-mapped grease
 * onto the pan as the player turns up the heat.
 *
 * Determinism note (T0.A): per-frame splat positions and scales are
 * driven by a per-component seeded RNG. Save-scummed reloads see the
 * same boil pattern, so the visual feedback the player learns from is
 * consistent across runs of the same seed.
 *
 * Style points (T1.C): completing the cook awards flair based on the
 * final cook level. A perfect medium cook (0.5-0.7) earns "Perfect
 * Sear"; overcooking or undercooking earns less.
 *
 * Fidelity tuning (T2.C): FBO size and splat instance count now read
 * from the centralized FIDELITY config for mobile-first performance.
 *
 * Composition integration: the grease pool base colour and sizzle
 * intensity are now driven by the composite mix of the player's
 * ingredient selection, so different ingredient combos produce
 * visibly different frying behaviour.
 *
 * E.4: Audio uses sfx_sizzle_loop.ogg and sfx_boiling.ogg as PRIMARY
 * sources, sfx_pan_clang.ogg when the pan lands on a burner.
 * Tone.js synthesis is FALLBACK only.
 */
import {Torus, useGLTF} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {FIDELITY} from '../../config/fidelityConfig';
import {useGameStore} from '../../ecs/hooks';
import {audioEngine} from '../../engine/AudioEngine';
import {type CompositeMix, compositeMix, INGREDIENTS} from '../../engine/IngredientComposition';
import {useRunRng} from '../../engine/useRunRng';
import {asset} from '../../utils/assetPath';
import {requestHandGesture} from '../camera/handGestureStore';

/** T2.C: FBO size from centralized fidelity config (was hardcoded 256). */
const fboSize = FIDELITY.stoveFboSize;

const fboOptions = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
};

/** Resolve selectedIngredientIds into a CompositeMix. */
function useCompositeMix(): CompositeMix {
  const selectedIds = useGameStore(state => state.selectedIngredientIds);
  return useMemo(() => {
    const defs = selectedIds
      .map(id => INGREDIENTS.find(ing => ing.id === id))
      .filter((d): d is (typeof INGREDIENTS)[number] => d != null);
    return compositeMix(defs);
  }, [selectedIds]);
}

export function Stove() {
  const {gl} = useThree();
  const [burnerLevels, setBurnerLevels] = useState([0, 0]); // FrontLeft, BackRight
  const dialFL = useRef<THREE.Group>(null);
  const dialBR = useRef<THREE.Group>(null);

  // Per-component seeded RNG for boil splats -- replays identically per save.
  const rng = useRunRng('Stove.splats');

  // Track whether we've already awarded the cook flair (once per phase).
  const cookFlairAwarded = useRef(false);

  // Track whether boiling SFX has been triggered this cook session.
  const boilingSfxPlayed = useRef(false);

  // Composition-driven colour and sizzle intensity.
  const mix = useCompositeMix();

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
    /** T2.C: splat instance count from fidelity config (was hardcoded 100). */
    const count = FIDELITY.stoveSplatInstances;
    if (typeof document === 'undefined') {
      const mat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
      return new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, count);
    }
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
    return new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, count);
  }, []);

  useEffect(() => {
    splatScene.add(splatMesh);
    return () => {
      splatScene.remove(splatMesh);
    };
  }, [splatScene, splatMesh]);

  const splatDummy = useMemo(() => new THREE.Object3D(), []);

  // Grease pool base colour derived from the composite mix colour.
  // Falls back to a generic amber grease if no selection.
  const greaseBaseColor = useMemo(() => {
    if (mix.sources.length === 0) return new THREE.Color(0xcca600);
    // Darken the mix colour toward amber/brown for a greasy look.
    const c = new THREE.Color(mix.color);
    c.lerp(new THREE.Color(0x8a5a00), 0.4);
    return c;
  }, [mix]);

  const greasePoolMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: greaseBaseColor,
        transparent: true,
        opacity: 0.8,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.2,
        ior: 1.4,
        depthWrite: false,
        displacementMap: rtCurr.current.texture,
        displacementScale: FIDELITY.stoveDisplacementScale,
        normalMap: rtNormal.current.texture,
        normalScale: new THREE.Vector2(1, 1),
      }),
    [greaseBaseColor],
  );

  const oven = useGLTF(asset('/models/kitchen_oven_large.glb')) as any;
  const pan = useGLTF(asset('/models/frying_pan.glb')) as any;
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const cookLevel = useGameStore(state => state.cookLevel);
  const setCookLevel = useGameStore(state => state.setCookLevel);
  const recordFlairPoint = useGameStore(state => state.recordFlairPoint);

  // Reset flair flag when entering COOKING phase.
  const prevPhaseRef = useRef(gamePhase);
  if (gamePhase === 'COOKING' && prevPhaseRef.current !== 'COOKING') {
    cookFlairAwarded.current = false;
    boilingSfxPlayed.current = false;
  }
  prevPhaseRef.current = gamePhase;

  const [panPos, setPanPos] = useState(new THREE.Vector3(0.8, 0, 0)); // BR Burner

  const bindPan = useDrag(({active, movement: [x, y], first, last}) => {
    if (gamePhase !== 'MOVE_PAN') return;

    // Right hand grips the pan handle the whole time it's being dragged.
    if (first) requestHandGesture('grab_right');
    if (last) requestHandGesture('idle');

    if (active) {
      setPanPos(new THREE.Vector3(0.8 + x * 0.01, 0, y * 0.01));
    } else {
      if (
        new THREE.Vector3(0.8 + x * 0.01, 0, y * 0.01).distanceTo(new THREE.Vector3(0, 0, 0.8)) <
        0.5
      ) {
        setPanPos(new THREE.Vector3(0, 0, 0.8));
        // E.4: Pan landing clang — PRIMARY sfx_pan_clang.ogg
        audioEngine.playPanClang();
        setGamePhase('COOKING');
      } else {
        setPanPos(new THREE.Vector3(0.8, 0, 0));
      }
    }
  });

  // Sizzle intensity scales with the composite mix's moisture + fat.
  // Wetter, fattier mixes sizzle louder and more violently.
  const sizzleMultiplier = useMemo(() => {
    if (mix.sources.length === 0) return 1.0;
    return 0.6 + mix.moisture * 0.6 + mix.fat * 0.4;
  }, [mix]);

  // E.4: Use PRIMARY sizzle loop. setSizzleLevel now routes through
  // sfx_sizzle_loop.ogg with Tone.js fallback.
  const updateSizzle = (l1: number, l2: number) => {
    if (gamePhase === 'COOKING') {
      audioEngine.setSizzleLevel(Math.max(l1, l2) * sizzleMultiplier);
    }
  };

  const bindDialFL = useDrag(({movement: [, my], first, last}) => {
    if (first) requestHandGesture('grab_right');
    if (last) requestHandGesture('idle');

    const level = Math.max(0, Math.min(1.0, burnerLevels[0] - my * 0.005));
    setBurnerLevels([level, burnerLevels[1]]);
    if (dialFL.current) dialFL.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(level, burnerLevels[1]);
  });

  const bindDialBR = useDrag(({movement: [, my], first, last}) => {
    if (first) requestHandGesture('grab_right');
    if (last) requestHandGesture('idle');

    const level = Math.max(0, Math.min(1.0, burnerLevels[1] - my * 0.005));
    setBurnerLevels([burnerLevels[0], level]);
    if (dialBR.current) dialBR.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(burnerLevels[0], level);
  });

  // Cook logic & FBO Physics
  useFrame((_state, delta) => {
    if (gamePhase === 'COOKING') {
      const maxHeat = Math.max(burnerLevels[0], burnerLevels[1]);
      if (maxHeat > 0) {
        const nextCook = Math.min(1.0, cookLevel + maxHeat * delta * 0.1); // Takes 10s at full heat
        setCookLevel(nextCook);

        // E.4: Trigger boiling SFX once per cook session when heat is significant
        if (!boilingSfxPlayed.current && maxHeat > 0.3) {
          boilingSfxPlayed.current = true;
          audioEngine.playBoiling();
        }

        if (nextCook >= 1.0 && !cookFlairAwarded.current) {
          cookFlairAwarded.current = true;
          // Award flair based on the heat level at completion.
          // Perfect sear = moderate heat (0.4-0.7). Too high = charred, too low = raw.
          if (maxHeat >= 0.4 && maxHeat <= 0.7) {
            recordFlairPoint('Perfect Sear', 8);
          } else if (maxHeat > 0.7) {
            recordFlairPoint('Charred Finish', 3);
          } else {
            recordFlairPoint('Slow Cook', 2);
          }
          setGamePhase('DONE');
        }
      }

      // FBO Grease logic
      let splatCount = 0;
      if (maxHeat > 0.1) {
        for (let i = 0; i < Math.floor(maxHeat * 5); i++) {
          splatDummy.position.set((rng() - 0.5) * 2, (rng() - 0.5) * 2, 0);
          splatDummy.scale.setScalar(0.05 + rng() * 0.1);
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

      // Change color based on cookLevel — darken from the mix-derived base
      // toward a deep brown char.
      greasePoolMat.color.lerpColors(greaseBaseColor, new THREE.Color(0x3a2200), cookLevel);
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
        {/* Frying Pan (Draggable) — pulsing glow during MOVE_PAN to guide player */}
        {pan.scene && (
          <group {...bindPan()} position={panPos}>
            <primitive object={pan.scene.clone()} scale={0.7} position={[0, -0.02, 0]} />
            {gamePhase === 'MOVE_PAN' && <PanGlowRing />}
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

/**
 * Pulsing emissive ring around the frying pan during MOVE_PAN phase.
 * Tells the player "pick me up and put me on a burner."
 */
function PanGlowRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (!ref.current) return;
    const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
  });
  return (
    <mesh ref={ref} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.28, 32]} />
      <meshStandardMaterial
        color="#ff8800"
        emissive="#ff6600"
        emissiveIntensity={0.4}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

useGLTF.preload(asset('/models/kitchen_oven_large.glb'));
