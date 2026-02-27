export const SONGS = [
	"🎵 Don't Fear The Sausage 🎵",
	"🎵 Bohemian Sausage-dy 🎵",
	"🎵 Sweet Sausage O' Mine 🎵",
	"🎵 Sausage In A Bottle 🎵",
	"🎵 Livin' On A Sausage 🎵",
	"🎵 Hotel Sausage-fornia 🎵",
	"🎵 Stairway To Sausage 🎵",
	"🎵 We Will Sausage You 🎵",
];

export const FAN_ART = [
	"a sausage wearing sunglasses riding a skateboard",
	"Mr. Sausage as a superhero with a cape",
	"a sausage fighting a giant lobster in space",
	"the grinder as a noble castle with sausage flags",
	"Mrs. Sausage chasing Mr. Sausage with a mop",
	"a sausage link chain holding up the Statue of Liberty",
	"Mark Ruffalo made entirely of tiny sausages",
	"a sausage in a hot tub full of mustard",
	"a sausage graduating from culinary school",
	"Mr. Potato Sausage running for president",
];

export type GamePhase =
	| "title"
	| "select"
	| "grind"
	| "stuff"
	| "blow"
	| "cook"
	| "taste"
	| "results";

export const PHASE_STEPS: GamePhase[] = [
	"select",
	"grind",
	"stuff",
	"blow",
	"cook",
	"taste",
];
export const PHASE_LABELS = ["Pick", "Grind", "Stuff", "Blow", "Cook", "Taste"];
export const PHASE_EMOJIS = ["🛒", "⚙️", "🫙", "🌬️", "🔥", "😋"];

export const MR_SAUSAGE_LINES: Record<string, string[]> = {
	select: [
		"Well hey 'dere folks! Pick your poison!",
		"Choose wisely... or don't. It's all sausage.",
		"Ooh, some interesting options today!",
		"What are we sausaging today, folks?",
		"Remember: there are no bad sausages... okay maybe some.",
	],
	grind: [
		"Get in there! Into the grinder!",
		"BZZZZZZ! Love that sound!",
		"This is going to be... something!",
		"Keep grinding, we're almost there!",
		"The grinder is HUNGRY today!",
	],
	stuff: [
		"Three... two... one... LET'S SAUSAGE!",
		"Pack it in nice and tight!",
		"Looking like a beautiful sausage!",
		"Fill 'er up! Fill 'er up!",
		"That casing is holding up great!",
	],
	blow: [
		"So will it blow?!",
		"Mrs. Sausage is NOT gonna be happy...",
		"This is gonna be messy, I can feel it!",
		"Watch the wall! Watch the wall!",
		"Mark Ruffalo would be proud!",
	],
	cook: [
		"HERE WE GO! Into the pan!",
		"Sizzle sizzle, baby!",
		"Oh man, please don't burst...",
		"Smells... like something cooking!",
		"The moment of truth approaches!",
	],
	taste: [
		"Let's open it up and see how we did!",
		"Moment of truth, folks...",
		"Time for the taste test!",
		"I'm both excited and terrified!",
		"May God have mercy on my soul!",
	],
	results: [
		"And THAT'S how you sausage!",
		"Another one for the books!",
		"I'm the goddamn sausage king!",
		"This is a special message from Corporate!",
		"Subscribe and hit that sausage bell!",
	],
};

export const GRINDER_TURN_ON_ITEMS = [
	"his elbow",
	"a spatula",
	"a rubber duck",
	"his forehead",
	"a TV remote",
	"a banana",
	"his pinky toe",
	"a flip-flop",
	"Mrs. Sausage's keys",
];

export const TASTE_QUOTES = [
	"May God have mercy on my soul!",
	"It's... it's not great.",
	"Ehh, I've had worse.",
	"Hey, that's actually pretty decent!",
	"That's a darn good sausage!",
	"THIS IS THE GREATEST SAUSAGE EVER MADE!",
];

export const TITLE_TIERS = [
	"Sausage Disaster",
	"Sausage Apprentice",
	"Sausage Maker",
	"Sausage Chef",
	"Sausage Master",
	"THE SAUSAGE KING",
];
