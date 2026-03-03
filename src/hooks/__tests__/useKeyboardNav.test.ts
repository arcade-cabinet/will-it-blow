/**
 * @module useKeyboardNav.test
 * Tests for the useKeyboardNav hook.
 *
 * Validates:
 * - Module exports useKeyboardNav as a function
 * - Source contains keydown event listener setup
 * - Source handles Escape, Enter, Space keys
 * - Source checks Platform.OS for web-only behavior
 */

import {describe, expect, it} from '@jest/globals';

describe('useKeyboardNav', () => {
  it('exports useKeyboardNav as a named function', () => {
    const mod = require('../useKeyboardNav');
    expect(typeof mod.useKeyboardNav).toBe('function');
  });

  it('listens for keydown events on web (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useKeyboardNav.ts'), 'utf8');
    expect(source).toContain('keydown');
    expect(source).toContain('addEventListener');
    expect(source).toContain('removeEventListener');
  });

  it('handles Escape key (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useKeyboardNav.ts'), 'utf8');
    expect(source).toContain("'Escape'");
    expect(source).toContain('onEscape');
  });

  it('handles Enter and Space keys for activation (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useKeyboardNav.ts'), 'utf8');
    expect(source).toContain("'Enter'");
    expect(source).toContain("' '");
  });

  it('checks for web platform before attaching listeners (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useKeyboardNav.ts'), 'utf8');
    expect(source).toContain("Platform.OS !== 'web'");
  });

  it('supports enabled parameter to conditionally attach listeners (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useKeyboardNav.ts'), 'utf8');
    expect(source).toContain('enabled');
  });
});
