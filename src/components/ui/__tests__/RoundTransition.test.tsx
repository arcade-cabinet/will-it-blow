import {vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
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
    render(<RoundTransition {...defaultProps} />);
    expect(screen.getByLabelText('Round 2 of 5 complete')).toBeDefined();
  });

  it('renders round score', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('78');
  });

  it('renders total score', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('156');
  });

  it('renders NEXT ROUND button', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('NEXT ROUND');
  });

  it('calls onNextRound when button pressed', () => {
    const onNextRound = vi.fn();
    render(<RoundTransition {...defaultProps} onNextRound={onNextRound} />);
    const button = screen.getByLabelText('Next round');
    fireEvent.click(button);
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  it('has accessibility label with round info', () => {
    render(<RoundTransition {...defaultProps} />);
    expect(screen.getByLabelText('Round 2 of 5 complete')).toBeDefined();
  });
});
