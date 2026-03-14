import {vi} from 'vitest';
import renderer, {act} from 'react-test-renderer';
import {RoundTransition} from '../RoundTransition';

const defaultProps = {
  roundNumber: 2,
  totalRounds: 5,
  roundScore: 78,
  totalScore: 156,
  onNextRound: vi.fn(),
};

describe('RoundTransition', () => {
  it('renders round number', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} />);
    });
    const container = tree!.root.findByProps({accessibilityLabel: 'Round 2 of 5 complete'});
    expect(container).toBeDefined();
  });

  it('renders round score', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('78');
  });

  it('renders total score', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('156');
  });

  it('renders NEXT ROUND button', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('NEXT ROUND');
  });

  it('calls onNextRound when button pressed', () => {
    const onNextRound = vi.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} onNextRound={onNextRound} />);
    });
    const button = tree!.root.findByProps({accessibilityLabel: 'Next round'});
    act(() => {
      button.props.onPress();
    });
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  it('has accessibility label with round info', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RoundTransition {...defaultProps} />);
    });
    const container = tree!.root.findByProps({
      accessibilityLabel: 'Round 2 of 5 complete',
    });
    expect(container).toBeDefined();
  });
});
