import {render} from '@testing-library/react';
import {BlowoutHUD} from '../BlowoutHUD';

describe('BlowoutHUD', () => {
  it('renders without crashing', () => {
    const {container} = render(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays pressure indicator', () => {
    const {container} = render(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    expect(container.textContent).toContain('PRESSURE');
  });

  it('displays tie status', () => {
    const {container} = render(<BlowoutHUD pressure={50} leftTied={true} rightTied={false} />);
    expect(container.textContent).toContain('LEFT');
    expect(container.textContent).toContain('RIGHT');
  });

  it('shows tied status correctly', () => {
    const {container} = render(<BlowoutHUD pressure={50} leftTied={true} rightTied={true} />);
    expect(container.textContent).toContain('TIED');
  });

  it('shows untied status correctly', () => {
    const {container} = render(<BlowoutHUD pressure={50} leftTied={false} rightTied={false} />);
    expect(container.textContent).toContain('OPEN');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../BlowoutHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
