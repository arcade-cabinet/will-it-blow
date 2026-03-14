import {vi} from 'vitest';
import renderer, {act} from 'react-test-renderer';
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
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays SETTINGS title', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('SETTINGS');
  });

  it('displays SFX volume', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('SFX');
  });

  it('displays Music volume', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('MUSIC');
  });

  it('displays haptics toggle', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('HAPTICS');
  });

  it('displays back button', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('BACK');
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = vi.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SettingsScreen {...defaultProps} onBack={onBack} />);
    });
    const backButton = tree!.root.findAllByProps({accessibilityLabel: 'Back to main menu'});
    expect(backButton.length).toBeGreaterThan(0);
    act(() => {
      backButton[0].props.onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });

  it('has accessibility features', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../SettingsScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('accessibilityRole="header"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('accessibilityRole="switch"');
    expect(source).toContain('accessibilityRole="adjustable"');
  });
});
