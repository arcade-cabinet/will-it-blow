/**
 * @module useXRMode
 * Shared hooks for detecting the current XR session mode.
 *
 * - `useXRMode()` reads the live XR session from `@react-three/xr`.
 *   Must be called inside the `<XR>` provider (i.e. inside the R3F Canvas).
 * - `useXRModeFromStore()` reads the store flags for use outside Canvas
 *   (e.g. SettingsScreen).
 */

import {useXR} from '@react-three/xr';
import {Platform} from 'react-native';
import {useGameStore} from '../store/gameStore';

export interface XRModeState {
  /** True when an immersive-vr session is active */
  isVR: boolean;
  /** True when an immersive-ar session is active */
  isAR: boolean;
  /** True when running on desktop (keyboard + mouse) without XR */
  isDesktop: boolean;
  /** True when running on a mobile/touch device without XR */
  isMobile: boolean;
}

/**
 * Detect whether the current device is touch-primary.
 * Used as the fallback when no XR session is active.
 */
function isTouchPrimary(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0) {
    return true;
  }
  return false;
}

/**
 * Detect the current XR session mode from the live XR runtime.
 *
 * When an XR session is active, `useXR(xr => xr.mode)` returns
 * `'immersive-vr'` or `'immersive-ar'`. When no session is active
 * it returns `null`, and we fall back to platform detection.
 *
 * Must be called inside the `<XR>` provider tree (inside Canvas).
 */
export function useXRMode(): XRModeState {
  const xrMode = useXR(xr => xr.mode);

  const isVR = xrMode === 'immersive-vr';
  const isAR = xrMode === 'immersive-ar';
  const touch = isTouchPrimary();

  return {
    isVR,
    isAR,
    isDesktop: !isVR && !isAR && !touch,
    isMobile: !isVR && !isAR && touch,
  };
}

/**
 * Detect XR mode from store flags (for components outside the Canvas).
 *
 * This reads `xrEnabled` from the Zustand store rather than the live
 * XR session. Useful for SettingsScreen and other 2D UI that lives
 * outside the R3F Canvas tree.
 */
export function useXRModeFromStore(): XRModeState {
  const xrEnabled = useGameStore(s => s.xrEnabled);
  const arEnabled = useGameStore(s => s.arEnabled);

  const touch = isTouchPrimary();

  return {
    isVR: xrEnabled && !arEnabled,
    isAR: arEnabled,
    isDesktop: !xrEnabled && !arEnabled && !touch,
    isMobile: !xrEnabled && !arEnabled && touch,
  };
}
