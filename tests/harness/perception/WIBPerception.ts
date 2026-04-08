/**
 * Test-side perception reader for the Yuka governor.
 *
 * Wraps `window.__WIB_DEBUG__.getPerception()` from `src/debug/perception.ts`.
 * Always returns a frozen `PerceptionSnapshot`. Throws if the debug
 * bridge is not installed (production builds, or a test that
 * forgot to call `initDebugInterface()`).
 *
 * Test code uses this exclusively to read game state. Direct
 * `useGameStore.getState()` access is allowed for SETUP (e.g.
 * `setIntroActive(false)` in `beforeEach`), but the moment the
 * Yuka governor takes over, perception is the only channel.
 */
import type {PerceptionSnapshot} from '../../../src/debug/perception';

export class WIBPerception {
  /** Read a fresh frozen snapshot. */
  observe(): PerceptionSnapshot {
    const debug = window.__WIB_DEBUG__;
    if (!debug) {
      throw new Error(
        'WIBPerception: window.__WIB_DEBUG__ is not installed. ' +
          'Call initDebugInterface() in your test beforeAll().',
      );
    }
    return debug.getPerception();
  }

  /** Convenience: just the current game phase. */
  phase(): PerceptionSnapshot['gamePhase'] {
    return this.observe().gamePhase;
  }

  /** Convenience: list of currently-active station names. */
  activeStations(): readonly string[] {
    return this.observe().activeStations;
  }
}
