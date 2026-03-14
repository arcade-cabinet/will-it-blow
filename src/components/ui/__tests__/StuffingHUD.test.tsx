import renderer, {act} from 'react-test-renderer';
import {StuffingHUD} from '../StuffingHUD';

describe('StuffingHUD', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StuffingHUD pressure={40} fillLevel={60} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays pressure gauge', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StuffingHUD pressure={40} fillLevel={60} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('PRESSURE');
  });

  it('displays fill bar', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StuffingHUD pressure={40} fillLevel={60} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('FILL');
  });

  it('shows warning at high pressure', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StuffingHUD pressure={90} fillLevel={60} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('DANGER');
  });

  it('does not show warning at low pressure', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StuffingHUD pressure={30} fillLevel={60} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('DANGER');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../StuffingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
