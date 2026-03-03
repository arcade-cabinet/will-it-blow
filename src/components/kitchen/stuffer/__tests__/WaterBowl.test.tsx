import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three/webgpu';
import {WaterBowl} from '../WaterBowl';

describe('WaterBowl', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<WaterBowl />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('uses LatheGeometry for the bowl (NOT sphereGeometry)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<WaterBowl />);
    const root = renderer.scene.children[0]; // group
    // First child mesh is the bowl shell
    const bowlMesh = root.children[0];
    expect(bowlMesh.instance.geometry).toBeInstanceOf(THREE.LatheGeometry);
  });

  it('accepts a custom position', async () => {
    const pos: [number, number, number] = [1, 2, 3];
    const renderer = await ReactThreeTestRenderer.create(<WaterBowl position={pos} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });
});
