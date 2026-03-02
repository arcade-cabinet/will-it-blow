import ReactThreeTestRenderer from '@react-three/test-renderer';
import {StoveDial} from '../StoveDial';

describe('StoveDial', () => {
  it('renders a single mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(<StoveDial />);
    expect(renderer.scene.children.length).toBe(1);
  });

  it('accepts onClick handler', async () => {
    const onClick = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(<StoveDial onClick={onClick} />);
    expect(renderer.scene.children.length).toBe(1);
  });
});
