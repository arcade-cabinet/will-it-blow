import type { DialogueLine } from "../../engine/DialogueEngine";

export const STUFFING_DIALOGUE: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "Fill the casing. Gently.",
		reaction: "talk",
	},
	{
		speaker: "sausage",
		text: "Too much pressure and... well, you'll see.",
		reaction: "nervous",
		choices: [
			{
				text: "What happens if it bursts?",
				response: {
					speaker: "sausage",
					text: "Let's just say cleanup is... unpleasant. For everyone involved.",
					reaction: "laugh",
				},
			},
			{
				text: "Steady hands. Got it.",
				response: {
					speaker: "sausage",
					text: "Good. Confidence. I like that. Don't make me regret it.",
					reaction: "nod",
				},
			},
		],
	},
];

export const STUFFING_SUCCESS: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "Not a single tear. I'm... almost impressed.",
		reaction: "nod",
	},
];
