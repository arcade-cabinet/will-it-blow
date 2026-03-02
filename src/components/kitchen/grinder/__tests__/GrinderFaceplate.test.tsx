import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderFaceplate} from '../GrinderFaceplate';

describe('GrinderFaceplate', () => {
  it('renders a single mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderFaceplate counterY={0} isOn={false} />,
    );
    expect(renderer.scene.children.length).toBe(1);
  });
});
