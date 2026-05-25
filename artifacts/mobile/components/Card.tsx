import React from "react";
import { StyleSheet, Pressable, ViewStyle, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface CardProps {
  elevation?: 0 | 1 | 2 | 3;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | null | undefined)[];
  pressable?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getShadowForElevation = (elevation: number) => {
  switch (elevation) {
    case 0: return {};
    case 1: return Shadows.sm;
    case 2: return Shadows.md;
    case 3: return Shadows.lg;
    default: return Shadows.sm;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
  pressable = true,
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable && onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (pressable && onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundDefault,
    },
    getShadowForElevation(elevation),
    animatedStyle,
    style,
  ];

  if (!onPress) {
    return (
      <Animated.View style={cardStyle}>
        {title ? (
          <ThemedText type="h4" style={styles.cardTitle}>
            {title}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText type="small" style={[styles.cardDescription, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        ) : null}
        {children}
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={cardStyle}
    >
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
    fontFamily: "Poppins_600SemiBold",
  },
  cardDescription: {
    marginBottom: Spacing.md,
  },
});
