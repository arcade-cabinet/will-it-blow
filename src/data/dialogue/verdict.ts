import type { DialogueLine } from "../../engine/DialogueEngine";

export const VERDICT_S: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "...",
		reaction: "judging",
	},
	{
		speaker: "sausage",
		text: "This... this is PERFECT.",
		reaction: "excitement",
	},
	{
		speaker: "sausage",
		text: "THE SAUSAGE KING. You've earned it.",
		reaction: "nod",
	},
];

export const VERDICT_A: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "...",
		reaction: "judging",
	},
	{
		speaker: "sausage",
		text: "Acceptable. But not perfect. Again.",
		reaction: "talk",
	},
];

export const VERDICT_B: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "...",
		reaction: "judging",
	},
	{
		speaker: "sausage",
		text: "Mediocre. Disappointing.",
		reaction: "disgust",
	},
];

export const VERDICT_F: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "...",
		reaction: "judging",
	},
	{
		speaker: "sausage",
		text: "Unacceptable.",
		reaction: "disgust",
	},
	{
		speaker: "sausage",
		text: "You are the sausage now.",
		reaction: "laugh",
	},
];
