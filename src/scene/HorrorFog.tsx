/**
 * @module HorrorFog
 * Distance-based fog for sealed basement atmosphere.
 *
 * Uses the Filament fog patch (setFogOptions) to create
 * a dark, oppressive haze that obscures the far walls.
 * Color: near-black with a slight sickly green tint.
 *
 * Requires: patches/react-native-filament.patch applied via pnpm.
 */

import {useEffect} from 'react';
import {useFilamentContext} from 'react-native-filament';

// Dark basement fog — near-black with sickly green undertone
const FOG_COLOR = {r: 0.02, g: 0.03, b: 0.02};
const FOG_DISTANCE = 4; // Starts close — claustrophobic
const FOG_MAX_OPACITY = 0.85; // Thick but not total blackout

export function HorrorFog() {
  const {view} = useFilamentContext();

  useEffect(() => {
    try {
      view.setFogOptions({
        enabled: 1,
        distance: FOG_DISTANCE,
        maximumOpacity: FOG_MAX_OPACITY,
        height: 0,
        heightFalloff: 0,
        fogColorFromIbl: 0,
        colorR: FOG_COLOR.r,
        colorG: FOG_COLOR.g,
        colorB: FOG_COLOR.b,
      });
    } catch {
      // Patch not applied — fog is cosmetic, not critical
    }
  }, [view]);

  return null;
}
