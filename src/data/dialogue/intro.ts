import type { DialogueLine } from "../../engine/DialogueEngine";

export const INTRO_DIALOGUE: DialogueLine[] = [
	{
		speaker: "sausage",
		text: "Well, well, well...",
		reaction: "idle",
	},
	{
		speaker: "sausage",
		text: "Welcome to my kitchen. I hope you're comfortable.",
		reaction: "talk",
		choices: [
			{
				text: "Where am I?",
				response: {
					speaker: "sausage",
					text: "You're exactly where you need to be. No more questions.",
					reaction: "talk",
				},
				effect: "stall",
			},
			{
				text: "What do you want?",
				response: {
					speaker: "sausage",
					text: "What I've always wanted. The perfect sausage.",
					reaction: "nod",
				},
			},
			{
				text: "Let me out!",
				response: {
					speaker: "sausage",
					text: "The door opens when I say it opens. Focus.",
					reaction: "disgust",
				},
				effect: "anger",
			},
		],
	},
	{
		speaker: "sausage",
		text: "Here's how this works. You make my sausage. Make it RIGHT. And maybe you walk out of here.",
		reaction: "talk",
	},
	{
		speaker: "sausage",
		text: "Fail me... and everything in this room is meat. Or will be.",
		reaction: "nervous",
	},
];
