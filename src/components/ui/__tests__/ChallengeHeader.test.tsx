import {render, screen} from '@testing-library/react';
import {useGameStore} from '../../../ecs/hooks';
import {ChallengeHeader} from '../ChallengeHeader';

beforeEach(() => {
  useGameStore.setState({gamePhase: 'SELECT_INGREDIENTS'});
});

describe('ChallengeHeader', () => {
  it('renders challenge info for SELECT_INGREDIENTS phase', () => {
    useGameStore.setState({gamePhase: 'SELECT_INGREDIENTS'});
    render(<ChallengeHeader />);
    expect(screen.getByLabelText('Challenge 1 of 7: SELECT INGREDIENTS')).toBeDefined();
  });

  it('renders challenge info for GRINDING phase', () => {
    useGameStore.setState({gamePhase: 'GRINDING'});
    render(<ChallengeHeader />);
    expect(screen.getByLabelText('Challenge 3 of 7: GRINDING')).toBeDefined();
  });

  it('renders challenge info for COOKING phase', () => {
    useGameStore.setState({gamePhase: 'COOKING'});
    render(<ChallengeHeader />);
    expect(screen.getByLabelText('Challenge 6 of 7: COOKING')).toBeDefined();
  });

  it('returns null for transition phases (MOVE_BOWL)', () => {
    useGameStore.setState({gamePhase: 'MOVE_BOWL'});
    const {container} = render(<ChallengeHeader />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for transition phases (MOVE_SAUSAGE)', () => {
    useGameStore.setState({gamePhase: 'MOVE_SAUSAGE'});
    const {container} = render(<ChallengeHeader />);
    expect(container.innerHTML).toBe('');
  });

  it('has accessibility label with challenge info', () => {
    useGameStore.setState({gamePhase: 'STUFFING'});
    render(<ChallengeHeader />);
    expect(screen.getByLabelText('Challenge 4 of 7: STUFFING')).toBeDefined();
  });
});
