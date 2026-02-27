import {
	INGREDIENTS,
	getRandomIngredientPool,
	CATEGORY_COLORS,
} from "../src/engine/Ingredients";

describe("INGREDIENTS data integrity", () => {
	it("has at least 12 ingredients (enough for a full pool)", () => {
		expect(INGREDIENTS.length).toBeGreaterThanOrEqual(12);
	});

	it("every ingredient has all required properties", () => {
		for (const ing of INGREDIENTS) {
			expect(ing.name).toBeTruthy();
			expect(ing.emoji).toBeTruthy();
			expect(ing.category).toBeTruthy();
			expect(typeof ing.tasteMod).toBe("number");
			expect(typeof ing.textureMod).toBe("number");
			expect(typeof ing.burstRisk).toBe("number");
			expect(typeof ing.blowPower).toBe("number");
			expect(ing.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(ing.shape).toBeDefined();
			expect(ing.shape.base).toBeTruthy();
		}
	});

	it("every ingredient has unique name", () => {
		const names = INGREDIENTS.map((i) => i.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("burstRisk is between 0 and 1 for all ingredients", () => {
		for (const ing of INGREDIENTS) {
			expect(ing.burstRisk).toBeGreaterThanOrEqual(0);
			expect(ing.burstRisk).toBeLessThanOrEqual(1);
		}
	});

	it("blowPower is between 0 and 5 for all ingredients", () => {
		for (const ing of INGREDIENTS) {
			expect(ing.blowPower).toBeGreaterThanOrEqual(0);
			expect(ing.blowPower).toBeLessThanOrEqual(5);
		}
	});

	it("tasteMod is between -1 and 5 for all ingredients", () => {
		for (const ing of INGREDIENTS) {
			expect(ing.tasteMod).toBeGreaterThanOrEqual(-1);
			expect(ing.tasteMod).toBeLessThanOrEqual(5);
		}
	});

	it("textureMod is between 0 and 5 for all ingredients", () => {
		for (const ing of INGREDIENTS) {
			expect(ing.textureMod).toBeGreaterThanOrEqual(0);
			expect(ing.textureMod).toBeLessThanOrEqual(5);
		}
	});

	it("every category has a corresponding color", () => {
		const categories = new Set(INGREDIENTS.map((i) => i.category));
		for (const cat of categories) {
			expect(CATEGORY_COLORS[cat]).toBeTruthy();
		}
	});
});

describe("getRandomIngredientPool", () => {
	it("returns the requested number of ingredients", () => {
		expect(getRandomIngredientPool(6).length).toBe(6);
		expect(getRandomIngredientPool(12).length).toBe(12);
	});

	it("returns default of 12 when called without arguments", () => {
		expect(getRandomIngredientPool().length).toBe(12);
	});

	it("returns no duplicate ingredients", () => {
		const pool = getRandomIngredientPool(12);
		const names = pool.map((i) => i.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("returns different results on multiple calls (randomized)", () => {
		const pools = Array.from({ length: 10 }, () =>
			getRandomIngredientPool(6)
				.map((i) => i.name)
				.sort()
				.join(","),
		);
		const unique = new Set(pools);
		// With 25+ ingredients and pool of 6, should get variety
		expect(unique.size).toBeGreaterThan(1);
	});

	it("only returns ingredients from the master list", () => {
		const masterNames = new Set(INGREDIENTS.map((i) => i.name));
		const pool = getRandomIngredientPool(12);
		for (const ing of pool) {
			expect(masterNames.has(ing.name)).toBe(true);
		}
	});
});
