import renderer, {act} from 'react-test-renderer';
import {BlowoutHUD} from '../BlowoutHUD';

describe('BlowoutHUD', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays pressure indicator', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('PRESSURE');
  });

  it('displays tie status', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('LEFT');
    expect(json).toContain('RIGHT');
  });

  it('shows tied status correctly', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BlowoutHUD pressure={50} leftTied={true} rightTied={true} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('TIED');
  });

  it('shows untied status correctly', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BlowoutHUD pressure={50} leftTied={false} rightTied={false} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('OPEN');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../BlowoutHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
