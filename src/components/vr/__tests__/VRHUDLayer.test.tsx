/**
 * @module VRHUDLayer.test
 * Tests for VRHUDLayer — VR-specific world-space HUD rendering.
 *
 * Strategy: Source-level analysis for structural and behavioral correctness.
 * R3F components that render HTML-in-3D (via drei's Html) cannot be rendered
 * in react-test-renderer without a full Canvas context. Source-level tests
 * verify the conditional logic, store subscriptions, and component wiring
 * that drive VR HUD behavior.
 */

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from '@jest/globals';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'VRHUDLayer.tsx'), 'utf-8');

// ===========================================================================
// Exports and imports
// ===========================================================================

describe('VRHUDLayer module structure', () => {
  it('exports VRHUDLayer function', () => {
    expect(SOURCE).toContain('export function VRHUDLayer');
  });

  it('imports useGameStore for state access', () => {
    expect(SOURCE).toContain("from '../../store/gameStore'");
  });

  it('imports useXRMode for VR detection', () => {
    expect(SOURCE).toContain("from '../../hooks/useXRMode'");
  });

  it('imports VRPanel for world-space rendering', () => {
    expect(SOURCE).toContain("from './VRPanel'");
  });

  it('imports getChallengeIndex for manifest-driven routing', () => {
    expect(SOURCE).toContain("from '../../engine/ChallengeManifest'");
  });
});

// ===========================================================================
// VR mode gating
// ===========================================================================

describe('VR mode gating', () => {
  it('returns null when not in VR', () => {
    expect(SOURCE).toMatch(/if\s*\(\s*!isVR\s*\)\s*return\s+null/);
  });

  it('reads isVR from useXRMode hook', () => {
    expect(SOURCE).toContain('useXRMode()');
    expect(SOURCE).toContain('isVR');
  });
});

// ===========================================================================
// Challenge HUD selection
// ===========================================================================

describe('challenge HUD routing', () => {
  it('computes showChallenge from gameStatus and challengeTriggered', () => {
    expect(SOURCE).toMatch(
      /const\s+showChallenge\s*=\s*gameStatus\s*===\s*'playing'\s*&&\s*challengeTriggered/,
    );
  });

  it('renders VRChoppingHUD for chopping challenge', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_CHOPPING && <VRChoppingHUD/);
  });

  it('renders VRGrindingHUD for grinding challenge', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_GRINDING && <VRGrindingHUD/);
  });

  it('renders VRStuffingHUD for stuffing challenge', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_STUFFING && <VRStuffingHUD/);
  });

  it('renders VRCookingHUD for cooking challenge', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_COOKING && <VRCookingHUD/);
  });

  it('renders VRBlowoutHUD for blowout challenge', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_BLOWOUT && <VRBlowoutHUD/);
  });

  it('skips ingredients — uses bridge pattern', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_INGREDIENTS && null/);
  });

  it('skips tasting — uses bridge pattern', () => {
    expect(SOURCE).toMatch(/currentChallenge === IDX_TASTING && null/);
  });

  it('renders VRGameOverPanel unconditionally (it self-gates on gameStatus)', () => {
    expect(SOURCE).toContain('<VRGameOverPanel />');
  });
});

// ===========================================================================
// VRTimer helper
// ===========================================================================

describe('VRTimer component', () => {
  it('shows countdown seconds with Math.ceil', () => {
    expect(SOURCE).toContain('Math.ceil(seconds)');
  });

  it('uses danger color (#FF1744) when danger prop is true', () => {
    expect(SOURCE).toContain("danger ? '#FF1744' : '#FFC832'");
  });

  it('applies glow text-shadow for readability', () => {
    expect(SOURCE).toContain('textShadow');
  });
});

// ===========================================================================
// VRProgressBar helper
// ===========================================================================

describe('VRProgressBar component', () => {
  it('renders label text', () => {
    expect(SOURCE).toContain('{label}');
  });

  it('clamps width between 0% and 100%', () => {
    expect(SOURCE).toMatch(/Math\.max\(0,\s*Math\.min\(100,\s*value\)\)/);
  });

  it('has smooth CSS transition for progress changes', () => {
    expect(SOURCE).toContain("transition: 'width 0.15s ease-out'");
  });

  it('uses dark background bar with rounded corners', () => {
    expect(SOURCE).toContain("background: '#1a1a1a'");
    expect(SOURCE).toContain("borderRadius: '6px'");
  });
});

// ===========================================================================
// VRSpeedZone helper
// ===========================================================================

describe('VRSpeedZone component', () => {
  it('maps slow zone to "TOO SLOW!" in orange', () => {
    expect(SOURCE).toContain("slow: {text: 'TOO SLOW!', color: '#FF9800'}");
  });

  it('maps good zone to "PERFECT!" in green', () => {
    expect(SOURCE).toContain("good: {text: 'PERFECT!', color: '#4CAF50'}");
  });

  it('maps fast zone to "TOO FAST!" in red', () => {
    expect(SOURCE).toContain("fast: {text: 'TOO FAST!', color: '#FF1744'}");
  });

  it('returns null for unknown zones', () => {
    expect(SOURCE).toContain('if (!info) return null');
  });
});

// ===========================================================================
// VR Grinding HUD
// ===========================================================================

describe('VRGrindingHUD', () => {
  it('reads challengeProgress, challengeTimeRemaining, challengeSpeedZone from store', () => {
    // Find VRGrindingHUD function body
    const match = SOURCE.match(/function VRGrindingHUD[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    const body = match![0];
    expect(body).toContain('challengeProgress');
    expect(body).toContain('challengeTimeRemaining');
    expect(body).toContain('challengeSpeedZone');
  });

  it('only renders during active phase', () => {
    expect(SOURCE).toMatch(/function VRGrindingHUD[\s\S]*?phase !== 'active'[\s\S]*?return null/);
  });

  it('displays GRIND PROGRESS label', () => {
    expect(SOURCE).toContain('GRIND PROGRESS');
  });
});

// ===========================================================================
// VR Stuffing HUD
// ===========================================================================

describe('VRStuffingHUD', () => {
  it('reads challengePressure and challengeIsPressing from store', () => {
    const match = SOURCE.match(/function VRStuffingHUD[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    const body = match![0];
    expect(body).toContain('challengePressure');
    expect(body).toContain('challengeIsPressing');
  });

  it('shows FILL and PRESSURE dual gauges', () => {
    expect(SOURCE).toContain('label="FILL"');
    expect(SOURCE).toContain('label="PRESSURE"');
  });

  it('shows CAREFUL! warning when pressure > 70', () => {
    expect(SOURCE).toContain('pressure > 70');
    expect(SOURCE).toContain('CAREFUL!');
  });

  it('shows FILLING/RELEASE status based on isPressing', () => {
    expect(SOURCE).toContain("isPressing ? 'FILLING...' : 'RELEASE...'");
  });
});

// ===========================================================================
// VR Cooking HUD
// ===========================================================================

describe('VRCookingHUD', () => {
  it('reads challengeTemperature and challengeHeatLevel from store', () => {
    const match = SOURCE.match(/function VRCookingHUD[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    const body = match![0];
    expect(body).toContain('challengeTemperature');
    expect(body).toContain('challengeHeatLevel');
  });

  it('displays temperature in Fahrenheit with color coding', () => {
    expect(SOURCE).toContain('Math.round(temp)');
    expect(SOURCE).toContain('&deg;F');
  });

  it('applies blue for cold, green for target zone, red for hot', () => {
    expect(SOURCE).toContain("'#4FC3F7'"); // cold blue
    expect(SOURCE).toContain("'#4CAF50'"); // target green
    expect(SOURCE).toContain("'#FF1744'"); // hot red
  });

  it('shows heat level labels (OFF/LOW/MED/HIGH)', () => {
    expect(SOURCE).toContain("['OFF', 'LOW', 'MED', 'HIGH']");
  });
});

// ===========================================================================
// VR Chopping HUD
// ===========================================================================

describe('VRChoppingHUD', () => {
  it('displays CHOP PROGRESS label', () => {
    expect(SOURCE).toContain('CHOP PROGRESS');
  });

  it('uses orange color for chopping progress bar', () => {
    expect(SOURCE).toContain('color="#FF9800"');
  });

  it('has chopping-specific zone labels (ALMOST/CHOP NOW!/WAIT)', () => {
    expect(SOURCE).toContain("'ALMOST...'");
    expect(SOURCE).toContain("'CHOP NOW!'");
    expect(SOURCE).toContain("'WAIT...'");
  });
});

// ===========================================================================
// VR Blowout HUD
// ===========================================================================

describe('VRBlowoutHUD', () => {
  it('reads casingTied from store for phase gating', () => {
    const match = SOURCE.match(/function VRBlowoutHUD[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    const body = match![0];
    expect(body).toContain('casingTied');
  });

  it('shows TIE THE CASING prompt when casing not tied', () => {
    expect(SOURCE).toContain('TIE THE CASING');
    expect(SOURCE).toContain('!casingTied');
  });

  it('shows COVERAGE gauge and HOLD TO BLOW prompt when casing tied', () => {
    expect(SOURCE).toContain('COVERAGE');
    expect(SOURCE).toContain('HOLD TO BLOW');
    expect(SOURCE).toContain('Release to fire');
  });
});

// ===========================================================================
// VR Game Over panel
// ===========================================================================

describe('VRGameOverPanel', () => {
  it('self-gates: returns null when gameStatus is not victory/defeat', () => {
    expect(SOURCE).toMatch(
      /gameStatus !== 'victory' && gameStatus !== 'defeat'[\s\S]*?return null/,
    );
  });

  it('shows VICTORY text for victory status', () => {
    expect(SOURCE).toContain("'VICTORY'");
  });

  it('shows GAME OVER text for defeat status', () => {
    expect(SOURCE).toContain("'GAME OVER'");
  });

  it('uses gold color for victory and red for defeat', () => {
    expect(SOURCE).toContain("'#FFD700'"); // victory gold
    expect(SOURCE).toContain("'#FF1744'"); // defeat red
  });

  it('has New Game button that calls setAppPhase("loading")', () => {
    expect(SOURCE).toContain("setAppPhase('loading')");
    expect(SOURCE).toContain('NEW GAME');
  });

  it('has Menu button that calls returnToMenu', () => {
    expect(SOURCE).toContain('onClick={returnToMenu}');
    expect(SOURCE).toContain('MENU');
  });

  it('uses HTML <button> elements for XR ray interaction', () => {
    expect(SOURCE).toContain('<button');
    expect(SOURCE).toContain('type="button"');
  });

  it('places game over panel at 1.8m distance', () => {
    expect(SOURCE).toMatch(/VRGameOverPanel[\s\S]*?distance=\{1\.8\}/);
  });
});

// ===========================================================================
// VR panel configuration
// ===========================================================================

describe('VR panel sizing and comfort', () => {
  it('places challenge HUDs at 1.5m distance (comfortable reading)', () => {
    // Count distance={1.5} occurrences — should be in each challenge HUD
    const matches = SOURCE.match(/distance=\{1\.5\}/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(5); // 5 challenge HUDs
  });

  it('uses panel widths between 320-400px for VR legibility', () => {
    const widths = [...SOURCE.matchAll(/width=\{(\d+)\}/g)].map(m => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const w of widths) {
      expect(w).toBeGreaterThanOrEqual(320);
      expect(w).toBeLessThanOrEqual(400);
    }
  });

  it('offsets panels slightly below eye level (verticalOffset negative)', () => {
    const offsets = [...SOURCE.matchAll(/verticalOffset=\{(-?[\d.]+)\}/g)].map(m => Number(m[1]));
    // Most HUDs should be at -0.1 or -0.2 (below eye level)
    const belowEye = offsets.filter(o => o < 0);
    expect(belowEye.length).toBeGreaterThan(0);
  });

  it('uses Bangers font family matching the 2D HUD theme', () => {
    expect(SOURCE).toContain('Bangers');
  });
});

// ===========================================================================
// Store subscriptions
// ===========================================================================

describe('store subscriptions', () => {
  it('subscribes to gameStatus for game over detection', () => {
    expect(SOURCE).toContain('useGameStore(s => s.gameStatus)');
  });

  it('subscribes to currentChallenge for HUD routing', () => {
    expect(SOURCE).toContain('useGameStore(s => s.currentChallenge)');
  });

  it('subscribes to challengeTriggered for show/hide logic', () => {
    expect(SOURCE).toContain('useGameStore(s => s.challengeTriggered)');
  });

  it('subscribes to challengePhase in each HUD for dialogue/active gating', () => {
    expect(SOURCE).toContain('useGameStore(s => s.challengePhase)');
  });
});
