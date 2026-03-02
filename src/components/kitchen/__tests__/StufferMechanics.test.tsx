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

  it('recordTwist appends to twistPoints', () => {
    const {recordTwist} = useGameStore.getState();

    recordTwist(0.25);
    expect(useGameStore.getState().twistPoints).toEqual([0.25]);

    recordTwist(0.75);
    expect(useGameStore.getState().twistPoints).toEqual([0.25, 0.75]);
  });

  it('recordFlairTwist increments flairTwistCount', () => {
    const {recordFlairTwist} = useGameStore.getState();

    expect(useGameStore.getState().flairTwistCount).toBe(0);
    recordFlairTwist();
    expect(useGameStore.getState().flairTwistCount).toBe(1);
    recordFlairTwist();
    expect(useGameStore.getState().flairTwistCount).toBe(2);
  });

  it('recordFormChoice derives "coil" when no twists', () => {
    const {recordFormChoice} = useGameStore.getState();

    recordFormChoice();
    expect(useGameStore.getState().chosenForm).toBe('coil');
  });

  it('recordFormChoice derives "links" when twists exist', () => {
    const {recordTwist, recordFormChoice} = useGameStore.getState();

    recordTwist(0.5);
    recordFormChoice();
    expect(useGameStore.getState().chosenForm).toBe('links');
  });

  it('recordFlairPoint adds to flairScore', () => {
    const {recordFlairPoint} = useGameStore.getState();

    expect(useGameStore.getState().flairScore).toBe(0);
    recordFlairPoint('simultaneous-crank-twist', 5);
    expect(useGameStore.getState().flairScore).toBe(5);
    recordFlairPoint('simultaneous-crank-twist', 5);
    expect(useGameStore.getState().flairScore).toBe(10);
  });

  it('simultaneous crank+twist records both flair twist and flair points', () => {
    const {recordTwist, recordFlairTwist, recordFlairPoint} = useGameStore.getState();

    // Simulate simultaneous crank+twist
    recordTwist(0.4);
    recordFlairTwist();
    recordFlairPoint('simultaneous-crank-twist', 5);

    const state = useGameStore.getState();
    expect(state.twistPoints).toEqual([0.4]);
    expect(state.flairTwistCount).toBe(1);
    expect(state.flairScore).toBe(5);
  });

  it('startNewGame resets twist state', () => {
    const store = useGameStore.getState();
    store.recordTwist(0.3);
    store.recordFlairTwist();
    store.recordFlairPoint('test', 10);
    store.recordFormChoice();

    // Verify state was set
    expect(useGameStore.getState().twistPoints.length).toBe(1);
    expect(useGameStore.getState().chosenForm).toBe('links');

    // Reset
    useGameStore.getState().startNewGame();

    const fresh = useGameStore.getState();
    expect(fresh.twistPoints).toEqual([]);
    expect(fresh.chosenForm).toBeNull();
    expect(fresh.flairTwistCount).toBe(0);
    expect(fresh.flairScore).toBe(0);
  });

  it('completeChallenge resets twist state', () => {
    const store = useGameStore.getState();
    store.recordTwist(0.5);
    store.recordFormChoice();

    store.completeChallenge(80);

    const state = useGameStore.getState();
    expect(state.twistPoints).toEqual([]);
    expect(state.chosenForm).toBeNull();
    expect(state.flairTwistCount).toBe(0);
    expect(state.flairScore).toBe(0);
  });

  it('recordFormChoice on completion records form from twists', () => {
    const store = useGameStore.getState();

    // Simulate a full stuffing session with twists
    store.recordTwist(0.2);
    store.recordTwist(0.5);
    store.recordTwist(0.8);
    store.recordFormChoice();

    expect(useGameStore.getState().chosenForm).toBe('links');
    expect(useGameStore.getState().twistPoints).toEqual([0.2, 0.5, 0.8]);
  });
});
