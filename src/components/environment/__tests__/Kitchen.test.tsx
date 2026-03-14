/**
 * Source-analysis tests for Kitchen.tsx.
 *
 * Uses fs.readFileSync to inspect source patterns rather than
 * @react-three/test-renderer (not installed in this project).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_PATH = path.resolve(__dirname, '../Kitchen.tsx');
const source = fs.readFileSync(SRC_PATH, 'utf8');

describe('Kitchen', () => {
  it('exports Kitchen as a named function component', () => {
    expect(source).toContain('export function Kitchen');
  });

  it('includes ambient light', () => {
    expect(source).toContain('<ambientLight');
  });

  it('includes hemisphere light', () => {
    expect(source).toContain('<hemisphereLight');
  });

  it('includes point lights', () => {
    expect(source).toContain('<pointLight');
  });

  it('accepts custom position prop', () => {
    expect(source).toContain('position');
    expect(source).toContain('[number, number, number]');
  });

  it('uses useGLTF for model loading', () => {
    expect(source).toContain('useGLTF');
  });
});
