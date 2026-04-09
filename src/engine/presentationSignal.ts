/**
 * @module engine/presentationSignal
 * Shared signal bridge for PresentationFlow completion.
 *
 * Extracted from GameScene.tsx so that App.tsx (main bundle) can
 * register a callback without statically importing GameScene (lazy
 * chunk). Both modules import this tiny file instead.
 */

/** Module-level callback slot. */
let presentationCompleteCallback: (() => void) | null = null;

/** Register the completion callback — called by App. */
export function setPresentationCompleteCallback(cb: (() => void) | null): void {
  presentationCompleteCallback = cb;
}

/** Fire the callback (once) — called by GameScene / PresentationFlow. */
export function notifyPresentationComplete(): void {
  if (presentationCompleteCallback) {
    presentationCompleteCallback();
    presentationCompleteCallback = null;
  }
}
