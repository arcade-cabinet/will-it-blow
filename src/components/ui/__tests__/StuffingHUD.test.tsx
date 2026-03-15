import {render} from '@testing-library/react';
import {StuffingHUD} from '../StuffingHUD';

describe('StuffingHUD', () => {
  it('renders without crashing', () => {
    const {container} = render(<StuffingHUD pressure={40} fillLevel={60} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays pressure gauge', () => {
    const {container} = render(<StuffingHUD pressure={40} fillLevel={60} />);
    expect(container.textContent).toContain('PRESSURE');
  });

  it('displays fill bar', () => {
    const {container} = render(<StuffingHUD pressure={40} fillLevel={60} />);
    expect(container.textContent).toContain('FILL');
  });

  it('shows warning at high pressure', () => {
    const {container} = render(<StuffingHUD pressure={90} fillLevel={60} />);
    expect(container.textContent).toContain('DANGER');
  });

  it('does not show warning at low pressure', () => {
    const {container} = render(<StuffingHUD pressure={30} fillLevel={60} />);
    expect(container.textContent).not.toContain('DANGER');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../StuffingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
