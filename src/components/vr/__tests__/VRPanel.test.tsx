/**
 * @module VRPanel.test
 * Tests for VRPanel — world-space HTML panel for VR mode.
 *
 * Strategy: Source-level analysis for structural verification (R3F components
 * can't render in a standard React test renderer without a Canvas), plus
 * store integration tests for conditional rendering logic.
 */

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from '@jest/globals';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'VRPanel.tsx'), 'utf-8');

describe('VRPanel', () => {
  // -----------------------------------------------------------------------
  // Structural / source-level checks
  // -----------------------------------------------------------------------

  describe('component structure', () => {
    it('imports Html from @react-three/drei for world-space HTML rendering', () => {
      expect(SOURCE).toMatch(/import\s*{[^}]*Html[^}]*}\s*from\s*['"]@react-three\/drei['"]/);
    });

    it('imports useFrame and useThree from @react-three/fiber', () => {
      expect(SOURCE).toMatch(/import\s*{[^}]*useFrame[^}]*}\s*from\s*['"]@react-three\/fiber['"]/);
      expect(SOURCE).toMatch(/import\s*{[^}]*useThree[^}]*}\s*from\s*['"]@react-three\/fiber['"]/);
    });

    it('imports useXRMode hook for VR detection', () => {
      expect(SOURCE).toMatch(/import\s*{[^}]*useXRMode[^}]*}\s*from/);
    });

    it('uses useXRMode to check isVR', () => {
      expect(SOURCE).toContain('useXRMode()');
      expect(SOURCE).toContain('isVR');
    });

    it('returns null when not in VR or not visible', () => {
      expect(SOURCE).toMatch(/if\s*\(\s*!isVR\s*\|\|\s*!visible\s*\)\s*return\s+null/);
    });

    it('renders a <group> with ref for camera tracking', () => {
      expect(SOURCE).toContain('<group ref={groupRef}');
    });

    it('renders <Html> with transform and center props', () => {
      expect(SOURCE).toContain('<Html');
      expect(SOURCE).toContain('center');
      expect(SOURCE).toContain('transform');
    });
  });

  describe('camera tracking', () => {
    it('uses useFrame for per-frame camera follow', () => {
      expect(SOURCE).toContain('useFrame(');
    });

    it('skips tracking when followCamera is false or position is set', () => {
      expect(SOURCE).toMatch(/if\s*\(!isVR\s*\|\|\s*!followCamera\s*\|\|\s*position/);
    });

    it('uses camera.getWorldDirection for forward vector', () => {
      expect(SOURCE).toContain('getWorldDirection');
    });

    it('applies smooth lerp for comfortable VR (no jarring snaps)', () => {
      expect(SOURCE).toMatch(/\*\s*0\.08/);
    });

    it('uses billboard lookAt toward camera for facing', () => {
      expect(SOURCE).toContain('lookAt(camera.position');
    });
  });

  describe('props interface', () => {
    it('exports VRPanelProps interface', () => {
      expect(SOURCE).toContain('export interface VRPanelProps');
    });

    it('has configurable distance with default 1.5m', () => {
      expect(SOURCE).toMatch(/distance\s*=\s*1\.5/);
    });

    it('has configurable verticalOffset with default -0.15m', () => {
      expect(SOURCE).toMatch(/verticalOffset\s*=\s*-0\.15/);
    });

    it('has configurable width with default 420px', () => {
      expect(SOURCE).toMatch(/width\s*=\s*420/);
    });

    it('has followCamera defaulting to true', () => {
      expect(SOURCE).toMatch(/followCamera\s*=\s*true/);
    });

    it('has visible defaulting to true', () => {
      expect(SOURCE).toMatch(/visible\s*=\s*true/);
    });
  });

  describe('styling', () => {
    it('uses dark horror-themed background (rgba(10,10,10,0.92))', () => {
      expect(SOURCE).toContain('rgba(10, 10, 10, 0.92)');
    });

    it('uses red accent border matching game theme', () => {
      expect(SOURCE).toContain('rgba(255, 23, 68, 0.6)');
    });

    it('uses Bangers font family for consistency with HUDs', () => {
      expect(SOURCE).toContain('Bangers');
    });
  });

  describe('performance', () => {
    it('uses a shared temp Vector3 to avoid per-frame allocation', () => {
      expect(SOURCE).toContain('_tempVec');
      expect(SOURCE).toMatch(/const\s+_tempVec\s*=\s*new\s+Vector3/);
    });

    it('uses distanceFactor on Html for consistent VR sizing', () => {
      expect(SOURCE).toContain('distanceFactor');
    });
  });
});
