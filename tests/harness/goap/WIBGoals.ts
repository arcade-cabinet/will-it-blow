/**
 * Yuka-style goal hierarchy for the AI player.
 *
 * Yuka 0.7.8 ships `Goal`, `CompositeGoal`, `GoalEvaluator`, and
 * `Think` (which is itself a CompositeGoal that picks the
 * highest-scoring sub-goal each tick). We use the same shape but
 * extend it with an async `execute(actuator, perception)` method,
 * because Yuka's `activate/execute/terminate` lifecycle is
 * synchronous and our actuator returns Promises (real Playwright
 * mouse events).
 *
 * Top-level: `CompleteRoundGoal` is a `CompositeGoal` that, on
 * each tick, looks at the current game phase from perception and
 * delegates to the per-phase subgoal that handles it.
 *
 * Per-phase subgoals are simple `Goal` subclasses with one
 * `execute()` method that performs whatever action sequence is
 * needed to advance the phase. The first iteration uses the
 * synthetic `__WIB_DEBUG__.actions.advancePhase()` shortcut so the
 * end-to-end loop works; subsequent iterations replace each phase's
 * implementation with real pointer / drag events one at a time.
 */
import {CompositeGoal, Goal} from 'yuka';
import type {PerceptionSnapshot} from '../../../src/debug/perception';
import type {GamePhase} from '../../../src/ecs/hooks';
import type {WIBActuator} from '../actuation/WIBActuator';
import type {WIBPerception} from '../perception/WIBPerception';

/** Status enum mirroring Yuka's int constants for readability. */
export const GoalStatus = {
  ACTIVE: 1,
  INACTIVE: 0,
  COMPLETED: 2,
  FAILED: 3,
} as const;

export interface GoalContext {
  perception: WIBPerception;
  actuator: WIBActuator;
}

/**
 * Base class — every WIB goal extends this so they share an
 * async-aware execute hook on top of Yuka's synchronous one.
 */
export class WIBGoal extends Goal {
  /**
   * Run the goal's logic against the live perception + actuator.
   * Returns true on success, false to fall through to the next goal.
   */
  async run(_ctx: GoalContext): Promise<boolean> {
    return true;
  }
}

// ── Per-phase goals ─────────────────────────────────────────────────

/**
 * For phases the AI player can satisfy by tapping a single button or
 * issuing a single debug action, we use a thin "synthetic" path:
 * call `__WIB_DEBUG__.actions.advancePhase()`. The macro layer's
 * "real-clicks" suite re-implements each one to use actual pointer
 * events; this synthetic baseline exists so the governor's tick loop
 * is testable end-to-end before the actuator implementations land.
 */
export class SyntheticAdvanceGoal extends WIBGoal {
  constructor(public readonly forPhase: GamePhase) {
    super();
  }

  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) throw new Error('SyntheticAdvanceGoal: __WIB_DEBUG__ missing');
    debug.actions.advancePhase();
    return true;
  }
}

/**
 * SELECT_INGREDIENTS phase needs three picks before advancing.
 * Synthetic version uses the debug `selectIngredient` action with
 * three default ingredient ids.
 */
export class SelectIngredientsGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.selectIngredient('banana');
    debug.actions.selectIngredient('steak');
    debug.actions.selectIngredient('bread');
    debug.actions.advancePhase();
    return true;
  }
}

export class ChopGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    for (let i = 0; i < 5; i += 1) debug.actions.doChop();
    debug.actions.advancePhase();
    return true;
  }
}

export class FillGrinderGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.fillGrinder();
    debug.actions.advancePhase();
    return true;
  }
}

export class StuffGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.fillStuffer();
    debug.actions.advancePhase();
    return true;
  }
}

export class TieGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.tieCasing();
    debug.actions.advancePhase();
    return true;
  }
}

export class BlowoutGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.triggerBlowout();
    debug.actions.advancePhase();
    return true;
  }
}

export class CookGoal extends WIBGoal {
  constructor(public readonly targetCookLevel = 0.75) {
    super();
  }
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.setCookLevel(this.targetCookLevel);
    debug.actions.advancePhase();
    return true;
  }
}

/** Adversarial cook — under-cooks for the hostile playthrough. */
export class UnderCookGoal extends WIBGoal {
  override async run(_ctx: GoalContext): Promise<boolean> {
    const debug = window.__WIB_DEBUG__;
    if (!debug) return false;
    debug.actions.setCookLevel(0.05);
    debug.actions.advancePhase();
    return true;
  }
}

// ── Top-level composite goal ────────────────────────────────────────

export interface CompleteRoundOptions {
  /** If true, use under-performing goal variants. Default false. */
  hostile?: boolean;
}

/**
 * The top-level goal: drive the game from any starting phase to
 * DONE. On each `run()`, picks the per-phase subgoal that handles
 * the current phase and runs it.
 *
 * Yuka's `Think` evaluator usually picks goals via priority scoring;
 * here we don't need that — the current phase IS the priority. So
 * the composite is intentionally simple.
 */
export class CompleteRoundGoal extends CompositeGoal {
  private hostile: boolean;

  constructor(options: CompleteRoundOptions = {}) {
    super();
    this.hostile = options.hostile ?? false;
  }

  /** Map a perception snapshot to the right subgoal for the moment. */
  selectGoalForPhase(snapshot: PerceptionSnapshot): WIBGoal | null {
    switch (snapshot.gamePhase) {
      case 'SELECT_INGREDIENTS':
        return new SelectIngredientsGoal();
      case 'CHOPPING':
        return new ChopGoal();
      case 'FILL_GRINDER':
        return new FillGrinderGoal();
      case 'GRINDING':
      case 'MOVE_BOWL':
      case 'ATTACH_CASING':
        return new SyntheticAdvanceGoal(snapshot.gamePhase);
      case 'STUFFING':
        return new StuffGoal();
      case 'TIE_CASING':
        return new TieGoal();
      case 'BLOWOUT':
        return new BlowoutGoal();
      case 'MOVE_SAUSAGE':
      case 'MOVE_PAN':
        return new SyntheticAdvanceGoal(snapshot.gamePhase);
      case 'COOKING':
        return this.hostile ? new UnderCookGoal() : new CookGoal();
      case 'DONE':
        return null; // round complete
      default:
        return null;
    }
  }
}
