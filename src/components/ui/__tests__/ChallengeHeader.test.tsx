import renderer, {act} from 'react-test-renderer';
import {useGameStore} from '../../../ecs/hooks';
import {ChallengeHeader} from '../ChallengeHeader';

beforeEach(() => {
  useGameStore.setState({gamePhase: 'SELECT_INGREDIENTS'});
});

describe('ChallengeHeader', () => {
  it('renders challenge info for SELECT_INGREDIENTS phase', () => {
    useGameStore.setState({gamePhase: 'SELECT_INGREDIENTS'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    const root = tree!.root;
    expect(
      root.findByProps({accessibilityLabel: 'Challenge 1 of 7: SELECT INGREDIENTS'}),
    ).toBeDefined();
  });

  it('renders challenge info for GRINDING phase', () => {
    useGameStore.setState({gamePhase: 'GRINDING'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    const root = tree!.root;
    expect(root.findByProps({accessibilityLabel: 'Challenge 3 of 7: GRINDING'})).toBeDefined();
  });

  it('renders challenge info for COOKING phase', () => {
    useGameStore.setState({gamePhase: 'COOKING'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    const root = tree!.root;
    expect(root.findByProps({accessibilityLabel: 'Challenge 6 of 7: COOKING'})).toBeDefined();
  });

  it('returns null for transition phases (MOVE_BOWL)', () => {
    useGameStore.setState({gamePhase: 'MOVE_BOWL'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it('returns null for transition phases (MOVE_SAUSAGE)', () => {
    useGameStore.setState({gamePhase: 'MOVE_SAUSAGE'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    expect(tree!.toJSON()).toBeNull();
  });

  it('has accessibility label with challenge info', () => {
    useGameStore.setState({gamePhase: 'STUFFING'});
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ChallengeHeader />);
    });
    const root = tree!.root;
    const container = root.findByProps({accessibilityLabel: 'Challenge 4 of 7: STUFFING'});
    expect(container).toBeDefined();
  });
});
