import ReactThreeTestRenderer from '@react-three/test-renderer';
import {CabinetBurst} from '../CabinetBurst';

// CabinetBurst uses useThree() which needs the R3F canvas context.
// ReactThreeTestRenderer provides that context automatically.

const DEFAULT_PROPS = {
  cabinetId: 'cabinet-lower-left',
  position: [-4.5, 0.5, -3.0] as [number, number, number],
  doorHinge: [-4.2, 0.5, -3.0] as [number, number, number],
  active: false,
  onBurstComplete: jest.fn(),
};

describe('CabinetBurst', () => {
  it('renders without crashing when inactive', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CabinetBurst {...DEFAULT_PROPS} />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('door starts closed (rotation near 0) when inactive', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetBurst {...DEFAULT_PROPS} active={false} />,
    );
    // Walk scene to find groups — door hinge group should have Y rotation near 0
    const groups: any[] = [];
    function findGroups(node: any) {
      if (node.instance?.type === 'Group') groups.push(node);
      if (node.children) {
        for (const child of node.children) findGroups(child);
      }
    }
    findGroups(renderer.scene.children[0]);
    // At least one group must exist (the hinge group)
    expect(groups.length).toBeGreaterThan(0);
    // The hinge group (innermost) rotation.y should be ~0 initially
    const hinge = groups.find(g => Math.abs(g.instance.rotation.y) < 0.01);
    expect(hinge).toBeDefined();
  });

  it('renders door mesh geometry', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CabinetBurst {...DEFAULT_PROPS} />);
    const meshes: any[] = [];
    function findMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshes.push(node);
      if (node.children) {
        for (const child of node.children) findMeshes(child);
      }
    }
    findMeshes(renderer.scene.children[0]);
    // At least door mesh + particle meshes
    expect(meshes.length).toBeGreaterThan(0);
  });

  it('renders particle meshes pre-allocated', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CabinetBurst {...DEFAULT_PROPS} />);
    const meshes: any[] = [];
    function findMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshes.push(node);
      if (node.children) {
        for (const child of node.children) findMeshes(child);
      }
    }
    findMeshes(renderer.scene.children[0]);
    // 1 door mesh + 20 particle meshes = 21
    expect(meshes.length).toBe(21);
  });

  it('positions cabinet group at provided position', async () => {
    const pos: [number, number, number] = [1, 2, 3];
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetBurst {...DEFAULT_PROPS} position={pos} doorHinge={[1.3, 2, 3]} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(1, 1);
    expect(root.instance.position.y).toBeCloseTo(2, 1);
    expect(root.instance.position.z).toBeCloseTo(3, 1);
  });

  it('calls onBurstComplete after burst animation when active becomes true', async () => {
    const onBurstComplete = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetBurst {...DEFAULT_PROPS} active={false} onBurstComplete={onBurstComplete} />,
    );

    // Activate burst
    await ReactThreeTestRenderer.act(async () => {
      renderer.update(
        <CabinetBurst {...DEFAULT_PROPS} active={true} onBurstComplete={onBurstComplete} />,
      );
    });

    // Advance frames enough to complete the 0.3s burst (each advanceFrames step is ~16ms)
    // 30 frames × ~16ms = ~480ms > 300ms burst duration
    await ReactThreeTestRenderer.act(async () => {
      for (let i = 0; i < 30; i++) {
        renderer.advanceFrames(1, 1 / 60);
      }
    });

    expect(onBurstComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onBurstComplete when inactive', async () => {
    const onBurstComplete = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetBurst {...DEFAULT_PROPS} active={false} onBurstComplete={onBurstComplete} />,
    );

    await ReactThreeTestRenderer.act(async () => {
      for (let i = 0; i < 30; i++) {
        renderer.advanceFrames(1, 1 / 60);
      }
    });

    expect(onBurstComplete).not.toHaveBeenCalled();
  });

  it('has no Babylon.js imports', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CabinetBurst.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('imports THREE from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CabinetBurst.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('uses useFrame for animation (not setInterval)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CabinetBurst.tsx'), 'utf8');
    expect(source).toContain('useFrame');
    expect(source).not.toContain('setInterval');
  });
});
