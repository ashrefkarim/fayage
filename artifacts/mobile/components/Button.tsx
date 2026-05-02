import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Gradients, Shadows } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children?: ReactNode;
  title?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  title,
  loading = false,
  style,
  disabled = false,
  variant = "primary",
  size = "md",
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getHeight = () => {
    switch (size) {
      case "sm": return 44;
      case "lg": return 60;
      default: return Spacing.buttonHeight;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "sm": return 14;
      case "lg": return 18;
      default: return 16;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "outline":
      case "ghost":
        return theme.primary;
      default:
        return "#FFFFFF";
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={getTextColor()} size="small" />;
    }
    if (title !== undefined) {
      return (
        <ThemedText style={[styles.buttonText, { color: getTextColor(), fontSize: getFontSize() }]}>
          {title}
        </ThemedText>
      );
    }
    if (typeof children === "string") {
      return (
        <ThemedText style={[styles.buttonText, { color: getTextColor(), fontSize: getFontSize() }]}>
          {children}
        </ThemedText>
      );
    }
    return children;
  };

  if (variant === "primary" || variant === "secondary") {
    const gradientColors = variant === "primary"
      ? Gradients.primary as [string, string]
      : Gradients.accent as [string, string];

    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          { opacity: isDisabled ? 0.5 : 1 },
          animatedStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            Shadows.md,
            { height: getHeight() },
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          height: getHeight(),
          backgroundColor: "transparent",
          borderWidth: variant === "outline" ? 2 : 0,
          borderColor: theme.primary,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
        animatedStyle,
      ]}
    >
      {renderContent()}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
});
