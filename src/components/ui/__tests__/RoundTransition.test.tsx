import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {RoundTransition} from '../RoundTransition';

const defaultProps = {
  roundNumber: 2,
  totalRounds: 5,
  onComplete: vi.fn(),
};

describe('RoundTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders round number', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('ROUND 2');
  });

  it('renders total rounds', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('OF 5');
  });

  it('renders "Prepare yourself" text', () => {
    const {container} = render(<RoundTransition {...defaultProps} />);
    expect(container.textContent).toContain('Prepare yourself');
  });

  it('has accessibility label with round info', () => {
    render(<RoundTransition {...defaultProps} />);
    expect(screen.getByLabelText('Round 2 of 5')).toBeDefined();
  });

  it('calls onComplete after 2 seconds', () => {
    const onComplete = vi.fn();
    render(<RoundTransition {...defaultProps} onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders with different round numbers', () => {
    const {container} = render(
      <RoundTransition roundNumber={4} totalRounds={5} onComplete={vi.fn()} />,
    );
    expect(container.textContent).toContain('ROUND 4');
    expect(container.textContent).toContain('OF 5');
  });
});
