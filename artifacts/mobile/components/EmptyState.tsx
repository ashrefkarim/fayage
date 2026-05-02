import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface EmptyStateProps {
  image: ImageSourcePropType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function EmptyState({ image, title, subtitle, children }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Glow backdrop */}
      <View style={styles.glowWrapper}>
        <LinearGradient
          colors={[theme.primary + "18", theme.primary + "06", "transparent"]}
          style={styles.glow}
        />
        <View style={[styles.imageCircle, { backgroundColor: theme.primary + "0C" }]}>
          <Image source={image} style={styles.image} resizeMode="contain" />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <ThemedText style={[styles.title, { color: theme.text }]}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {/* Decorative dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === 1 ? theme.primary : theme.primary + "40" },
              i === 1 && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["4xl"],
    gap: Spacing.lg,
  },

  /* Image area */
  glowWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  imageCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 120,
    height: 120,
  },

  /* Text */
  textBlock: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 260,
  },

  /* Decorative dots */
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
  },

  actions: {
    width: "100%",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
});
