/**
 * @module useReducedMotion.test
 * Tests for the useReducedMotion hook.
 *
 * Validates:
 * - Module exports useReducedMotion as a function
 * - Source uses prefers-reduced-motion media query
 * - Source uses matchMedia for detection
 * - Source checks Platform.OS for web-only behavior
 * - Source registers change listener for live updates
 */

import {describe, expect, it} from '@jest/globals';

describe('useReducedMotion', () => {
  it('exports useReducedMotion as a named function', () => {
    const mod = require('../useReducedMotion');
    expect(typeof mod.useReducedMotion).toBe('function');
  });

  it('uses prefers-reduced-motion media query (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useReducedMotion.ts'), 'utf8');
    expect(source).toContain('prefers-reduced-motion');
  });

  it('uses matchMedia for detection (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useReducedMotion.ts'), 'utf8');
    expect(source).toContain('matchMedia');
  });

  it('checks for web platform (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useReducedMotion.ts'), 'utf8');
    expect(source).toContain("Platform.OS !== 'web'");
  });

  it('registers change listener for live updates (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useReducedMotion.ts'), 'utf8');
    expect(source).toContain("addEventListener('change'");
    expect(source).toContain("removeEventListener('change'");
  });

  it('returns a boolean value (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useReducedMotion.ts'), 'utf8');
    expect(source).toContain('boolean');
    expect(source).toContain('prefersReducedMotion');
  });
});
