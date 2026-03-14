/**
 * @module Lighting
 * Horror kitchen lighting — matches R3F original setup:
 * - Directional light from ceiling (sun-like, casts shadows)
 * - Warm point light at center ceiling (main illumination)
 * - Red emergency point light near back wall
 * - Dim under-counter glow
 *
 * R3F original had:
 *   ambientLight intensity=0.4
 *   directionalLight at [0, 2.5, 0] intensity=1.0
 *   pointLight at [0, 2.0, 0] intensity=50 distance=10 color=#ffeedd
 */

import {DefaultLight, Light} from 'react-native-filament';

export function KitchenLighting() {
  return (
    <>
      {/* Indirect/ambient base illumination */}
      <DefaultLight />

      {/* Main overhead — directional from ceiling, casting shadows */}
      <Light
        type="directional"
        intensity={30000}
        colorKelvin={4500}
        direction={[0, -1, -0.2]}
        castShadows={true}
      />

      {/* Center ceiling warm point light — main scene illumination */}
      <Light
        type="point"
        intensity={50000}
        colorKelvin={3200}
        position={[0, 2.5, 0]}
        falloffRadius={12}
      />

      {/* Emergency red light near back wall */}
      <Light
        type="point"
        intensity={8000}
        colorKelvin={1800}
        position={[-2.5, 2.5, -3.5]}
        falloffRadius={5}
      />

      {/* Under-counter warm glow near stations */}
      <Light
        type="point"
        intensity={5000}
        colorKelvin={2700}
        position={[1, 0.5, -2]}
        falloffRadius={4}
      />
    </>
  );
}
