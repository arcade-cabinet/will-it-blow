/**
 * Tests for PlaceSetting — table dressing component for the blowout challenge.
 * Uses source-analysis pattern (fs.readFileSync) because PlaceSetting imports
 * three/webgpu which crashes @react-three/test-renderer.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../PlaceSetting.tsx'), 'utf8');

describe('PlaceSetting — source analysis', () => {
  it('imports from three/webgpu', () => {
    expect(source).toContain("from 'three/webgpu'");
  });

  it('exports PlaceSetting component', () => {
    expect(source).toContain('export function PlaceSetting');
  });

  it('accepts position and visible props', () => {
    expect(source).toContain('position');
    expect(source).toContain('visible');
  });

  it('renders named sub-groups for each piece of tableware', () => {
    expect(source).toContain('name="place-setting"');
    expect(source).toContain('name="plate"');
    expect(source).toContain('name="fork"');
    expect(source).toContain('name="knife"');
    expect(source).toContain('name="glass"');
    expect(source).toContain('name="napkin"');
  });

  it('uses procedural geometry (no GLB imports)', () => {
    expect(source).not.toContain('useGLTF');
    expect(source).toContain('LatheGeometry');
    expect(source).toContain('BoxGeometry');
    expect(source).toContain('CylinderGeometry');
  });

  it('returns null when visible is false', () => {
    expect(source).toContain('if (!visible) return null');
  });

  it('defines geometry constants for tableware pieces', () => {
    expect(source).toContain('PLATE_R');
    expect(source).toContain('FORK_');
    expect(source).toContain('KNIFE_');
    expect(source).toContain('GLASS_');
    expect(source).toContain('NAPKIN_');
  });
});
