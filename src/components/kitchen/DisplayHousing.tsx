/**
 * @module DisplayHousing
 * Procedural furniture mount for display machines (ceiling panels, wall brackets).
 *
 * Like BasementStructure, this is furniture (scene geometry) — it occupies
 * space and provides a local coordinate system for children. The machine's
 * ECS entities render inside the <group> via MeshRenderer/LightRenderer.
 *
 * - Ceiling mount: metal box flush against ceiling, open bottom, content below.
 * - Wall mount: metal L-bracket from wall, content in front.
 */

import type {ReactNode} from 'react';
import type {DisplayHousingConfig} from '../../config/types';

interface DisplayHousingProps {
  config: DisplayHousingConfig;
  position: [number, number, number];
  rotationY?: number;
  children?: ReactNode;
}

export function DisplayHousing({
  config: cfg,
  position,
  rotationY = 0,
  children,
}: DisplayHousingProps) {
  const {width, depth, thickness} = cfg;

  if (cfg.mountType === 'ceiling') {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* Metal box flush against ceiling — open bottom */}
        <mesh position={[0, thickness / 2, 0]}>
          <boxGeometry args={[width, thickness, depth]} />
          <meshStandardMaterial
            color={cfg.bracketColor}
            roughness={cfg.bracketRoughness ?? 0.75}
            metalness={cfg.bracketMetalness ?? 0.6}
          />
        </mesh>
        {/* Children mount below the housing box */}
        {children}
      </group>
    );
  }

  // Wall mount: L-bracket
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Horizontal arm extending from wall */}
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial
          color={cfg.bracketColor}
          roughness={cfg.bracketRoughness ?? 0.9}
          metalness={cfg.bracketMetalness ?? 0.3}
        />
      </mesh>
      {/* Children mount in front of the bracket */}
      <group position={[0, 0, depth]}>{children}</group>
    </group>
  );
}
