import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

interface FloatingText {
	id: number;
	text: string;
	x: number;
	y: number;
	rotation: number;
	opacity: Animated.Value;
	translateY: Animated.Value;
}

interface SfxTextProps {
	texts: string[];
	active: boolean;
}

const MAX_VISIBLE = 6;

export const SfxText: React.FC<SfxTextProps> = ({ texts, active }) => {
	const [floaters, setFloaters] = useState<FloatingText[]>([]);
	const idCounter = useRef(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const spawnText = useCallback(() => {
		if (texts.length === 0) return;

		const id = idCounter.current++;
		const text = texts[Math.floor(Math.random() * texts.length)];
		const x = Math.random() * 80 + 5; // 5% to 85% horizontal
		const y = Math.random() * 60 + 20; // 20% to 80% vertical start
		const rotation = (Math.random() - 0.5) * 30; // -15 to +15 degrees

		const opacity = new Animated.Value(1);
		const translateY = new Animated.Value(0);

		const floater: FloatingText = { id, text, x, y, rotation, opacity, translateY };

		setFloaters((prev) => {
			// Enforce max visible: drop oldest if at capacity
			const updated = prev.length >= MAX_VISIBLE ? prev.slice(1) : prev;
			return [...updated, floater];
		});

		// Float upward and fade out over 1.5 seconds
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: -80,
				duration: 1500,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 1500,
				useNativeDriver: true,
			}),
		]).start(() => {
			// Clean up this floater after animation completes
			setFloaters((prev) => prev.filter((f) => f.id !== id));
		});
	}, [texts]);

	useEffect(() => {
		if (active) {
			// Spawn one immediately
			spawnText();
			// Then every 400ms
			intervalRef.current = setInterval(spawnText, 400);
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [active, spawnText]);

	return (
		<View style={styles.container} pointerEvents="none">
			{floaters.map((floater) => (
				<Animated.View
					key={floater.id}
					style={[
						styles.floatingTextWrapper,
						{
							left: `${floater.x}%`,
							top: `${floater.y}%`,
							transform: [
								{ translateY: floater.translateY as unknown as number },
								{ rotate: `${floater.rotation}deg` },
							],
							opacity: floater.opacity as unknown as number,
						},
					]}
				>
					<Animated.Text style={styles.floatingText}>
						{floater.text}
					</Animated.Text>
				</Animated.View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		overflow: "hidden",
	},
	floatingTextWrapper: {
		position: "absolute",
	},
	floatingText: {
		color: "#FFD54F",
		opacity: 0.35,
		fontSize: 28,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 2,
		textAlign: "center",
		textShadowColor: "rgba(255, 213, 79, 0.3)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 4,
	},
});
