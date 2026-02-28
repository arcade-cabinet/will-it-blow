import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderStation} from '../GrinderStation';

describe('GrinderStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the grinder position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(0);
    expect(root.instance.position.y).toBe(0);
    expect(root.instance.position.z).toBe(-5);
  });

  it('renders counter, body, hopper, spout, crank arm, and knob meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    const root = renderer.scene.children[0];
    // Counter (1) + grinder body (1) + hopper (1) + spout (1) + crank group (1) + meat chunks group (1) + output particles group (1) + splatter group (1) = 8+
    expect(root.children.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at mid-progress without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={50} crankAngle={Math.PI * 4} isSplattering={false} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders during splatter without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={30} crankAngle={Math.PI * 2} isSplattering={true} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at full progress without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={100} crankAngle={Math.PI * 8} isSplattering={false} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('has no Babylon.js imports', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrinderStation.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });
});
