import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

interface SausageRatingProps {
	count: number;
	max?: number;
	size?: number;
}

export const SausageRating: React.FC<SausageRatingProps> = ({
	count,
	max = 5,
	size = 32,
}) => {
	const scaleAnims = useRef<Animated.Value[]>(
		Array.from({ length: max }, () => new Animated.Value(0)),
	).current;

	useEffect(() => {
		// Reset all to 0
		scaleAnims.forEach((anim) => anim.setValue(0));

		// Stagger scale-in animations
		const animations = scaleAnims.map((anim, index) =>
			Animated.timing(anim, {
				toValue: 1,
				duration: 300,
				delay: index * 150,
				useNativeDriver: true,
			}),
		);

		Animated.parallel(animations).start();
	}, [count, max]);

	return (
		<View style={styles.row}>
			{Array.from({ length: max }, (_, i) => {
				const isActive = i < count;
				const scale = scaleAnims[i]
					? scaleAnims[i].interpolate({
							inputRange: [0, 0.5, 0.8, 1],
							outputRange: [0, 1.2, 0.9, 1],
						})
					: 1;

				return (
					<Animated.View
						key={i}
						style={[
							styles.emojiContainer,
							{
								transform: [
									{
										scale: isActive
											? (scale as unknown as number)
											: Animated.multiply(
													scaleAnims[i] || new Animated.Value(1),
													0.7,
												),
									},
								],
								opacity: isActive
									? (scaleAnims[i] as unknown as number)
									: Animated.multiply(
											scaleAnims[i] || new Animated.Value(1),
											0.25,
										),
							},
						]}
					>
						<Text style={[styles.emoji, { fontSize: size }]}>
							{"\uD83C\uDF2D"}
						</Text>
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
		gap: 4,
	},
	emojiContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	emoji: {
		textAlign: "center",
	},
});
