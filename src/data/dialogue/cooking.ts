import type { DialogueLine } from "../../engine/DialogueEngine";

export const COOKING_DIALOGUE: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "Last step. Cook my sausage to perfection.",
		reaction: "talk",
	},
	{
		speaker: "sausage",
		text: "Don't you DARE burn my beautiful creation.",
		reaction: "talk",
		choices: [
			{
				text: "What temperature?",
				response: {
					speaker: "sausage",
					text: "You'll know it's right when the skin sings. Listen carefully.",
					reaction: "nod",
				},
				effect: "hint",
			},
			{
				text: "I won't let you down.",
				response: {
					speaker: "sausage",
					text: "Famous last words. Prove it.",
					reaction: "talk",
				},
			},
		],
	},
];

export const COOKING_SUCCESS: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "Done. Now bring it to me.",
		reaction: "talk",
	},
];
