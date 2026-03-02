import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderTray} from '../GrinderTray';

describe('GrinderTray', () => {
  it('renders a single mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GrinderTray counterY={0} />);
    expect(renderer.scene.children.length).toBe(1);
  });
});
