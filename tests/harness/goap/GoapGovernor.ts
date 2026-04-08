/**
 * GoapGovernor — top-level orchestrator that drives a round to
 * completion via the perception → goal-selection → execute loop.
 *
 * Replaces the old playwright-side `WIBGovernor` with a Yuka-style
 * AI player. The contract:
 *
 *   1. Read a fresh `PerceptionSnapshot` from `__WIB_DEBUG__`.
 *   2. Ask the active `CompleteRoundGoal` what to do next.
 *   3. Run the chosen subgoal — which may issue real pointer
 *      events through `WIBActuator` or fall back to debug-bridge
 *      shortcuts.
 *   4. Wait a small settle delay so the game's reactive layers
 *      catch up.
 *   5. Repeat until phase = DONE or a max-tick guard fires.
 *
 * Every tick is recorded in an action log for the test report.
 */
import {WIBActuator} from '../actuation/WIBActuator';
import {WIBPerception} from '../perception/WIBPerception';
import type {GamePhase} from '../../../src/ecs/hooks';
import {CompleteRoundGoal, type CompleteRoundOptions} from './WIBGoals';

export interface GovernorTickRecord {
  tick: number;
  phase: GamePhase;
  goalName: string;
  durationMs: number;
}

export interface GovernorRunResult {
  finalPhase: GamePhase;
  ticks: number;
  log: GovernorTickRecord[];
  totalMs: number;
  succeeded: boolean;
}

export interface GovernorOptions extends CompleteRoundOptions {
  /** Max ticks before bailing. Default 60. */
  maxTicks?: number;
  /** Settle delay between ticks (ms). Default 80. */
  settleMs?: number;
  /** Total time budget (ms). Default 30 000. */
  budgetMs?: number;
  /** Optional logger called on every tick. */
  onTick?: (record: GovernorTickRecord) => void;
}

export class GoapGovernor {
  readonly perception = new WIBPerception();
  readonly actuator = new WIBActuator();
  private readonly composite: CompleteRoundGoal;
  private readonly options: Required<GovernorOptions>;

  constructor(options: GovernorOptions = {}) {
    this.options = {
      hostile: options.hostile ?? false,
      maxTicks: options.maxTicks ?? 60,
      settleMs: options.settleMs ?? 80,
      budgetMs: options.budgetMs ?? 30_000,
      onTick: options.onTick ?? (() => {}),
    };
    this.composite = new CompleteRoundGoal({hostile: this.options.hostile});
  }

  async playFullRound(): Promise<GovernorRunResult> {
    const start = performance.now();
    const log: GovernorTickRecord[] = [];
    let tick = 0;

    while (tick < this.options.maxTicks) {
      const elapsed = performance.now() - start;
      if (elapsed > this.options.budgetMs) {
        return {
          finalPhase: this.perception.phase(),
          ticks: tick,
          log,
          totalMs: elapsed,
          succeeded: false,
        };
      }

      const snapshot = this.perception.observe();
      if (snapshot.gamePhase === 'DONE') break;

      const goal = this.composite.selectGoalForPhase(snapshot);
      if (!goal) break;

      const tickStart = performance.now();
      await goal.run({perception: this.perception, actuator: this.actuator});
      const tickMs = performance.now() - tickStart;

      const record: GovernorTickRecord = {
        tick,
        phase: snapshot.gamePhase,
        goalName: goal.constructor.name,
        durationMs: tickMs,
      };
      log.push(record);
      this.options.onTick(record);

      // Let React + Koota propagate the state change before we
      // re-read perception.
      await new Promise(r => setTimeout(r, this.options.settleMs));
      tick += 1;
    }

    const finalPhase = this.perception.phase();
    return {
      finalPhase,
      ticks: tick,
      log,
      totalMs: performance.now() - start,
      succeeded: finalPhase === 'DONE',
    };
  }
}
