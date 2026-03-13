import {Box, Plane} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';

export function TV() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const crtShader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: {value: 0},
          resolution: {value: new THREE.Vector2(800, 600)},
        },
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform float time;
      varying vec2 vUv;

      // Noise function
      float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        
        // Curved screen effect
        uv = uv * 2.0 - 1.0;
        float r = dot(uv, uv);
        uv = uv * (1.0 + r * 0.1);
        uv = uv * 0.5 + 0.5;

        // Screen cutoff
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        // Generate procedural static with slight green tint
        float noise1 = rand(uv + vec2(time * 0.1, time * 0.2));
        float noise2 = rand(uv + vec2(time * -0.1, time * 0.3));
        
        float intensity = (noise1 + noise2) * 0.5;
        
        // Add scanlines
        float scanline = sin(uv.y * 800.0) * 0.04;
        
        // Add slow rolling hum bar
        float humBar = sin(uv.y * 3.0 + time * 2.0) * 0.05;

        vec3 color = vec3(0.0, intensity * 0.6 + 0.1, 0.0); // Green CRT look
        color -= scanline;
        color += humBar;
        
        // Vignette
        float dist = distance(uv, vec2(0.5));
        color *= smoothstep(0.8, 0.2, dist);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
      }),
    [],
  );

  useFrame(state => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={[-2.8, 1.8, 0]}>
      {/* Wall Mount */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.2, 0.4, 0.4]} position={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </Box>
      </RigidBody>

      {/* CRT TV Body */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.8, 0.8, 1.0]} position={[0.4, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#111" roughness={0.9} />
        </Box>
      </RigidBody>

      {/* TV Screen */}
      <Plane args={[0.65, 0.8]} position={[0.81, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <primitive object={crtShader} ref={materialRef} attach="material" />
      </Plane>
    </group>
  );
}
