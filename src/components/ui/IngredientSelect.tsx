import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Animated,
	StyleSheet,
	Dimensions,
} from "react-native";
import { useGame } from "../../engine/GameEngine";
import {
	getRandomIngredientPool,
	CATEGORY_COLORS,
	type Ingredient,
} from "../../engine/Ingredients";

const MAX_SELECTIONS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = SCREEN_WIDTH >= 500 ? 3 : 2;
const CARD_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH =
	(SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
	NUM_COLUMNS;

export const IngredientSelect: React.FC = () => {
	const { setIngredients, setPhase } = useGame();
	const [pool, setPool] = useState<Ingredient[]>([]);
	const [selected, setSelected] = useState<Ingredient[]>([]);

	// Fade-in animation
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		setPool(getRandomIngredientPool(12));

		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 800,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const toggleIngredient = (ingredient: Ingredient) => {
		const isSelected = selected.some((s) => s.name === ingredient.name);
		if (isSelected) {
			setSelected(selected.filter((s) => s.name !== ingredient.name));
		} else if (selected.length < MAX_SELECTIONS) {
			setSelected([...selected, ingredient]);
		}
	};

	const handleConfirm = () => {
		if (selected.length >= 1) {
			setIngredients(selected);
			setPhase("grind");
		}
	};

	const isSelected = (ingredient: Ingredient) =>
		selected.some((s) => s.name === ingredient.name);

	return (
		<Animated.View
			style={[
				styles.overlay,
				{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				},
			]}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>CHOOSE YOUR INGREDIENTS</Text>
				<Text style={styles.subtitle}>
					Pick 1-3 items to grind into a sausage!
				</Text>
			</View>

			{/* Ingredient grid */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.grid}
				showsVerticalScrollIndicator={false}
			>
				{pool.map((ingredient) => {
					const active = isSelected(ingredient);
					const categoryColor =
						CATEGORY_COLORS[ingredient.category] || "#888";

					return (
						<TouchableOpacity
							key={ingredient.name}
							style={[
								styles.card,
								{ width: CARD_WIDTH },
								active && {
									borderColor: ingredient.color,
									backgroundColor: `${ingredient.color}15`,
								},
							]}
							onPress={() => toggleIngredient(ingredient)}
							activeOpacity={0.7}
						>
							{/* Selection checkmark badge */}
							{active && (
								<View style={styles.checkBadge}>
									<Text style={styles.checkText}>{"\u2713"}</Text>
								</View>
							)}

							{/* Emoji */}
							<Text style={styles.emoji}>{ingredient.emoji}</Text>

							{/* Name */}
							<Text style={styles.ingredientName} numberOfLines={1}>
								{ingredient.name}
							</Text>

							{/* Category tag */}
							<Text style={[styles.categoryTag, { color: categoryColor }]}>
								{ingredient.category.toUpperCase()}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{/* Confirm button */}
			{selected.length >= 1 && (
				<View style={styles.confirmContainer}>
					<TouchableOpacity
						style={styles.confirmButton}
						onPress={handleConfirm}
						activeOpacity={0.8}
					>
						<Text style={styles.confirmText}>
							GRIND {selected.map((s) => s.emoji).join("")}{" "}
							{"\u2192"} {"\uD83C\uDF2D"}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.92)",
		zIndex: 100,
	},
	header: {
		alignItems: "center",
		paddingTop: 48,
		paddingBottom: 16,
		paddingHorizontal: HORIZONTAL_PADDING,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#FF6B35",
		textAlign: "center",
		letterSpacing: 1,
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 15,
		color: "#FFD54F",
		textAlign: "center",
		fontWeight: "600",
	},
	scrollView: {
		flex: 1,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: HORIZONTAL_PADDING,
		gap: CARD_GAP,
		paddingBottom: 100,
	},
	card: {
		backgroundColor: "#141414",
		borderWidth: 1.5,
		borderColor: "#282828",
		borderRadius: 12,
		padding: 14,
		alignItems: "center",
		position: "relative",
	},
	checkBadge: {
		position: "absolute",
		top: -6,
		right: -6,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#4CAF50",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2,
		borderWidth: 1.5,
		borderColor: "#141414",
	},
	checkText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "bold",
	},
	emoji: {
		fontSize: 34,
		textAlign: "center",
		marginBottom: 6,
	},
	ingredientName: {
		fontSize: 13,
		fontWeight: "bold",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: 4,
	},
	categoryTag: {
		fontSize: 9,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	confirmContainer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 20,
		paddingVertical: 16,
		paddingBottom: 32,
		backgroundColor: "rgba(0, 0, 0, 0.95)",
		borderTopWidth: 1,
		borderTopColor: "#282828",
	},
	confirmButton: {
		backgroundColor: "#FF6B35",
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	confirmText: {
		color: "#FFFFFF",
		fontSize: 20,
		fontWeight: "bold",
		letterSpacing: 1,
	},
});
