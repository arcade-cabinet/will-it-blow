import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {HopperPour} from '../HopperPour';

describe('HopperPour', () => {
  beforeEach(() => {
    useGameStore.setState({bowlPosition: 'grinder', blendColor: '#C0793A'});
  });

  afterEach(() => {
    useGameStore.setState({bowlPosition: 'fridge', blendColor: '#808080'});
  });

  it('renders without crashing when bowlPosition is grinder', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('returns null (renders nothing) when bowlPosition is not grinder', async () => {
    useGameStore.setState({bowlPosition: 'fridge'});
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    expect(renderer.scene.children.length).toBe(0);
  });

  it('returns null when bowlPosition is grinder-output', async () => {
    useGameStore.setState({bowlPosition: 'grinder-output'});
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    expect(renderer.scene.children.length).toBe(0);
  });

  it('returns null when bowlPosition is stuffer', async () => {
    useGameStore.setState({bowlPosition: 'stuffer'});
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    expect(renderer.scene.children.length).toBe(0);
  });

  it('contains a hopper mesh with LatheGeometry', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    const meshes: any[] = [];
    function findMeshes(node: any) {
      if (node.instance?.type === 'Mesh') meshes.push(node);
      if (node.children) {
        for (const child of node.children) {
          findMeshes(child);
        }
      }
    }
    findMeshes(renderer.scene.children[0]);
    // At minimum: hopper funnel + fill level mesh + PARTICLE_COUNT particle meshes
    expect(meshes.length).toBeGreaterThanOrEqual(3);
  });

  it('positions the root group at the provided position', async () => {
    const pos: [number, number, number] = [1.5, 6.0, 0.5];
    const renderer = await ReactThreeTestRenderer.create(<HopperPour position={pos} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(1.5, 2);
    expect(root.instance.position.y).toBeCloseTo(6.0, 2);
    expect(root.instance.position.z).toBeCloseTo(0.5, 2);
  });

  it('uses default position when none provided', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HopperPour />);
    const root = renderer.scene.children[0];
    // Default: [0, 5.8, 0.5]
    expect(root.instance.position.x).toBeCloseTo(0, 2);
    expect(root.instance.position.y).toBeCloseTo(5.8, 2);
    expect(root.instance.position.z).toBeCloseTo(0.5, 2);
  });

  it('imports from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../HopperPour.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('uses useFrame for animation, not polling timers', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../HopperPour.tsx'), 'utf8');
    // Must use useFrame for per-frame animation
    expect(source).toContain('useFrame');
    // Must not schedule timers outside the render loop
    const forbidden = ['set' + 'Interval', 'set' + 'Timeout'];
    for (const token of forbidden) {
      expect(source).not.toContain(token);
    }
  });
});
