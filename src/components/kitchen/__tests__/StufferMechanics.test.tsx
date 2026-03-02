import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {StufferMechanics} from '../StufferMechanics';

// Reset store before each test
beforeEach(() => {
  useGameStore.getState().startNewGame();
});

describe('StufferMechanics', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<StufferMechanics position={[0, 0, 0]} />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders the root group at the given position', async () => {
    const pos: [number, number, number] = [1, 2, 3];
    const renderer = await ReactThreeTestRenderer.create(<StufferMechanics position={pos} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });

  it('renders crank handle, crank arm, nozzle, sausage group, and twist hitbox', async () => {
    const renderer = await ReactThreeTestRenderer.create(<StufferMechanics position={[0, 0, 0]} />);
    const root = renderer.scene.children[0];
    // crank handle + crank arm + nozzle + sausage group + twist hitbox = 5 minimum
    expect(root.children.length).toBeGreaterThanOrEqual(5);
  });

  it('renders with custom blendColor', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferMechanics position={[0, 0, 0]} blendColor="#ff0000" />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders without position prop (defaults to origin)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<StufferMechanics />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(0);
    expect(root.instance.position.y).toBe(0);
    expect(root.instance.position.z).toBe(0);
  });
});

describe('Store twist actions', () => {
  beforeEach(() => {
    useGameStore.getState().startNewGame();
  });

  it('recordTwist appends to playerDecisions.twistPoints', () => {
    const {recordTwist} = useGameStore.getState();

    recordTwist(0.25);
    expect(useGameStore.getState().playerDecisions.twistPoints).toEqual([0.25]);

    recordTwist(0.75);
    expect(useGameStore.getState().playerDecisions.twistPoints).toEqual([0.25, 0.75]);
  });

  it('recordFlairTwist increments playerDecisions.flairTwists', () => {
    const {recordFlairTwist} = useGameStore.getState();

    expect(useGameStore.getState().playerDecisions.flairTwists).toBe(0);
    recordFlairTwist();
    expect(useGameStore.getState().playerDecisions.flairTwists).toBe(1);
    recordFlairTwist();
    expect(useGameStore.getState().playerDecisions.flairTwists).toBe(2);
  });

  it('recordFormChoice derives "coil" when no twists', () => {
    const {recordFormChoice} = useGameStore.getState();

    recordFormChoice();
    expect(useGameStore.getState().playerDecisions.chosenForm).toBe('coil');
  });

  it('recordFormChoice derives "link" when twists exist', () => {
    const {recordTwist, recordFormChoice} = useGameStore.getState();

    recordTwist(0.5);
    recordFormChoice();
    expect(useGameStore.getState().playerDecisions.chosenForm).toBe('link');
  });

  it('recordFlairPoint adds to playerDecisions.flairPoints array', () => {
    const {recordFlairPoint} = useGameStore.getState();

    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([]);
    recordFlairPoint('simultaneous-crank-twist', 5);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([
      {reason: 'simultaneous-crank-twist', points: 5},
    ]);
    recordFlairPoint('simultaneous-crank-twist', 5);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([
      {reason: 'simultaneous-crank-twist', points: 5},
      {reason: 'simultaneous-crank-twist', points: 5},
    ]);
  });

  it('simultaneous crank+twist records both flair twist and flair points', () => {
    const {recordTwist, recordFlairTwist, recordFlairPoint} = useGameStore.getState();

    // Simulate simultaneous crank+twist
    recordTwist(0.4);
    recordFlairTwist();
    recordFlairPoint('simultaneous-crank-twist', 5);

    const {playerDecisions} = useGameStore.getState();
    expect(playerDecisions.twistPoints).toEqual([0.4]);
    expect(playerDecisions.flairTwists).toBe(1);
    expect(playerDecisions.flairPoints).toEqual([{reason: 'simultaneous-crank-twist', points: 5}]);
  });

  it('startNewGame resets twist state', () => {
    const store = useGameStore.getState();
    store.recordTwist(0.3);
    store.recordFlairTwist();
    store.recordFlairPoint('test', 10);
    store.recordFormChoice();

    // Verify state was set
    expect(useGameStore.getState().playerDecisions.twistPoints.length).toBe(1);
    expect(useGameStore.getState().playerDecisions.chosenForm).toBe('link');

    // Reset
    useGameStore.getState().startNewGame();

    const {playerDecisions} = useGameStore.getState();
    expect(playerDecisions.twistPoints).toEqual([]);
    expect(playerDecisions.chosenForm).toBeNull();
    expect(playerDecisions.flairTwists).toBe(0);
    expect(playerDecisions.flairPoints).toEqual([]);
  });

  it('recordFormChoice on completion records form from twists', () => {
    const store = useGameStore.getState();

    // Simulate a full stuffing session with twists
    store.recordTwist(0.2);
    store.recordTwist(0.5);
    store.recordTwist(0.8);
    store.recordFormChoice();

    const {playerDecisions} = useGameStore.getState();
    expect(playerDecisions.chosenForm).toBe('link');
    expect(playerDecisions.twistPoints).toEqual([0.2, 0.5, 0.8]);
  });
});
