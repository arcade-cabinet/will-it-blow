import {expect, test} from '@playwright/test';

test.describe('Greenfield Playthrough', () => {
  test('should complete a full round from title to escape', async ({page}) => {
    // 1. Title Screen
    await page.goto('http://localhost:8081', {waitUntil: 'networkidle'});
    await expect(page.getByText(/WILL IT/i)).toBeVisible({timeout: 30000});

    // Start Cooking
    await page.getByText(/START COOKING/i).click();

    // Choose Difficulty (Medium)
    await page.getByText(/MEDIUM/i).click();

    // 2. Intro Sequence
    // Should see Mr. Sausage's intro dialogue
    await expect(page.getByText('MR. SAUSAGE')).toBeVisible();

    // Skip dialogue by tapping several times
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(400, 400);
      await page.waitForTimeout(500);
    }

    // 3. Selection Phase
    // Should be standing now
    // Since this is WebGL/Canvas, we can't easily query 3D objects by text,
    // but we can verify the SurrealText instructions.
    await expect(page.getByText(/ROUND 1/)).toBeVisible();

    // Simulate grabbing 3 items from the freezer
    // We'll click in the general area of the freezer
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(200, 600); // Freezer area
      await page.mouse.down();
      await page.mouse.move(200, 200, {steps: 10}); // Lift up
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // 4. Chopping Phase
    await expect(page.getByText('CHOP IT UP')).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.mouse.click(600, 600); // Chopping block area
      await page.waitForTimeout(200);
    }

    // 5. Grinding Phase
    await expect(page.getByText('GRIND THE MEAT')).toBeVisible();
    // Turn on grinder
    await page.mouse.click(350, 500); // Switch
    await expect(page.getByText('FASTER!')).toBeVisible();

    // Slide bowl under
    await page.mouse.click(300, 700); // Bowl side

    // Plunge
    await page.mouse.move(450, 400); // Plunger
    await page.mouse.down();
    await page.mouse.move(450, 700, {steps: 20}); // Plunge down
    await page.mouse.up();

    // 6. Move Bowl
    await expect(page.getByText('TAKE IT TO THE STUFFER')).toBeVisible();
    await page.mouse.click(600, 700); // Bowl under faceplate

    // 7. Stuffing Phase
    await expect(page.getByText('PREPARE THE CASING')).toBeVisible();
    // Drag casing from water bowl to nozzle
    await page.mouse.move(650, 800); // Water bowl
    await page.mouse.down();
    await page.mouse.move(550, 700, {steps: 10}); // Nozzle
    await page.mouse.up();

    await expect(page.getByText('FILL IT UP')).toBeVisible();
    // Crank it
    await page.mouse.move(700, 500); // Crank
    await page.mouse.down();
    await page.mouse.move(700, 800, {steps: 20}); // Crank rotate
    await page.mouse.up();

    // 8. Tie Casing
    await expect(page.getByText('TIE IT OFF')).toBeVisible();
    await page.getByText('TIE').first().click();
    await page.getByText('TIE').first().click();

    // 9. Blowout
    await expect(page.getByText('WILL IT BLOW? (HOLD TO FIND OUT)')).toBeVisible();
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.waitForTimeout(2000); // Hold for 2 seconds
    await page.mouse.up();

    // 10. Stove
    await expect(page.getByText('TIME TO COOK')).toBeVisible();
    // Move pan
    await page.mouse.move(800, 500); // Pan back right
    await page.mouse.down();
    await page.mouse.move(700, 700, {steps: 10}); // Front left burner
    await page.mouse.up();

    await expect(page.getByText("DON'T LET IT BURN")).toBeVisible();
    // Dials
    await page.mouse.move(650, 850); // Dial
    await page.mouse.down();
    await page.mouse.move(650, 750, {steps: 10}); // Turn up
    await page.mouse.up();

    // Wait for cooking (takes ~10s at full heat)
    await page.waitForTimeout(11000);

    // 11. Done / Verdict
    await expect(page.getByText('SCORE:')).toBeVisible();

    // Final check for escape (if we were on round 1 of 1, but we chose Medium 5 rounds)
    // So it should show NEXT ROUND
    await expect(page.getByText('NEXT ROUND')).toBeVisible();
  });
});
