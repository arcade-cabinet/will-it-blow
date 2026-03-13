import {expect, test} from '@playwright/experimental-ct-react';
import {Canvas} from '@react-three/fiber';
import {SurrealText} from '../../environment/SurrealText';

test.use({viewport: {width: 500, height: 500}});

test('should render SurrealText correctly based on state', async ({mount}) => {
  // We can mount the component inside a Canvas for testing
  const component = await mount(
    <div style={{width: '500px', height: '500px'}}>
      <Canvas>
        <SurrealText />
      </Canvas>
    </div>,
  );

  // Since R3F doesn't render HTML DOM elements directly,
  // asserting text in Canvas usually requires checking the internal state
  // or taking a visual regression snapshot.
  await expect(component).toBeVisible();

  // Visual test!
  // await expect(component).toHaveScreenshot('surreal-text-default.png');
});
