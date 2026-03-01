import ReactThreeTestRenderer from '@react-three/test-renderer';
import {Platform} from 'react-native';
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
import {GrinderStation} from '../GrinderStation';

const targets = resolveTargets(DEFAULT_ROOM);

describe('GrinderStation', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={0}
        crankAngle={0}
        isSplattering={false}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the resolved grinder target', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={0}
        crankAngle={0}
        isSplattering={false}
      />,
    );
    const root = renderer.scene.children[0];
    const [ex, ey, ez] = targets.grinder.position;
    expect(root.instance.position.x).toBeCloseTo(ex, 1);
    expect(root.instance.position.y).toBeCloseTo(ey, 1);
    expect(root.instance.position.z).toBeCloseTo(ez, 1);
  });

  it('uses custom position when provided', async () => {
    const custom: [number, number, number] = [1, 2, 3];
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation position={custom} grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });

  it('renders counter, body, hopper, spout, crank arm, and knob meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={0}
        crankAngle={0}
        isSplattering={false}
      />,
    );
    const root = renderer.scene.children[0];
    // Grinder body + hopper + spout + crank arm + knob = 5+ minimum
    expect(root.children.length).toBeGreaterThanOrEqual(5);
  });

  it('renders at mid-progress without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={50}
        crankAngle={Math.PI * 4}
        isSplattering={false}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders during splatter without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={30}
        crankAngle={Math.PI * 2}
        isSplattering={true}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at full progress without error', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation
        position={targets.grinder.position}
        grindProgress={100}
        crankAngle={Math.PI * 8}
        isSplattering={false}
      />,
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

  describe('web platform (Rapier physics)', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      (Platform as any).OS = 'web';
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
    });

    it('renders with Rapier rigid bodies on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <GrinderStation
          position={targets.grinder.position}
          grindProgress={0}
          crankAngle={0}
          isSplattering={false}
        />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });

    it('renders physics chunks at mid-progress on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <GrinderStation
          position={targets.grinder.position}
          grindProgress={50}
          crankAngle={Math.PI * 4}
          isSplattering={false}
        />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });

    it('renders splatter physics particles on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <GrinderStation
          position={targets.grinder.position}
          grindProgress={30}
          crankAngle={Math.PI * 2}
          isSplattering={true}
        />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });

    it('renders at full progress with physics on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <GrinderStation
          position={targets.grinder.position}
          grindProgress={100}
          crankAngle={Math.PI * 8}
          isSplattering={false}
        />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });
  });
});
