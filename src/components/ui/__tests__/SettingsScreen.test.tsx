import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {SettingsScreen} from '../SettingsScreen';

const defaultProps = {
  sfxVolume: 80,
  musicVolume: 70,
  hapticsEnabled: true,
  onSfxChange: vi.fn(),
  onMusicChange: vi.fn(),
  onHapticsToggle: vi.fn(),
  onBack: vi.fn(),
};

describe('SettingsScreen', () => {
  it('renders without crashing', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays SETTINGS title', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.textContent).toContain('SETTINGS');
  });

  it('displays SFX volume', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.textContent).toContain('SFX');
  });

  it('displays Music volume', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.textContent).toContain('MUSIC');
  });

  it('displays haptics toggle', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.textContent).toContain('HAPTICS');
  });

  it('displays back button', () => {
    const {container} = render(<SettingsScreen {...defaultProps} />);
    expect(container.textContent).toContain('BACK');
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = vi.fn();
    render(<SettingsScreen {...defaultProps} onBack={onBack} />);
    const backButton = screen.getByLabelText('Back to main menu');
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('has accessibility features', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../SettingsScreen.tsx'),
      'utf8',
    );
    // Web HTML uses semantic elements and ARIA roles instead of RN accessibilityRole
    expect(source).toContain('<h2');          // implicit heading role
    expect(source).toContain('<button');      // implicit button role
    expect(source).toContain('role="switch"');
    expect(source).toContain('aria-label=');  // adjustable sliders use aria-label
  });
});
