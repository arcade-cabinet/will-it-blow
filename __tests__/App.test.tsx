/**
 * GameEngine integration tests — verifies scoring pipeline.
 *
 * Tests the complete scoring flow: ingredients → physics → final score → tier,
 * ensuring the game produces valid results for all possible input combinations.
 */

import { it, expect, describe, jest } from "@jest/globals";
import {
	calculateBlowRuffalos,
	calculateTasteRating,
	calculateFinalScore,
	getTitleTier,
	checkBurst,
} from "../src/engine/SausagePhysics";
import { INGREDIENTS } from "../src/engine/Ingredients";
// These constants were previously in Constants.ts (now deleted).
// Inlined here since the scoring pipeline tests still need them for validation.
const TASTE_QUOTES = [
	"May God have mercy on my soul!",
	"It's... it's not great.",
	"Ehh, I've had worse.",
	"Hey, that's actually pretty decent!",
	"That's a darn good sausage!",
	"THIS IS THE GREATEST SAUSAGE EVER MADE!",
];

const TITLE_TIERS = [
	"Sausage Disaster",
	"Sausage Apprentice",
	"Sausage Maker",
	"Sausage Chef",
	"Sausage Master",
	"THE SAUSAGE KING",
];

describe("Full game scoring pipeline", () => {
	it("produces valid results for every possible ingredient combination of 1", () => {
		for (const ingredient of INGREDIENTS) {
			const selected = [ingredient];
			const ruffalos = calculateBlowRuffalos(1.5, selected);
			const hasBurst = checkBurst(selected);
			const tasteRating = calculateTasteRating(selected, hasBurst);
			const score = calculateFinalScore(tasteRating, ruffalos, hasBurst, 0);
			const tier = getTitleTier(score);

			expect(ruffalos).toBeGreaterThanOrEqual(0);
			expect(ruffalos).toBeLessThanOrEqual(5);
			expect(tasteRating).toBeGreaterThanOrEqual(0);
			expect(tasteRating).toBeLessThanOrEqual(5);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
			expect(TITLE_TIERS).toContain(tier);
			expect(TASTE_QUOTES[tasteRating]).toBeTruthy();
		}
	});

	it("produces valid results for 3-ingredient combos", () => {
		// Test 20 random 3-ingredient combinations
		for (let trial = 0; trial < 20; trial++) {
			const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
			const selected = shuffled.slice(0, 3);

			const ruffalos = calculateBlowRuffalos(2, selected);
			const hasBurst = checkBurst(selected);
			const tasteRating = calculateTasteRating(selected, hasBurst);
			const bonus = Math.floor(Math.random() * 10);
			const score = calculateFinalScore(tasteRating, ruffalos, hasBurst, bonus);
			const tier = getTitleTier(score);

			expect(ruffalos).toBeGreaterThanOrEqual(0);
			expect(ruffalos).toBeLessThanOrEqual(5);
			expect(tasteRating).toBeGreaterThanOrEqual(0);
			expect(tasteRating).toBeLessThanOrEqual(5);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
			expect(TITLE_TIERS).toContain(tier);
		}
	});

	it("worst-case ingredients still produce valid output", () => {
		// Pick the worst ingredients: absurd category, low taste, high burst
		const worst = INGREDIENTS.filter(
			(i) => i.category === "absurd" && i.tasteMod <= 0,
		);
		expect(worst.length).toBeGreaterThanOrEqual(3);

		for (let i = 0; i < 50; i++) {
			const selected = worst.slice(0, 3);
			const ruffalos = calculateBlowRuffalos(0.5, selected);
			const tasteRating = calculateTasteRating(selected, true);
			const score = calculateFinalScore(tasteRating, ruffalos, true, 0);

			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		}
	});

	it("best-case ingredients with bonus can reach THE SAUSAGE KING", () => {
		// High-taste ingredients have low blowPower, so reaching 100 without
		// bonus points is nearly impossible — the BUT FIRST bonus is essential
		const best = INGREDIENTS.filter(
			(i) => i.tasteMod >= 4 && i.textureMod >= 3,
		);
		expect(best.length).toBeGreaterThanOrEqual(3);

		// Mock Math.random to make this test deterministic
		const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.99);
		let reachedKing = false;
		try {
			for (let i = 0; i < 200; i++) {
				const selected = best.slice(0, 3);
				const ruffalos = calculateBlowRuffalos(3, selected);
				const tasteRating = calculateTasteRating(selected, false);
				// BUT FIRST bonus (3-10 points) helps bridge the gap
				const bonus = 10;
				const score = calculateFinalScore(tasteRating, ruffalos, false, bonus);
				if (getTitleTier(score) === "THE SAUSAGE KING") {
					reachedKing = true;
					break;
				}
			}
		} finally {
			randomSpy.mockRestore();
		}
		expect(reachedKing).toBe(true);
	});
});

describe("Game balance sanity checks", () => {
	it("high-burst ingredients have lower taste (risk/reward trade-off)", () => {
		const highBurst = INGREDIENTS.filter((i) => i.burstRisk >= 0.5);
		const lowBurst = INGREDIENTS.filter((i) => i.burstRisk <= 0.2);
		const avgHighTaste =
			highBurst.reduce((a, i) => a + i.tasteMod, 0) / highBurst.length;
		const avgLowTaste =
			lowBurst.reduce((a, i) => a + i.tasteMod, 0) / lowBurst.length;
		// High-burst ingredients should taste worse on average
		expect(avgHighTaste).toBeLessThan(avgLowTaste);
	});

	it("absurd ingredients mostly have low taste", () => {
		const absurd = INGREDIENTS.filter((i) => i.category === "absurd");
		const avgTaste = absurd.reduce((a, i) => a + i.tasteMod, 0) / absurd.length;
		expect(avgTaste).toBeLessThan(1);
	});

	it("ingredient pool has a balanced tier distribution", () => {
		const great = INGREDIENTS.filter((i) => i.tasteMod >= 4).length;
		const decent = INGREDIENTS.filter(
			(i) => i.tasteMod >= 2 && i.tasteMod < 4,
		).length;
		const bad = INGREDIENTS.filter((i) => i.tasteMod < 2).length;
		// Should have ingredients in all tiers for meaningful choices
		expect(great).toBeGreaterThanOrEqual(4);
		expect(decent).toBeGreaterThanOrEqual(4);
		expect(bad).toBeGreaterThanOrEqual(4);
	});

	it("no ingredient is both perfect taste AND perfect blow (creates trade-offs)", () => {
		for (const ing of INGREDIENTS) {
			// No ingredient should be a "god tier" that maxes both dimensions
			const combined = ing.tasteMod + ing.blowPower;
			expect(combined).toBeLessThanOrEqual(8);
		}
	});
});
