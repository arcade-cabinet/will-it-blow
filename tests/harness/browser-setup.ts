/**
 * Browser-test setup file. Imported by `vitest.config.ts` for the
 * `browser` project so every meso/macro test gets the same CSS the
 * production app does — Tailwind directives, DaisyUI base, custom
 * font + color tokens — without each test having to import
 * `src/index.css` itself.
 */
import '../../src/index.css';

/**
 * Suppress unhandled WASM CompileError rejections from jeep-sqlite.
 *
 * When browser tests render `<App />`, the `usePersistence()` hook
 * triggers the SQLite init chain which loads jeep-sqlite's WASM file.
 * In the Vitest browser-mode server, the .wasm asset isn't served
 * with the correct MIME type, so WebAssembly.instantiate() throws a
 * CompileError that surfaces as an unhandled rejection. The actual
 * tests don't need SQLite (they test UI flow), and all 48 tests pass,
 * but Vitest treats unhandled errors as a test failure.
 *
 * This handler swallows only WASM compile errors so they no longer
 * cause spurious CI failures. Real application errors still propagate.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = String(event.reason?.message ?? event.reason ?? '');
    if (
      msg.includes('WebAssembly.instantiate()') ||
      msg.includes('CompileError') ||
      msg.includes('expected magic word 00 61 73 6d')
    ) {
      event.preventDefault();
    }
  });
}
