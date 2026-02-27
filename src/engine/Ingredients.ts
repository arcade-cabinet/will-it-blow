export type IngredientShape =
	| { base: "sphere"; detail?: "wobbly" }
	| { base: "box"; detail?: "rounded" }
	| { base: "cylinder"; detail?: "flat" }
	| { base: "elongated"; detail?: "claws" }
	| { base: "wedge" }
	| { base: "cone" }
	| { base: "small-sphere" }
	| { base: "irregular" };

export interface Ingredient {
	name: string;
	emoji: string;
	category:
		| "fast food"
		| "canned"
		| "fancy"
		| "absurd"
		| "sweet"
		| "spicy"
		| "comfort"
		| "international";
	tasteMod: number;
	textureMod: number;
	burstRisk: number;
	blowPower: number;
	color: string;
	shape: IngredientShape;
}

export const INGREDIENTS: Ingredient[] = [
	{
		name: "Big Mac",
		emoji: "🍔",
		category: "fast food",
		tasteMod: 3,
		textureMod: 3,
		burstRisk: 0.2,
		blowPower: 2,
		color: "#D4A017",
		shape: { base: "box", detail: "rounded" },
	},
	{
		name: "SpaghettiOs",
		emoji: "🍝",
		category: "canned",
		tasteMod: 2,
		textureMod: 1,
		burstRisk: 0.5,
		blowPower: 4,
		color: "#E85D2C",
		shape: { base: "sphere", detail: "wobbly" },
	},
	{
		name: "Lobster",
		emoji: "🦞",
		category: "fancy",
		tasteMod: 5,
		textureMod: 4,
		burstRisk: 0.1,
		blowPower: 1,
		color: "#C41E3A",
		shape: { base: "elongated", detail: "claws" },
	},
	{
		name: "Water",
		emoji: "💧",
		category: "absurd",
		tasteMod: 0,
		textureMod: 0,
		burstRisk: 0.9,
		blowPower: 5,
		color: "#4FC3F7",
		shape: { base: "sphere", detail: "wobbly" },
	},
	{
		name: "Air",
		emoji: "💨",
		category: "absurd",
		tasteMod: 0,
		textureMod: 0,
		burstRisk: 0.1,
		blowPower: 0,
		color: "#E0E0E0",
		shape: { base: "sphere" },
	},
	{
		name: "Candy Cane",
		emoji: "🍬",
		category: "sweet",
		tasteMod: 3,
		textureMod: 2,
		burstRisk: 0.3,
		blowPower: 2,
		color: "#FF1744",
		shape: { base: "cone" },
	},
	{
		name: "Carolina Reaper",
		emoji: "🌶️",
		category: "spicy",
		tasteMod: 1,
		textureMod: 2,
		burstRisk: 0.6,
		blowPower: 3,
		color: "#B71C1C",
		shape: { base: "small-sphere" },
	},
	{
		name: "Chicken Soup",
		emoji: "🍲",
		category: "comfort",
		tasteMod: 4,
		textureMod: 3,
		burstRisk: 0.4,
		blowPower: 3,
		color: "#FFC107",
		shape: { base: "sphere", detail: "wobbly" },
	},
	{
		name: "Elmer's Glue",
		emoji: "🧴",
		category: "absurd",
		tasteMod: 0,
		textureMod: 1,
		burstRisk: 0.7,
		blowPower: 1,
		color: "#FAFAFA",
		shape: { base: "cylinder" },
	},
	{
		name: "Beef Wellington",
		emoji: "🥩",
		category: "fancy",
		tasteMod: 5,
		textureMod: 5,
		burstRisk: 0.15,
		blowPower: 2,
		color: "#8D6E63",
		shape: { base: "box", detail: "rounded" },
	},
	{
		name: "Habanero",
		emoji: "🫑",
		category: "spicy",
		tasteMod: 1,
		textureMod: 2,
		burstRisk: 0.4,
		blowPower: 3,
		color: "#FF6D00",
		shape: { base: "small-sphere" },
	},
	{
		name: "Jawbreaker",
		emoji: "🔴",
		category: "absurd",
		tasteMod: 1,
		textureMod: 0,
		burstRisk: 0.5,
		blowPower: 1,
		color: "#E040FB",
		shape: { base: "small-sphere" },
	},
	{
		name: "Pad Thai",
		emoji: "🍜",
		category: "international",
		tasteMod: 4,
		textureMod: 3,
		burstRisk: 0.3,
		blowPower: 3,
		color: "#FF8A65",
		shape: { base: "sphere", detail: "wobbly" },
	},
	{
		name: "Taco Bell Crunchwrap",
		emoji: "🌮",
		category: "fast food",
		tasteMod: 3,
		textureMod: 2,
		burstRisk: 0.3,
		blowPower: 2,
		color: "#7B1FA2",
		shape: { base: "cylinder", detail: "flat" },
	},
	{
		name: "Cotton Candy",
		emoji: "🍭",
		category: "sweet",
		tasteMod: 2,
		textureMod: 1,
		burstRisk: 0.6,
		blowPower: 4,
		color: "#F48FB1",
		shape: { base: "sphere" },
	},
	{
		name: "Vanilla Cake",
		emoji: "🎂",
		category: "sweet",
		tasteMod: 4,
		textureMod: 3,
		burstRisk: 0.25,
		blowPower: 2,
		color: "#FFF9C4",
		shape: { base: "cylinder" },
	},
	{
		name: "Pizza",
		emoji: "🍕",
		category: "fast food",
		tasteMod: 4,
		textureMod: 3,
		burstRisk: 0.3,
		blowPower: 3,
		color: "#F57C00",
		shape: { base: "cylinder", detail: "flat" },
	},
	{
		name: "Dirt",
		emoji: "🟤",
		category: "absurd",
		tasteMod: 0,
		textureMod: 1,
		burstRisk: 0.2,
		blowPower: 1,
		color: "#5D4037",
		shape: { base: "irregular" },
	},
	{
		name: "Rice Crispy Treat",
		emoji: "🍚",
		category: "sweet",
		tasteMod: 5,
		textureMod: 4,
		burstRisk: 0.15,
		blowPower: 2,
		color: "#FFE082",
		shape: { base: "box" },
	},
	{
		name: "Sushi Party Tray",
		emoji: "🍣",
		category: "fancy",
		tasteMod: 5,
		textureMod: 4,
		burstRisk: 0.2,
		blowPower: 2,
		color: "#EF5350",
		shape: { base: "box", detail: "rounded" },
	},
	{
		name: "Hot Pocket",
		emoji: "📦",
		category: "fast food",
		tasteMod: 2,
		textureMod: 2,
		burstRisk: 0.5,
		blowPower: 3,
		color: "#1565C0",
		shape: { base: "box", detail: "rounded" },
	},
	{
		name: "Menthol Cough Drop",
		emoji: "💊",
		category: "absurd",
		tasteMod: -1,
		textureMod: 1,
		burstRisk: 0.3,
		blowPower: 2,
		color: "#00BFA5",
		shape: { base: "small-sphere" },
	},
	{
		name: "Mac & Cheese",
		emoji: "🧀",
		category: "comfort",
		tasteMod: 4,
		textureMod: 2,
		burstRisk: 0.4,
		blowPower: 3,
		color: "#FFCA28",
		shape: { base: "sphere", detail: "wobbly" },
	},
	{
		name: "Corn Dog",
		emoji: "🌽",
		category: "fast food",
		tasteMod: 3,
		textureMod: 3,
		burstRisk: 0.2,
		blowPower: 2,
		color: "#F9A825",
		shape: { base: "elongated" },
	},
	{
		name: "A Shoe",
		emoji: "👟",
		category: "absurd",
		tasteMod: 0,
		textureMod: 0,
		burstRisk: 0.8,
		blowPower: 1,
		color: "#616161",
		shape: { base: "irregular" },
	},
	{
		name: "Gummy Bears",
		emoji: "🐻",
		category: "sweet",
		tasteMod: 3,
		textureMod: 2,
		burstRisk: 0.5,
		blowPower: 3,
		color: "#E53935",
		shape: { base: "small-sphere" },
	},
];

export function getRandomIngredientPool(count = 12): Ingredient[] {
	const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

export const CATEGORY_COLORS: Record<string, string> = {
	"fast food": "#FF6B35",
	canned: "#E85D2C",
	fancy: "#FFD700",
	absurd: "#E040FB",
	sweet: "#F48FB1",
	spicy: "#FF1744",
	comfort: "#FFC107",
	international: "#4FC3F7",
};
