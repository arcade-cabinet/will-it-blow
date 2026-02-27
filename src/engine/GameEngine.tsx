import React, {
	createContext,
	type ReactNode,
	useContext,
	useRef,
	useState,
} from "react";
import type { GamePhase } from "./Constants";
import type { Ingredient } from "./Ingredients";
import { audioEngine } from "./AudioEngine";

interface GameContextType {
	phase: GamePhase;
	setPhase: (phase: GamePhase) => void;
	ingredients: Ingredient[];
	setIngredients: (ingredients: Ingredient[]) => void;
	grindProgress: number;
	setGrindProgress: (v: number | ((p: number) => number)) => void;
	stuffProgress: number;
	setStuffProgress: (v: number | ((p: number) => number)) => void;
	ruffalos: number;
	setRuffalos: (v: number) => void;
	hasBurst: boolean;
	setHasBurst: (v: boolean) => void;
	sausageRating: number;
	setSausageRating: (v: number) => void;
	bonusPoints: number;
	setBonusPoints: (v: number | ((p: number) => number)) => void;
	showButFirst: boolean;
	setShowButFirst: (v: boolean) => void;
	pendingPhase: GamePhase | null;
	setPendingPhase: (v: GamePhase | null) => void;
	butFirstUsed: React.MutableRefObject<boolean>;
	cookProgress: number;
	setCookProgress: (v: number | ((p: number) => number)) => void;
	tryButFirst: (nextPhase: GamePhase) => void;
	handleButFirstComplete: (bonus: number) => void;
	resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
	const [phase, setPhaseRaw] = useState<GamePhase>("title");
	const [ingredients, setIngredients] = useState<Ingredient[]>([]);
	const [grindProgress, setGrindProgress] = useState(0);
	const [stuffProgress, setStuffProgress] = useState(0);
	const [ruffalos, setRuffalos] = useState(0);
	const [hasBurst, setHasBurst] = useState(false);
	const [sausageRating, setSausageRating] = useState(0);
	const [bonusPoints, setBonusPoints] = useState(0);
	const [showButFirst, setShowButFirst] = useState(false);
	const [pendingPhase, setPendingPhase] = useState<GamePhase | null>(null);
	const [cookProgress, setCookProgress] = useState(0);
	const butFirstUsed = useRef(false);

	const setPhase = (newPhase: GamePhase) => {
		if (phase === "title" && newPhase !== "title") {
			audioEngine.initTone();
		}
		setPhaseRaw(newPhase);
	};

	const tryButFirst = (nextPhase: GamePhase) => {
		if (
			!butFirstUsed.current &&
			(nextPhase === "blow" || nextPhase === "cook") &&
			Math.random() > 0.4
		) {
			butFirstUsed.current = true;
			setPendingPhase(nextPhase);
			setShowButFirst(true);
		} else {
			setPhase(nextPhase);
		}
	};

	const handleButFirstComplete = (bonus: number) => {
		setBonusPoints((b) => b + bonus);
		setShowButFirst(false);
		if (pendingPhase) {
			setPhase(pendingPhase);
			setPendingPhase(null);
		}
	};

	const resetGame = () => {
		setPhaseRaw("title");
		setIngredients([]);
		setGrindProgress(0);
		setStuffProgress(0);
		setRuffalos(0);
		setHasBurst(false);
		setSausageRating(0);
		setBonusPoints(0);
		setShowButFirst(false);
		setPendingPhase(null);
		setCookProgress(0);
		butFirstUsed.current = false;
		audioEngine.stopEngine();
	};

	return (
		<GameContext.Provider
			value={{
				phase,
				setPhase,
				ingredients,
				setIngredients,
				grindProgress,
				setGrindProgress,
				stuffProgress,
				setStuffProgress,
				ruffalos,
				setRuffalos,
				hasBurst,
				setHasBurst,
				sausageRating,
				setSausageRating,
				bonusPoints,
				setBonusPoints,
				showButFirst,
				setShowButFirst,
				pendingPhase,
				setPendingPhase,
				butFirstUsed,
				cookProgress,
				setCookProgress,
				tryButFirst,
				handleButFirstComplete,
				resetGame,
			}}
		>
			{children}
		</GameContext.Provider>
	);
};

export const useGame = () => {
	const context = useContext(GameContext);
	if (!context) throw new Error("useGame must be used within a GameProvider");
	return context;
};
