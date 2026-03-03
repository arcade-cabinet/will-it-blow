/**
 * @module ComfortVignette
 * Full-screen dark gradient overlay that intensifies during smooth VR movement.
 * Reduces motion sickness by narrowing the field of view when the player moves.
 *
 * Renders a screen-space quad with a radial gradient shader. The vignette
 * opacity is driven by the player's movement velocity: idle = no vignette,
 * full speed = maximum darkening at the screen edges.
 *
 * Only active when the `comfortVignette` store setting is true and
 * an XR session is active.
 */

import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {InputManager} from '../../input/InputManager';
import {useGameStore} from '../../store/gameStore';

/** Maximum vignette intensity at full movement speed (0-1). */
const MAX_INTENSITY = 0.6;
/** How quickly the vignette fades in/out (lerp factor per second). */
const FADE_SPEED = 8;
/** Minimum movement magnitude to start showing vignette. */
const MOVEMENT_THRESHOLD = 0.1;

/**
 * ComfortVignette — screen-space overlay that darkens edges during VR movement.
 *
 * Must be rendered inside an R3F Canvas. Uses a full-screen plane rendered
 * after the scene (renderOrder = 9999) with a custom shader that creates
 * a radial gradient from transparent (center) to black (edges).
 */
export function ComfortVignette() {
  const enabled = useGameStore(s => s.comfortVignette);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentIntensity = useRef(0);

  const {vertexShader, fragmentShader, uniforms} = useMemo(
    () => ({
      uniforms: {
        uIntensity: {value: 0},
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
      fragmentShader: `
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        float vignette = smoothstep(0.4, 1.0, dist);
        gl_FragColor = vec4(0.0, 0.0, 0.0, vignette * uIntensity);
      }
    `,
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!enabled || !materialRef.current) return;

    const dt = Math.min(delta, 0.1);
    const input = InputManager.getInstance();
    const move = input.getMovement();
    const speed = Math.sqrt(move.x * move.x + move.z * move.z);

    const targetIntensity = speed > MOVEMENT_THRESHOLD ? Math.min(speed, 1) * MAX_INTENSITY : 0;

    currentIntensity.current = THREE.MathUtils.lerp(
      currentIntensity.current,
      targetIntensity,
      1 - Math.exp(-FADE_SPEED * dt),
    );

    materialRef.current.uniforms.uIntensity.value = currentIntensity.current;
    materialRef.current.visible = currentIntensity.current > 0.001;
  });

  if (!enabled) return null;

  return (
    <mesh renderOrder={9999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
