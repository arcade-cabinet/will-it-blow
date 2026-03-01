import ReactThreeTestRenderer from '@react-three/test-renderer';
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
import {StoveStation, sausageColor} from '../StoveStation';

const targets = resolveTargets(DEFAULT_ROOM);

describe('StoveStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={70} heatLevel={0} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the resolved stove target', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={70} heatLevel={0} />,
    );
    const root = renderer.scene.children[0];
    const [ex, ey, ez] = targets.stove.position;
    expect(root.instance.position.x).toBeCloseTo(ex, 1);
    expect(root.instance.position.y).toBeCloseTo(ey, 1);
    expect(root.instance.position.z).toBeCloseTo(ez, 1);
  });

  it('uses custom position when provided', async () => {
    const custom: [number, number, number] = [5, 6, 7];
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={custom} temperature={70} heatLevel={0} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(5);
    expect(root.instance.position.y).toBe(6);
    expect(root.instance.position.z).toBe(7);
  });

  it('renders stove body, top, burner, pan, sausage, and thermometer meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={70} heatLevel={0} />,
    );
    const root = renderer.scene.children[0];
    // Burner + pan + handle + sausage + 2 caps + thermo tube + fill + bulb = 10+ minimum
    expect(root.children.length).toBeGreaterThanOrEqual(10);
  });

  it('renders at cooking temperature without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={250} heatLevel={0.7} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at high heat without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={200} heatLevel={1.0} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at overheating temperature without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StoveStation position={targets.stove.position} temperature={400} heatLevel={0.9} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../StoveStation.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('imports from @react-three/rapier and gates on Platform.OS', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../StoveStation.tsx'), 'utf8');
    expect(source).toContain('@react-three/rapier');
    expect(source).toContain('Platform.OS');
  });

  it('uses RigidBody for the sausage (web path)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../StoveStation.tsx'), 'utf8');
    expect(source).toContain('RigidBody');
    expect(source).toContain('CapsuleCollider');
    expect(source).toContain('type="dynamic"');
  });
});

describe('sausageColor', () => {
  it('returns pinkish at low temperature', () => {
    const [r, g, _b] = sausageColor(70);
    expect(r).toBeGreaterThan(0.7); // Pinkish
    expect(g).toBeGreaterThan(0.5);
  });

  it('returns brown at medium-high temperature', () => {
    const [r, g, _b] = sausageColor(160);
    expect(r).toBeGreaterThan(g); // Brownish
    expect(r).toBeLessThan(0.8);
  });

  it('returns dark/black at very high temperature', () => {
    const [r, g, _b] = sausageColor(200);
    expect(r).toBeLessThan(0.3); // Dark/burnt
    expect(g).toBeLessThan(0.3);
  });

  it('interpolates smoothly (no NaN)', () => {
    for (let t = 50; t <= 250; t += 10) {
      const [r, g, b] = sausageColor(t);
      expect(Number.isNaN(r)).toBe(false);
      expect(Number.isNaN(g)).toBe(false);
      expect(Number.isNaN(b)).toBe(false);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
