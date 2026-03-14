/**
 * @module Lighting
 * Horror kitchen lighting — dim ambient + positioned point lights.
 *
 * The kitchen is a sealed basement. Lighting creates claustrophobic
 * atmosphere: single overhead fluorescent (flickering), dim red emergency
 * light near the door, warm under-counter glow near stations.
 *
 * Filament's DefaultLight provides indirect illumination. Point lights
 * will be added as Entity lights once we have transform access in the
 * render callback for flicker animation.
 */

import {DefaultLight} from 'react-native-filament';

/**
 * Kitchen lighting setup. DefaultLight provides base illumination.
 *
 * Future: Add positioned point lights with flicker animation:
 * - Center ceiling fluorescent: [0, 2.9, 0], intensity 500, warm white
 * - Emergency red: [-2.5, 2.5, 3.5], intensity 100, #FF1744
 * - Under-counter glow: [1, 0.3, -1], intensity 50, #FFEEDD
 */
export function KitchenLighting() {
  return <DefaultLight />;
}
