/**
 * @module useKeyboardNav
 * Shared keyboard navigation hook for web UI screens.
 *
 * Provides:
 * - Tab/Shift+Tab cycling through interactive elements (via browser default)
 * - Enter/Space activates the focused element's onPress
 * - Escape triggers the provided onEscape callback (close modal, return to menu)
 *
 * Attaches a global keydown listener on web only. No-ops on native.
 *
 * @param options.onEscape - Called when Escape is pressed
 */

import {useEffect} from 'react';
import {Platform} from 'react-native';

interface UseKeyboardNavOptions {
  /** Called when the Escape key is pressed. */
  onEscape?: () => void;
  /** Whether the keyboard nav listener is active. Defaults to true. */
  enabled?: boolean;
}

export function useKeyboardNav({onEscape, enabled = true}: UseKeyboardNavOptions = {}) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Enter/Space on focused interactive elements — browser handles natively
      // for <button> elements. React Native Web renders TouchableOpacity as <div>
      // with role="button", so we need to manually trigger click for those.
      if (e.key === 'Enter' || e.key === ' ') {
        const target = document.activeElement;
        if (target && target instanceof HTMLElement) {
          const role = target.getAttribute('role');
          if (role === 'button' || role === 'link' || role === 'menuitem') {
            // Prevent space from scrolling the page
            if (e.key === ' ') {
              e.preventDefault();
            }
            target.click();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
