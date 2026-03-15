/**
 * @module e2e/utils/governor
 * Playwright-side controller for the Will It Blow? debug interface.
 *
 * Modeled after stellar-descent's GovernorController pattern.
 * All interactions go through `window.__WIB_DEBUG__` which is only
 * available in dev mode.
 */
import type {Page} from '@playwright/test';

export class WIBGovernor {
  constructor(private page: Page) {}

  async getGamePhase(): Promise<string> {
    return this.page.evaluate(() => (window as any).__WIB_DEBUG__?.getGamePhase() ?? 'unknown');
  }

  async getAppPhase(): Promise<string> {
    return this.page.evaluate(() => (window as any).__WIB_DEBUG__?.getAppPhase() ?? 'unknown');
  }

  async getRound(): Promise<number> {
    return this.page.evaluate(() => (window as any).__WIB_DEBUG__?.getRound() ?? 0);
  }

  async getState(): Promise<any> {
    return this.page.evaluate(() => {
      const debug = (window as any).__WIB_DEBUG__;
      if (!debug) return null;
      // getState() returns the full snapshot; extract serializable fields
      const s = debug.getState();
      return {
        appPhase: s.appPhase,
        gamePhase: s.gamePhase,
        groundMeatVol: s.groundMeatVol,
        stuffLevel: s.stuffLevel,
        casingTied: s.casingTied,
        cookLevel: s.cookLevel,
        currentRound: s.currentRound,
        totalRounds: s.totalRounds,
        selectedIngredientIds: s.selectedIngredientIds,
        mrSausageReaction: s.mrSausageReaction,
        mrSausageDemands: s.mrSausageDemands,
        finalScore: s.finalScore,
        playerDecisions: s.playerDecisions,
      };
    });
  }

  async selectIngredients(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.page.evaluate(
        ingId => (window as any).__WIB_DEBUG__?.actions.selectIngredient(ingId),
        id,
      );
      await this.page.waitForTimeout(100);
    }
  }

  async advancePhase(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.advancePhase());
  }

  async doChops(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.doChop());
      await this.page.waitForTimeout(50);
    }
  }

  async fillGrinder(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.fillGrinder());
  }

  async fillStuffer(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.fillStuffer());
  }

  async tieCasing(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.tieCasing());
  }

  async triggerBlowout(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.triggerBlowout());
  }

  async setCookLevel(level: number): Promise<void> {
    await this.page.evaluate(l => (window as any).__WIB_DEBUG__?.actions.setCookLevel(l), level);
  }

  async startNewGame(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.startNewGame());
  }

  async returnToMenu(): Promise<void> {
    await this.page.evaluate(() => (window as any).__WIB_DEBUG__?.actions.returnToMenu());
  }

  async waitForPhase(phase: string, timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      expected => (window as any).__WIB_DEBUG__?.getGamePhase() === expected,
      phase,
      {timeout},
    );
  }

  async waitForAppPhase(phase: string, timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      expected => (window as any).__WIB_DEBUG__?.getAppPhase() === expected,
      phase,
      {timeout},
    );
  }

  /** Play through an entire round automatically */
  async playFullRound(): Promise<void> {
    // SELECT_INGREDIENTS -- pick 3
    await this.selectIngredients(['banana', 'steak', 'bread']);

    // CHOPPING -- chop 5 times
    await this.advancePhase(); // to CHOPPING
    await this.doChops(5);

    // FILL_GRINDER -> GRINDING -> MOVE_BOWL -> ATTACH_CASING -> STUFFING
    await this.advancePhase(); // to FILL_GRINDER
    await this.fillGrinder();
    await this.advancePhase(); // to GRINDING
    await this.advancePhase(); // to MOVE_BOWL
    await this.advancePhase(); // to ATTACH_CASING
    await this.advancePhase(); // to STUFFING
    await this.fillStuffer();

    // TIE_CASING
    await this.advancePhase(); // to TIE_CASING
    await this.tieCasing();

    // BLOWOUT
    await this.advancePhase(); // to BLOWOUT
    await this.triggerBlowout();

    // MOVE_SAUSAGE -> MOVE_PAN -> COOKING
    await this.advancePhase(); // to MOVE_SAUSAGE
    await this.advancePhase(); // to MOVE_PAN
    await this.advancePhase(); // to COOKING
    await this.setCookLevel(0.75);

    // DONE
    await this.advancePhase(); // to DONE
  }
}
