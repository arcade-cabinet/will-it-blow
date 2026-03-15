import {render} from '@testing-library/react';
import {GrindingHUD} from '../GrindingHUD';

describe('GrindingHUD', () => {
  it('renders without crashing', () => {
    const {container} = render(<GrindingHUD speed={50} progress={30} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays speed zone indicator', () => {
    const {container} = render(<GrindingHUD speed={50} progress={30} />);
    expect(container.textContent).toContain('SPEED');
  });

  it('displays progress bar', () => {
    const {container} = render(<GrindingHUD speed={50} progress={75} />);
    expect(container.textContent).toContain('PROGRESS');
  });

  it('shows slow zone for low speed', () => {
    const {container} = render(<GrindingHUD speed={15} progress={30} />);
    expect(container.textContent).toContain('SLOW');
  });

  it('shows good zone for medium speed', () => {
    const {container} = render(<GrindingHUD speed={50} progress={30} />);
    expect(container.textContent).toContain('GOOD');
  });

  it('shows fast zone for high speed', () => {
    const {container} = render(<GrindingHUD speed={90} progress={30} />);
    expect(container.textContent).toContain('FAST');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrindingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
