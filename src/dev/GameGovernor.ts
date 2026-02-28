/**
 * GameGovernor — Dev-only harness that exposes Zustand store actions on `window.__gov`
 * so Playwright e2e tests can drive the game programmatically without clicking through
 * every dialogue and UI element.
 *
 * Usage from Playwright:
 *   await page.evaluate(() => window.__gov.skipToChallenge(2));
 *   await page.evaluate(() => window.__gov.completeCurrentChallenge(85));
 *   await page.evaluate(() => window.__gov.getState());
 */

import { useGameStore } from '../store/gameStore';

export interface GameGov {
	/** Get current store state snapshot */
	getState: () => Record<string, unknown>;

	/** Start a new game via loading screen (menu → loading → playing) */
	startGame: () => void;

	/** Start a new game immediately, bypassing the loading screen */
	startGameDirect: () => void;

	/** Complete the current challenge with a given score and advance */
	completeCurrentChallenge: (score: number) => void;

	/** Skip directly to a specific challenge index (0-4) */
	skipToChallenge: (index: number) => void;

	/** Set appPhase directly */
	setPhase: (phase: 'menu' | 'loading' | 'playing') => void;

	/** Trigger defeat */
	triggerDefeat: () => void;

	/** Trigger victory with given scores */
	triggerVictory: (scores: number[]) => void;

	/** Set challenge ephemeral state */
	setChallengeProgress: (v: number) => void;
	setChallengePressure: (v: number) => void;
	setChallengeTemperature: (v: number) => void;
	setChallengeHeatLevel: (v: number) => void;
}

function createGovernor(): GameGov {
	const store = useGameStore;

	return {
		getState() {
			const s = store.getState();
			return {
				appPhase: s.appPhase,
				gameStatus: s.gameStatus,
				currentChallenge: s.currentChallenge,
				challengeScores: s.challengeScores,
				strikes: s.strikes,
				hintsRemaining: s.hintsRemaining,
				challengeProgress: s.challengeProgress,
				challengePressure: s.challengePressure,
				challengeTemperature: s.challengeTemperature,
				challengeHeatLevel: s.challengeHeatLevel,
			};
		},

		startGame() {
			// Trigger the loading phase — LoadingScreen will pre-fetch kitchen.glb
			// and call startNewGame() when complete, transitioning to 'playing'.
			store.getState().setAppPhase('loading');
		},

		startGameDirect() {
			// Bypass loading screen — use when GLB is already cached
			store.getState().startNewGame();
		},

		completeCurrentChallenge(score: number) {
			store.getState().completeChallenge(score);
		},

		skipToChallenge(index: number) {
			const state = store.getState();
			// Ensure we're in playing state
			if (state.appPhase !== 'playing') {
				state.startNewGame();
			}
			// Complete challenges up to the target index
			const current = store.getState().currentChallenge;
			for (let i = current; i < index; i++) {
				store.getState().completeChallenge(75); // default decent score
			}
		},

		setPhase(phase) {
			store.getState().setAppPhase(phase);
		},

		triggerDefeat() {
			const state = store.getState();
			if (state.appPhase !== 'playing') {
				state.startNewGame();
			}
			// 3 strikes = defeat
			store.getState().addStrike();
			store.getState().addStrike();
			store.getState().addStrike();
		},

		triggerVictory(scores: number[]) {
			const state = store.getState();
			if (state.appPhase !== 'playing') {
				state.startNewGame();
			}
			// Complete all 5 challenges with provided scores
			for (let i = 0; i < 5; i++) {
				store.getState().completeChallenge(scores[i] ?? 75);
			}
		},

		setChallengeProgress(v) { store.getState().setChallengeProgress(v); },
		setChallengePressure(v) { store.getState().setChallengePressure(v); },
		setChallengeTemperature(v) { store.getState().setChallengeTemperature(v); },
		setChallengeHeatLevel(v) { store.getState().setChallengeHeatLevel(v); },
	};
}

/** Install the governor on window (dev only) */
export function installGovernor() {
	if (typeof window !== 'undefined' && __DEV__) {
		(window as any).__gov = createGovernor();
		console.log('[GameGovernor] Installed on window.__gov');
	}
}
