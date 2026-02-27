import { INGREDIENTS } from "../src/engine/Ingredients";
import {
	getIngredientTags,
	matchesCriteria,
	filterMatchingIngredients,
	IngredientCriteria,
} from "../src/engine/IngredientMatcher";

const findByName = (name: string) =>
	INGREDIENTS.find((i) => i.name === name)!;

describe("getIngredientTags", () => {
	it("returns a tags array for any ingredient", () => {
		for (const ing of INGREDIENTS) {
			const tags = getIngredientTags(ing);
			expect(Array.isArray(tags)).toBe(true);
			expect(tags.length).toBeGreaterThan(0);
		}
	});

	it("Lobster has fancy and meat tags", () => {
		const tags = getIngredientTags(findByName("Lobster"));
		expect(tags).toContain("fancy");
		expect(tags).toContain("meat");
	});

	it("Candy Cane has sweet tag", () => {
		const tags = getIngredientTags(findByName("Candy Cane"));
		expect(tags).toContain("sweet");
	});

	it("Big Mac has savory and fast-food tags", () => {
		const tags = getIngredientTags(findByName("Big Mac"));
		expect(tags).toContain("savory");
		expect(tags).toContain("fast-food");
	});
});

describe("matchesCriteria", () => {
	it("matches when ingredient has all required tags", () => {
		const lobster = findByName("Lobster");
		const criteria: IngredientCriteria = { tags: ["fancy"] };
		expect(matchesCriteria(lobster, criteria)).toBe(true);
	});

	it("does not match when missing a tag", () => {
		const candyCane = findByName("Candy Cane");
		const criteria: IngredientCriteria = { tags: ["savory"] };
		expect(matchesCriteria(candyCane, criteria)).toBe(false);
	});

	it("works with multi-tag criteria", () => {
		const lobster = findByName("Lobster");
		const criteria: IngredientCriteria = {
			tags: ["fancy", "meat", "chunky"],
		};
		expect(matchesCriteria(lobster, criteria)).toBe(true);

		const missingCriteria: IngredientCriteria = {
			tags: ["fancy", "sweet"],
		};
		expect(matchesCriteria(lobster, missingCriteria)).toBe(false);
	});
});

describe("filterMatchingIngredients", () => {
	it("returns only matching ingredients", () => {
		const criteria: IngredientCriteria = { tags: ["absurd", "smooth"] };
		const results = filterMatchingIngredients(INGREDIENTS, criteria);
		for (const ing of results) {
			const tags = getIngredientTags(ing);
			expect(tags).toContain("absurd");
			expect(tags).toContain("smooth");
		}
		expect(results.length).toBeGreaterThan(0);
	});

	it("returns fewer than total for any specific criteria", () => {
		const criteria: IngredientCriteria = { tags: ["fancy"] };
		const results = filterMatchingIngredients(INGREDIENTS, criteria);
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThan(INGREDIENTS.length);
	});
});
