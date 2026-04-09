/**
 * @module DisgustIndicator.test
 * Unit test for the diegetic disgust meter.
 *
 * Full visual testing belongs in browser tests. This verifies the module
 * exports correctly and is importable.
 */
import {describe, expect, it} from 'vitest';
import {DisgustIndicator} from '../DisgustIndicator';

describe('DisgustIndicator', () => {
  it('exports DisgustIndicator as a named export', () => {
    expect(DisgustIndicator).toBeDefined();
    expect(typeof DisgustIndicator).toBe('function');
  });
});
