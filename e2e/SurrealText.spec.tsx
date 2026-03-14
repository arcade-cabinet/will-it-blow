import {expect, test} from '@playwright/experimental-ct-react';
import {Canvas} from '@react-three/fiber';
import {SurrealText} from '../../environment/SurrealText';

test.use({viewport: {width: 500, height: 500}});

test('should render SurrealText correctly based on state', async ({mount}) => {
  // Set an initial game store state before mounting
  useGameStore.setState({
    posture: 'neutral',
    gamePhase: 'intro',
  } as any);

  // Mount the component inside a Canvas for testing
  const component = await mount(
    <div style={{width: '500px', height: '500px'}}>
      <Canvas>
        <SurrealText />
      </Canvas>
    </div>,
  );

  // Basic sanity check that the component renders
  await expect(component).toBeVisible();

  // Visual regression: intro phase
  await expect(component).toHaveScreenshot('surreal-text-intro.png');

  // Update the store to simulate a different phase/posture and validate the change
  useGameStore.setState({
    posture: 'slouch',
    gamePhase: 'game',
  } as any);

  // Visual regression: in-game phase
  await expect(component).toHaveScreenshot('surreal-text-game.png');
});
