/**
 * viewport-matrix.mjs — Captures screenshots at multiple device viewports.
 *
 * Targets: OnePlus Open (folded + unfolded), common phones, tablets, desktop.
 * Takes screenshots at title screen, in-game (center view), and challenge active.
 *
 * Usage: node e2e-screenshots/viewport-matrix.mjs
 * Output: e2e-screenshots/viewports/<device>-<scene>.png
 */

import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const OUT_DIR = 'e2e-screenshots/viewports';
mkdirSync(OUT_DIR, {recursive: true});

/** Device viewport definitions — CSS pixels, not physical. */
const VIEWPORTS = [
  // OnePlus Open
  {name: 'oneplus-open-folded', w: 412, h: 915, dpr: 2.625, touch: true},
  {name: 'oneplus-open-unfolded', w: 840, h: 1024, dpr: 2.625, touch: true},
  {name: 'oneplus-open-unfolded-landscape', w: 1024, h: 840, dpr: 2.625, touch: true},

  // Common phones
  {name: 'iphone-14-pro', w: 393, h: 852, dpr: 3, touch: true},
  {name: 'iphone-14-pro-land', w: 852, h: 393, dpr: 3, touch: true},
  {name: 'pixel-7', w: 412, h: 915, dpr: 2.625, touch: true},
  {name: 'galaxy-s24', w: 360, h: 780, dpr: 3, touch: true},

  // Tablets
  {name: 'ipad-air', w: 820, h: 1180, dpr: 2, touch: true},
  {name: 'ipad-air-land', w: 1180, h: 820, dpr: 2, touch: true},

  // Desktop
  {name: 'desktop-1080p', w: 1920, h: 1080, dpr: 1, touch: false},
  {name: 'desktop-720p', w: 1280, h: 720, dpr: 1, touch: false},
];

const launchOptions = {headless: true};
if (process.env.PLAYWRIGHT_CHANNEL) {
  launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
}
const browser = await chromium.launch(launchOptions);

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.w}x${vp.h} @${vp.dpr}x) ===`);

  const context = await browser.newContext({
    viewport: {width: vp.w, height: vp.h},
    deviceScaleFactor: vp.dpr,
    hasTouch: vp.touch,
    isMobile: vp.touch,
  });
  const page = await context.newPage();

  try {
    // 1. Title screen
    await page.goto('http://localhost:8082', {waitUntil: 'networkidle', timeout: 20000});
    await page.waitForTimeout(2000);
    await page.screenshot({path: `${OUT_DIR}/${vp.name}-01-title.png`});
    console.log('  [1] Title screen captured');

    // 2. Start game
    await page.evaluate(() => {
      if (window.__gov) window.__gov.startGameDirect();
    });
    await page.waitForTimeout(3000);
    await page.screenshot({path: `${OUT_DIR}/${vp.name}-02-ingame.png`});
    console.log('  [2] In-game captured');

    // 3. Check furniture visibility
    const furniture = await page.evaluate(() => {
      const gov = window.__gov;
      if (!gov?.findObject) return null;
      const items = ['fridge', 'l-counter', 'island', 'upper-cabinets', 'oven', 'table'];
      const results = {};
      for (const name of items) {
        const obj = gov.findObject(name);
        results[name] = obj
          ? {visible: obj.visible, pos: obj.worldPosition.map(v => +v.toFixed(1))}
          : null;
      }
      return results;
    });
    if (furniture) {
      const visible = Object.entries(furniture).filter(([, v]) => v?.visible).length;
      console.log(`  Furniture: ${visible}/${Object.keys(furniture).length} visible`);
    }

    // 4. Look around — teleport to see left wall (where most furniture is)
    await page.evaluate(() => {
      const gov = window.__gov;
      if (gov) gov.movePlayerTo(-3, 1.6, -2);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({path: `${OUT_DIR}/${vp.name}-03-left-wall.png`});
    console.log('  [3] Left wall view captured');

    // 5. Trigger challenge and capture
    await page.evaluate(() => {
      const gov = window.__gov;
      if (gov) {
        gov.skipToChallenge(1); // chopping — has nice title card
      }
    });
    await page.waitForTimeout(2000);
    await page.screenshot({path: `${OUT_DIR}/${vp.name}-04-challenge.png`});
    console.log('  [4] Challenge card captured');

    // 6. Game Over screen
    await page.evaluate(() => {
      const gov = window.__gov;
      if (gov) {
        gov.triggerVictory([90, 88, 92, 85, 91, 87, 95]);
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({path: `${OUT_DIR}/${vp.name}-05-gameover.png`});
    console.log('  [5] Game over captured');
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }

  await context.close();
}

await browser.close();
console.log(`\n✅ Done. Screenshots in ${OUT_DIR}/`);
console.log(
  `Total: ${VIEWPORTS.length} viewports × 5 scenes = ${VIEWPORTS.length * 5} screenshots`,
);
