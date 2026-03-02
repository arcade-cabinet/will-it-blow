import ReactThreeTestRenderer from '@react-three/test-renderer';
import {BurnerRing} from '../BurnerRing';

describe('BurnerRing', () => {
  it('renders a single mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(<BurnerRing />);
    expect(renderer.scene.children.length).toBe(1);
  });

  it('accepts custom position', async () => {
    const renderer = await ReactThreeTestRenderer.create(<BurnerRing position={[1, 2, 3]} />);
    const mesh = renderer.scene.children[0];
    expect(mesh.instance.position.x).toBe(1);
    expect(mesh.instance.position.y).toBe(2);
    expect(mesh.instance.position.z).toBe(3);
  });
});
