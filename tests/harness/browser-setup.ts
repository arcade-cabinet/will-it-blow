/**
 * Browser-test setup file. Imported by `vitest.config.ts` for the
 * `browser` project so every meso/macro test gets the same CSS the
 * production app does — Tailwind directives, DaisyUI base, custom
 * font + color tokens — without each test having to import
 * `src/index.css` itself.
 */
import '../../src/index.css';
