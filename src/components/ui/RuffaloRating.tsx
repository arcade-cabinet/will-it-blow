import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

interface RuffaloRatingProps {
	count: number;
}

export const RuffaloRating: React.FC<RuffaloRatingProps> = ({ count }) => {
	const scaleAnims = useRef<Animated.Value[]>(
		Array.from({ length: 5 }, () => new Animated.Value(0)),
	).current;

	useEffect(() => {
		// Reset all to 0
		scaleAnims.forEach((anim) => anim.setValue(0));

		// Stagger scale-in animations with 180ms delay per item
		const animations = scaleAnims.map((anim, index) =>
			Animated.timing(anim, {
				toValue: 1,
				duration: 350,
				delay: index * 180,
				useNativeDriver: true,
			}),
		);

		Animated.parallel(animations).start();
	}, [count]);

	return (
		<View style={styles.row}>
			{Array.from({ length: 5 }, (_, i) => {
				const isActive = i < count;
				const scale = scaleAnims[i]
					? scaleAnims[i].interpolate({
							inputRange: [0, 0.5, 0.8, 1],
							outputRange: [0, 1.15, 0.95, 1],
						})
					: 1;

				return (
					<Animated.View
						key={i}
						style={[
							styles.circleWrapper,
							{
								transform: [{ scale: scale as unknown as number }],
								opacity: scaleAnims[i] as unknown as number,
							},
						]}
					>
						<View
							style={[
								styles.circle,
								isActive ? styles.circleActive : styles.circleInactive,
							]}
						>
							<Text
								style={[
									styles.mrText,
									isActive ? styles.mrTextActive : styles.mrTextInactive,
								]}
							>
								MR
							</Text>
						</View>
					</Animated.View>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	circleWrapper: {
		alignItems: "center",
		justifyContent: "center",
	},
	circle: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
	},
	circleActive: {
		backgroundColor: "#4CAF50",
		borderColor: "#66BB6A",
		shadowColor: "#4CAF50",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 6,
		elevation: 4,
	},
	circleInactive: {
		backgroundColor: "#222",
		borderColor: "#333",
	},
	mrText: {
		fontSize: 14,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 0.5,
	},
	mrTextActive: {
		color: "#FFFFFF",
	},
	mrTextInactive: {
		color: "#444",
	},
});
