import {
	SONGS,
	FAN_ART,
	PHASE_STEPS,
	PHASE_LABELS,
	PHASE_EMOJIS,
	MR_SAUSAGE_LINES,
	GRINDER_TURN_ON_ITEMS,
	TASTE_QUOTES,
	TITLE_TIERS,
} from "../src/engine/Constants";

describe("PHASE_STEPS", () => {
	it("has 6 gameplay phases (excludes title and results)", () => {
		expect(PHASE_STEPS).toHaveLength(6);
	});

	it("follows correct order: select → grind → stuff → blow → cook → taste", () => {
		expect(PHASE_STEPS).toEqual([
			"select",
			"grind",
			"stuff",
			"blow",
			"cook",
			"taste",
		]);
	});

	it("has matching labels and emojis arrays", () => {
		expect(PHASE_LABELS).toHaveLength(PHASE_STEPS.length);
		expect(PHASE_EMOJIS).toHaveLength(PHASE_STEPS.length);
	});
});

describe("TASTE_QUOTES", () => {
	it("has exactly 6 quotes (indices 0-5 for taste ratings)", () => {
		expect(TASTE_QUOTES).toHaveLength(6);
	});

	it("every quote is a non-empty string", () => {
		for (const quote of TASTE_QUOTES) {
			expect(typeof quote).toBe("string");
			expect(quote.length).toBeGreaterThan(0);
		}
	});
});

describe("TITLE_TIERS", () => {
	it("has exactly 6 tiers", () => {
		expect(TITLE_TIERS).toHaveLength(6);
	});

	it("matches the tiers in getTitleTier function", () => {
		expect(TITLE_TIERS).toEqual([
			"Sausage Disaster",
			"Sausage Apprentice",
			"Sausage Maker",
			"Sausage Chef",
			"Sausage Master",
			"THE SAUSAGE KING",
		]);
	});
});

describe("MR_SAUSAGE_LINES", () => {
	const gameplayPhases = ["select", "grind", "stuff", "blow", "cook", "taste", "results"];

	it("has lines for every gameplay phase", () => {
		for (const phase of gameplayPhases) {
			expect(MR_SAUSAGE_LINES[phase]).toBeDefined();
			expect(MR_SAUSAGE_LINES[phase].length).toBeGreaterThanOrEqual(3);
		}
	});

	it("every line is a non-empty string", () => {
		for (const phase of gameplayPhases) {
			for (const line of MR_SAUSAGE_LINES[phase]) {
				expect(typeof line).toBe("string");
				expect(line.length).toBeGreaterThan(0);
			}
		}
	});
});

describe("Content arrays", () => {
	it("SONGS has at least 5 songs", () => {
		expect(SONGS.length).toBeGreaterThanOrEqual(5);
	});

	it("FAN_ART has at least 5 entries", () => {
		expect(FAN_ART.length).toBeGreaterThanOrEqual(5);
	});

	it("GRINDER_TURN_ON_ITEMS has at least 5 items", () => {
		expect(GRINDER_TURN_ON_ITEMS.length).toBeGreaterThanOrEqual(5);
	});
});
