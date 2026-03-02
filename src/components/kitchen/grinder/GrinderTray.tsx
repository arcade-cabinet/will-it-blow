/**
 * @module GrinderTray
 * Visual sub-component: the output tray below the chute.
 *
 * Findable part for Phase 2 hidden object (Well Done).
 */

export interface GrinderTrayProps {
  counterY: number;
}

export function GrinderTray({counterY: cY}: GrinderTrayProps) {
  return (
    <mesh position={[0, cY + 5.6, 0.5]} castShadow>
      <boxGeometry args={[5, 0.3, 4]} />
      <meshStandardMaterial color={0xe0e0e0} roughness={0.3} metalness={0.9} />
    </mesh>
  );
}
