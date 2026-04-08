/**
 * Unit test — pin the gesture → clip-name mapping against the raw
 * animation list baked into `public/models/psx_fps_arms.glb`.
 *
 * If an artist re-exports the rig and renames a clip, we want this
 * test to fail in milliseconds inside `vitest run` rather than
 * surfacing at runtime as a silent "idle forever" bug in the browser.
 *
 * The raw clip list comes from the GLB author; we hand-verified it
 * using the glTF inspector and pasted it below. Keep it sorted so
 * diffs stay small.
 */
import {describe, expect, it} from 'vitest';
import {
  alternatingGrab,
  alternatingSwing,
  alternatingTap,
  EXPECTED_HAND_CLIPS,
  HAND_GESTURES,
} from '../handGestures';

/** Authoritative clip list shipped inside `psx_fps_arms.glb`. */
const GLB_CLIP_NAMES = new Set<string>([
  'Flashlight_Idle',
  'Flip_off',
  'Grab_Item_L_Hand',
  'Grab_Item_R_Hand',
  'Inspect_Hands',
  'Lanturn_Idle',
  'Melee_Idle_one_handed',
  'Melee_Swing_L_one_handed',
  'Melee_Swing_L_Recoil_one_handed',
  'Melee_Swing_R_one_handed',
  'Melee_Swing_R_recoil_one_handed',
  'Pistol_Fire',
  'Pistol_Idle',
  'Pistol_Reload',
  'Pistol_Run',
  'Pistol_Sprint',
  'Pistol_Walk',
  'Pistol_Walk_Aim',
  'Punch_idle',
  'Punch_L',
  'Punch_R',
  'T_Pose',
  'Thumbas_Up',
]);

describe('HAND_GESTURES', () => {
  it('every gesture maps to a clip name that exists in the GLB', () => {
    for (const [gesture, config] of Object.entries(HAND_GESTURES)) {
      expect(
        GLB_CLIP_NAMES.has(config.clip),
        `gesture "${gesture}" → clip "${config.clip}" not found in psx_fps_arms.glb`,
      ).toBe(true);
    }
  });

  it('EXPECTED_HAND_CLIPS matches the union of HAND_GESTURES clips', () => {
    const fromTable = new Set(Object.values(HAND_GESTURES).map(g => g.clip));
    expect(new Set(EXPECTED_HAND_CLIPS)).toEqual(fromTable);
  });

  it('once-mode gestures have a sensible follow-up (or fall through to idle)', () => {
    for (const [gesture, config] of Object.entries(HAND_GESTURES)) {
      if (config.mode !== 'once') continue;
      // `followUp` is optional — undefined means "revert to idle". If
      // it IS set, it must point at a real gesture in the table.
      if (config.followUp !== undefined) {
        expect(
          HAND_GESTURES[config.followUp],
          `gesture "${gesture}" has followUp "${config.followUp}" which is not a known gesture`,
        ).toBeDefined();
      }
    }
  });
});

describe('alternating helpers', () => {
  it('alternatingTap flips L ↔ R on parity', () => {
    expect(alternatingTap(0)).toBe('tap_left');
    expect(alternatingTap(1)).toBe('tap_right');
    expect(alternatingTap(2)).toBe('tap_left');
    expect(alternatingTap(3)).toBe('tap_right');
  });

  it('alternatingSwing flips L ↔ R on parity', () => {
    expect(alternatingSwing(0)).toBe('swing_left');
    expect(alternatingSwing(1)).toBe('swing_right');
  });

  it('alternatingGrab flips L ↔ R on parity', () => {
    expect(alternatingGrab(0)).toBe('grab_left');
    expect(alternatingGrab(1)).toBe('grab_right');
  });
});
