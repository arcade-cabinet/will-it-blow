/**
 * @module VRPanel
 * Floating 3D world-space panel for rendering HTML UI in VR.
 *
 * Uses @react-three/drei's `<Html>` component to project React Native Web
 * content into the 3D scene. The panel tracks the camera so it always faces
 * the player (billboard mode) and sits at a configurable distance.
 *
 * In non-VR mode, this component renders nothing — the 2D overlay layer
 * in App.tsx handles the HUD instead.
 *
 * Placement:
 * - Default: 1.5m in front of the camera, 0.15m below eye level
 * - Comfortable VR reading zone: within +/-30 deg horizontal, +/-20 deg vertical
 * - Never behind the player
 */

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useRef} from 'react';
import {Vector3} from 'three';
import type * as THREE from 'three/webgpu';
import {useXRMode} from '../../hooks/useXRMode';

// Shared temp vector to avoid per-frame allocation
const _tempVec = new Vector3();

export interface VRPanelProps {
  /** React children to render inside the panel */
  children: React.ReactNode;
  /** Distance from the camera in meters (default: 1.5) */
  distance?: number;
  /** Vertical offset from eye level in meters, negative = below (default: -0.15) */
  verticalOffset?: number;
  /** Width of the HTML container in CSS pixels (default: 420) */
  width?: number;
  /** Whether the panel should follow the camera each frame (default: true) */
  followCamera?: boolean;
  /** Optional fixed world position — overrides follow behavior */
  position?: [number, number, number];
  /** Z-index ordering within VR panels (default: 0) */
  zIndexRange?: [number, number];
  /** Extra CSS class applied to the container div */
  className?: string;
  /** Whether to render. If false, renders null even in VR (default: true) */
  visible?: boolean;
}

/**
 * World-space HTML panel for VR mode.
 *
 * Renders children as an Html overlay in 3D space using drei's `<Html>`.
 * Automatically tracks the player's camera and positions the panel
 * at a comfortable reading distance in front of them.
 *
 * Returns null when not in VR — the 2D overlay layer handles flat-screen rendering.
 */
export function VRPanel({
  children,
  distance = 1.5,
  verticalOffset = -0.15,
  width = 420,
  followCamera = true,
  position,
  zIndexRange = [0, 0],
  className,
  visible = true,
}: VRPanelProps) {
  const {isVR} = useXRMode();
  const {camera} = useThree();
  const groupRef = useRef<THREE.Group>(null);
  // Reusable vectors to avoid per-frame allocation
  const targetPos = useRef({x: 0, y: 0, z: 0});

  // Track camera position + forward direction each frame
  useFrame(() => {
    if (!isVR || !followCamera || position || !groupRef.current) return;

    // Camera forward is -Z in camera local space
    const forward = camera.getWorldDirection(_tempVec);
    // Project onto XZ plane for consistent placement
    forward.y = 0;
    forward.normalize();

    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;

    targetPos.current.x = cx + forward.x * distance;
    targetPos.current.y = cy + verticalOffset;
    targetPos.current.z = cz + forward.z * distance;

    // Smooth follow with lerp for comfortable VR (no jarring snaps)
    const g = groupRef.current;
    g.position.x += (targetPos.current.x - g.position.x) * 0.08;
    g.position.y += (targetPos.current.y - g.position.y) * 0.08;
    g.position.z += (targetPos.current.z - g.position.z) * 0.08;

    // Face the camera (billboard)
    g.lookAt(camera.position.x, g.position.y, camera.position.z);
  });

  // Only render in VR
  if (!isVR || !visible) return null;

  return (
    <group ref={groupRef} position={position ?? [0, 0, 0]}>
      <Html
        center
        transform
        occlude={false}
        zIndexRange={zIndexRange}
        className={className}
        style={{
          width: `${width}px`,
          pointerEvents: 'auto',
        }}
        distanceFactor={1.2}
      >
        <div
          style={{
            background: 'rgba(10, 10, 10, 0.92)',
            borderRadius: '12px',
            border: '2px solid rgba(255, 23, 68, 0.6)',
            padding: '16px',
            color: '#E0E0E0',
            fontFamily: 'Bangers, sans-serif',
            fontSize: '18px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}
