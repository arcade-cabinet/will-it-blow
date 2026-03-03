import {useEffect, useState} from 'react';
import {Dimensions, Platform} from 'react-native';

export interface OrientationInfo {
  isLandscape: boolean;
  isPortrait: boolean;
  width: number;
  height: number;
}

function getOrientation(): OrientationInfo {
  const {width, height} = Dimensions.get('window');
  return {
    isLandscape: width > height,
    isPortrait: width <= height,
    width,
    height,
  };
}

/**
 * Reactive orientation and screen-size hook.
 *
 * On native: listens to RN Dimensions change events.
 * On web: also listens to `matchMedia('(orientation: portrait)')` for
 * instant orientation updates (some browsers fire this before the
 * Dimensions event).
 */
export function useOrientation(): OrientationInfo {
  const [orientation, setOrientation] = useState<OrientationInfo>(getOrientation);

  useEffect(() => {
    const update = () => setOrientation(getOrientation());

    // React Native Dimensions listener (works on all platforms)
    const subscription = Dimensions.addEventListener('change', update);

    // Web: matchMedia fires earlier than Dimensions on some browsers
    let mql: MediaQueryList | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      mql = window.matchMedia('(orientation: portrait)');
      mql.addEventListener('change', update);
    }

    return () => {
      subscription.remove();
      mql?.removeEventListener('change', update);
    };
  }, []);

  return orientation;
}
