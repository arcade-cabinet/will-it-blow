import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrinderSwitch} from '../GrinderSwitch';

describe('GrinderSwitch', () => {
  it('renders switch body and notch (2 meshes)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderSwitch counterY={0} isOn={false} />,
    );
    // Fragment with 2 mesh children
    expect(renderer.scene.children.length).toBe(2);
  });

  it('accepts onClick handler', async () => {
    const onClick = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderSwitch counterY={0} isOn={true} onClick={onClick} />,
    );
    expect(renderer.scene.children.length).toBe(2);
  });
});
