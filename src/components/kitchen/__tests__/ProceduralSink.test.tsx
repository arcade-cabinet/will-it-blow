import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../ProceduralSink.tsx'), 'utf8');

describe('ProceduralSink', () => {
  it('imports THREE from three/webgpu', () => {
    expect(SOURCE).toContain("from 'three/webgpu'");
  });

  it('uses useFrame for animation', () => {
    expect(SOURCE).toContain('useFrame');
  });

  it('defines LatheGeometry for the basin', () => {
    expect(SOURCE).toContain('LatheGeometry');
  });

  it('defines CylinderGeometry for the faucet', () => {
    expect(SOURCE).toContain('CylinderGeometry');
  });

  it('defines torusGeometry for tap handles', () => {
    expect(SOURCE).toContain('torusGeometry');
  });

  it('has at least 3 cylinder segments for faucet', () => {
    // Faucet vertical riser + elbow + horizontal spout
    const cylinderMatches = SOURCE.match(/cylinderGeometry/gi);
    expect(cylinderMatches).not.toBeNull();
    expect(cylinderMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it('uses TapHandle component for hot and cold taps', () => {
    // Two TapHandle instances — hot (red) and cold (blue)
    const tapMatches = SOURCE.match(/TapHandle/g);
    expect(tapMatches).not.toBeNull();
    expect(tapMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts an onItemWashed callback prop', () => {
    expect(SOURCE).toContain('onItemWashed');
  });

  it('uses chrome material constants (0.9 metalness, 0.1 roughness)', () => {
    expect(SOURCE).toContain('CHROME_METALNESS = 0.9');
    expect(SOURCE).toContain('CHROME_ROUGHNESS = 0.1');
  });

  it('exports ProceduralSink component', () => {
    expect(SOURCE).toMatch(/export\s+function\s+ProceduralSink/);
  });
});
