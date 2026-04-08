/**
 * @module PlateOnRope
 * The presentation plate that descends from the ceiling trapdoor on a
 * rope (design pillar #4 -- presentation is the actual climax).
 *
 * At round end, the trapdoor opens and this plate lowers to waist
 * height via a TubeGeometry rope. The player places the finished
 * sausage on the plate. The plate ascends back up through the trapdoor.
 * A beat of silence while Mr. Sausage tastes. Then the verdict.
 *
 * The rope is a catenary-like CatmullRomCurve3 from the ceiling anchor
 * to the plate, re-computed each frame based on the plate's Y position.
 * The plate itself is a simple dish geometry with stainless-steel
 * material (horror operating-theatre aesthetic).
 */
import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';

interface PlateOnRopeProps {
  /** Y position of the ceiling anchor point. */
  ceilingY?: number;
  /** Current target Y for the plate (animated externally). */
  plateY: number;
  /** World XZ position of the plate/rope column. */
  position?: [number, number];
}

/**
 * Build a TubeGeometry rope from ceiling to plate position.
 * The curve sags slightly to avoid a rigid straight-line look.
 */
function buildRopeGeometry(ceilingY: number, plateY: number): THREE.TubeGeometry {
  const midY = (ceilingY + plateY) / 2;
  const sag = Math.max(0.05, (ceilingY - plateY) * 0.03); // subtle sag
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, ceilingY, 0),
    new THREE.Vector3(sag * 0.5, midY + (ceilingY - plateY) * 0.1, sag),
    new THREE.Vector3(-sag * 0.3, midY - (ceilingY - plateY) * 0.1, -sag * 0.5),
    new THREE.Vector3(0, plateY + 0.15, 0), // just above the plate rim
  ]);
  return new THREE.TubeGeometry(curve, 24, 0.012, 8, false);
}

export function PlateOnRope({ceilingY = 3.0, plateY, position = [0, 0]}: PlateOnRopeProps) {
  const ropeRef = useRef<THREE.Mesh>(null);
  const plateGroupRef = useRef<THREE.Group>(null);

  const ropeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a7a5a',
        roughness: 0.9,
        metalness: 0.1,
      }),
    [],
  );

  const plateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cccccc',
        metalness: 0.85,
        roughness: 0.15,
      }),
    [],
  );

  // Rebuild rope geometry and reposition plate each frame.
  useFrame(() => {
    if (ropeRef.current) {
      ropeRef.current.geometry.dispose();
      ropeRef.current.geometry = buildRopeGeometry(ceilingY, plateY);
    }
    if (plateGroupRef.current) {
      plateGroupRef.current.position.y = plateY;
    }
  });

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* Rope (TubeGeometry, re-built per frame) */}
      <mesh ref={ropeRef} material={ropeMat}>
        {/* Geometry is set imperatively in useFrame */}
        <tubeGeometry
          args={[
            new THREE.LineCurve3(
              new THREE.Vector3(0, ceilingY, 0),
              new THREE.Vector3(0, plateY + 0.15, 0),
            ),
            8,
            0.012,
            8,
            false,
          ]}
        />
      </mesh>

      {/* Plate -- stainless steel dish */}
      <group ref={plateGroupRef} position={[0, plateY, 0]}>
        {/* Plate rim -- a flattened torus */}
        <mesh castShadow receiveShadow material={plateMat}>
          <torusGeometry args={[0.25, 0.03, 12, 32]} />
        </mesh>
        {/* Plate centre -- flat disc */}
        <mesh
          castShadow
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          material={plateMat}
        >
          <circleGeometry args={[0.22, 32]} />
        </mesh>
        {/* Slight concavity (darkened inner disc for depth) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
          <circleGeometry args={[0.2, 32]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}
