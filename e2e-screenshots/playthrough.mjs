/**
 * Full E2E visual playthrough — validates every station and Phase 2 feature.
 *
 * Usage: npx playwright test e2e-screenshots/playthrough.mjs (NO — this is a plain script)
 *   node e2e-screenshots/playthrough.mjs
 *
 * Requires: Playwright installed, dev server on localhost:8082
 */

import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = __dirname;
const BASE_URL = 'http://localhost:8082';
const TIMEOUT = 60_000;

let screenshotIndex = 0;
async function snap(page, label) {
  const idx = String(++screenshotIndex).padStart(2, '0');
  const filename = `${idx}-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
  const path = join(SCREENSHOT_DIR, filename);
  await page.screenshot({path, fullPage: false});
  console.log(`📸 ${idx}: ${label} → ${filename}`);
  return path;
}

async function _gov(page, expr) {
  return page.evaluate(expr);
}

async function govState(page) {
  return page.evaluate(() => {
    const g = window.__gov;
    if (!g) return {error: 'GameGovernor not found'};
    return g.dumpState
      ? g.dumpState()
      : {
          appPhase: g.appPhase?.() ?? 'unknown',
          gameStatus: g.gameStatus?.() ?? 'unknown',
          currentChallenge: g.currentChallenge?.() ?? -1,
          strikes: g.strikes?.() ?? -1,
        };
  });
}

async function waitForCanvas(page) {
  await page.waitForSelector('canvas', {timeout: TIMEOUT});
  // Extra time for WebGL context + first render
  await page.waitForTimeout(2000);
}

async function waitForGameReady(page) {
  // Wait for __gov to be available
  await page.waitForFunction(() => !!window.__gov, {timeout: TIMEOUT});
  await page.waitForTimeout(500);
}

(async () => {
  console.log('🎮 Will It Blow? — Full E2E Visual Playthrough\n');
  console.log(`Server: ${BASE_URL}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--window-size=1280,800'],
  });

  const context = await browser.newContext({
    viewport: {width: 1280, height: 800},
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // ─── STEP 1: Navigate to game ───
    console.log('\n═══ STEP 1: Loading Game ═══');
    await page.goto(BASE_URL, {waitUntil: 'networkidle'});
    await waitForCanvas(page);
    await snap(page, 'initial-load');

    // Wait for GameGovernor
    await waitForGameReady(page);
    let state = await govState(page);
    console.log('  State after load:', JSON.stringify(state));
    await snap(page, 'menu-screen');

    // ─── STEP 2: Check menu state ───
    console.log('\n═══ STEP 2: Menu State Validation ═══');
    const menuState = await page.evaluate(() => {
      const g = window.__gov;
      return {
        hasGov: !!g,
        methods: g ? Object.keys(g).sort() : [],
      };
    });
    console.log('  GameGovernor available:', menuState.hasGov);
    console.log('  Methods:', menuState.methods.join(', '));

    // ─── STEP 3: Start game ───
    console.log('\n═══ STEP 3: Starting Game ═══');
    const startResult = await page.evaluate(() => {
      try {
        // Try multiple methods to start the game
        const g = window.__gov;
        if (g.startGameDirect) {
          g.startGameDirect();
          return 'startGameDirect';
        }
        if (g.startGame) {
          g.startGame();
          return 'startGame';
        }
        // Fallback: directly set store
        return `no start method found — methods: ${Object.keys(g).join(', ')}`;
      } catch (e) {
        return `error: ${e.message}`;
      }
    });
    console.log('  Start method used:', startResult);
    await page.waitForTimeout(2000);
    await snap(page, 'game-started');

    state = await govState(page);
    console.log('  State after start:', JSON.stringify(state));

    // ─── STEP 4: Check 3D scene renders ───
    console.log('\n═══ STEP 4: 3D Scene Validation ═══');
    const sceneInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return {error: 'No canvas found'};
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return {
        canvasSize: `${canvas.width}x${canvas.height}`,
        webglContext: gl ? (gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl') : 'none',
        pixelRatio: window.devicePixelRatio,
      };
    });
    console.log('  Canvas:', sceneInfo.canvasSize);
    console.log('  WebGL:', sceneInfo.webglContext);
    await snap(page, '3d-scene-rendering');

    // ─── STEP 5: Navigate through each station ───
    console.log('\n═══ STEP 5: Station-by-Station Playthrough ═══');

    const stations = [
      {name: 'fridge', challenge: 'ingredients', index: 0},
      {name: 'cutting-board', challenge: 'chopping', index: 1},
      {name: 'grinder', challenge: 'grinding', index: 2},
      {name: 'stuffer', challenge: 'stuffing', index: 3},
      {name: 'stove', challenge: 'cooking', index: 4},
      {name: 'dining-table', challenge: 'blowout', index: 5},
      {name: 'crt-tv', challenge: 'tasting', index: 6},
    ];

    for (const station of stations) {
      console.log(`\n  ─── Station ${station.index}: ${station.name} (${station.challenge}) ───`);

      // Teleport to station via GameGovernor
      const teleResult = await page.evaluate(idx => {
        const g = window.__gov;
        try {
          if (g.goToStation) {
            g.goToStation(idx);
            return `goToStation(${idx})`;
          }
          if (g.teleportToStation) {
            g.teleportToStation(idx);
            return `teleportToStation(${idx})`;
          }
          if (g.setChallenge) {
            g.setChallenge(idx);
            return `setChallenge(${idx})`;
          }
          return `no teleport method — methods: ${Object.keys(g).join(', ')}`;
        } catch (e) {
          return `error: ${e.message}`;
        }
      }, station.index);
      console.log(`    Teleport: ${teleResult}`);
      await page.waitForTimeout(1500);
      await snap(page, `station-${station.index}-${station.name}`);

      // Check game state at this station
      state = await govState(page);
      console.log(`    State: ${JSON.stringify(state)}`);

      // Try to auto-complete the challenge
      const completeResult = await page.evaluate(() => {
        const g = window.__gov;
        try {
          if (g.completeCurrentChallenge) {
            g.completeCurrentChallenge(85);
            return 'completeCurrentChallenge(85)';
          }
          if (g.skipChallenge) {
            g.skipChallenge();
            return 'skipChallenge()';
          }
          if (g.completeChallenge) {
            g.completeChallenge(85);
            return 'completeChallenge(85)';
          }
          return `no complete method — methods: ${Object.keys(g).join(', ')}`;
        } catch (e) {
          return `error: ${e.message}`;
        }
      });
      console.log(`    Complete: ${completeResult}`);
      await page.waitForTimeout(1000);
      await snap(page, `station-${station.index}-${station.name}-complete`);
    }

    // ─── STEP 6: Check final state ───
    console.log('\n═══ STEP 6: Final State ═══');
    state = await govState(page);
    console.log('  Final state:', JSON.stringify(state));
    await snap(page, 'final-state');

    // ─── STEP 7: Check for errors ───
    console.log('\n═══ STEP 7: Error Report ═══');
    if (errors.length === 0) {
      console.log('  ✅ No console errors during playthrough!');
    } else {
      console.log(`  ⚠️ ${errors.length} console errors:`);
      for (const err of errors.slice(0, 20)) {
        console.log(`    • ${err.substring(0, 200)}`);
      }
    }

    // ─── STEP 8: Component inventory ───
    console.log('\n═══ STEP 8: Component Inventory ═══');
    const inventory = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const overlays = document.querySelectorAll('[data-testid]');
      const buttons = document.querySelectorAll('button, [role="button"]');
      return {
        canvasPresent: !!canvas,
        overlayCount: overlays.length,
        overlayIds: Array.from(overlays).map(el => el.getAttribute('data-testid')),
        buttonCount: buttons.length,
      };
    });
    console.log('  Canvas present:', inventory.canvasPresent);
    console.log('  Overlay elements:', inventory.overlayCount);
    console.log('  Buttons:', inventory.buttonCount);
    if (inventory.overlayIds.length > 0) {
      console.log('  Test IDs:', inventory.overlayIds.join(', '));
    }

    await snap(page, 'playthrough-complete');

    console.log('\n═══════════════════════════════════════════');
    console.log(`📸 ${screenshotIndex} screenshots captured in ${SCREENSHOT_DIR}`);
    console.log(`❌ ${errors.length} console errors`);
    console.log('═══════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n💥 PLAYTHROUGH FAILED:', err.message);
    await snap(page, 'error-state');
    throw err;
  } finally {
    await browser.close();
  }
})();
