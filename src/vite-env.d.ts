/// <reference types="vite/client" />
import type {PlaytestDebugInterface} from './debug/PlaytestGovernor';

declare module '*.glb' {
  const src: string;
  export default src;
}

declare global {
  interface Window {
    /** Dev-only debug bridge for Playwright E2E tests. Undefined in prod builds. */
    __WIB_DEBUG__?: PlaytestDebugInterface;
    /** Dev-only Rapier teleport hook exposed by PlayerCapsule. */
    __WIB_TELEPORT__?: (x: number, y: number, z: number) => void;
  }
}
