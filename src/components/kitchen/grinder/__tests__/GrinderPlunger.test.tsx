import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderPlunger} from '../GrinderPlunger';

describe('GrinderPlunger', () => {
  it('renders plunger group with shaft, guard, handle, and hitbox (4 meshes)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GrinderPlunger counterY={0} />);
    const group = renderer.scene.children[0];
    expect(group.children.length).toBe(4);
  });
});
