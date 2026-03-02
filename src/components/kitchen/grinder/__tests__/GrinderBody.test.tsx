import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderBody} from '../GrinderBody';

describe('GrinderBody', () => {
  it('renders motor, extruder, and chute (3 meshes)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GrinderBody counterY={0} isOn={false} />);
    // Fragment with 3 direct mesh children
    expect(renderer.scene.children.length).toBe(3);
  });

  it('renders when grinder is on', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GrinderBody counterY={2} isOn={true} />);
    expect(renderer.scene.children.length).toBe(3);
  });
});
