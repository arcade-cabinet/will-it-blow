import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GlistenLight} from '../GlistenLight';

describe('GlistenLight', () => {
  it('renders a point light', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GlistenLight panY={0.12} />);
    expect(renderer.scene.children.length).toBe(1);
  });
});
