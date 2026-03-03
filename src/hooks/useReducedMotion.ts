/**
 * @module useReducedMotion
 * Detects the user's `prefers-reduced-motion` media query preference.
 *
 * Returns `true` when the OS/browser is set to reduce motion, allowing
 * components to disable or simplify animations (loading screen springs,
 * HUD transitions, sign swinging, etc.).
 *
 * Falls back to `false` on platforms that don't support `matchMedia`
 * (e.g., React Native non-web).
 */

import {useEffect, useState} from 'react';
import {Platform} from 'react-native';

/** Returns true when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mql) return;

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
