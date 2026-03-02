import ReactThreeTestRenderer from '@react-three/test-renderer';
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
import {CookingMechanics} from '../CookingMechanics';

const targets = resolveTargets(DEFAULT_ROOM);

describe('CookingMechanics', () => {
  it('renders without crashing when visible', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={targets.stove.position} counterY={1.05} visible={true} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('returns null when not visible', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={targets.stove.position} counterY={1.05} visible={false} />,
    );
    // When visible=false the component returns null — no children in scene
    expect(renderer.scene.children.length).toBe(0);
  });

  it('renders the root group at the provided position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={targets.stove.position} counterY={1.05} visible={true} />,
    );
    const root = renderer.scene.children[0];
    const [ex, ey, ez] = targets.stove.position;
    expect(root.instance.position.x).toBeCloseTo(ex, 1);
    expect(root.instance.position.y).toBeCloseTo(ey, 1);
    expect(root.instance.position.z).toBeCloseTo(ez, 1);
  });

  it('uses custom position when provided', async () => {
    const custom: [number, number, number] = [3, 1, 5];
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={custom} counterY={1.05} visible={true} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(3);
    expect(root.instance.position.y).toBe(1);
    expect(root.instance.position.z).toBe(5);
  });

  it('renders stove body, burners, dials, and pan meshes (multiple children)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={targets.stove.position} counterY={1.05} visible={true} />,
    );
    const root = renderer.scene.children[0];
    // stove base + stove back + burner BR + burner FL + dial BR + dial FL + pan group + steam Points = 8+
    expect(root.children.length).toBeGreaterThanOrEqual(8);
  });

  it('accepts an onCookComplete callback without error', async () => {
    const mockComplete = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics
        position={targets.stove.position}
        counterY={1.05}
        visible={true}
        onCookComplete={mockComplete}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('imports from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('uses MeatTexture updateCookingAppearance', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('updateCookingAppearance');
  });

  it('uses GreaseSimulation updateGrease', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('updateGrease');
  });
});
