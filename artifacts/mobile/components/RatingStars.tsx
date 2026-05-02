import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface RatingStarsProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  starColor?: string;
}

export function RatingStars({
  rating,
  size = 24,
  interactive = false,
  onRatingChange,
  starColor,
}: RatingStarsProps) {
  const { theme } = useTheme();
  const activeColor = starColor || theme.warning;

  const handlePress = async (star: number) => {
    if (!interactive || !onRatingChange) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRatingChange(star);
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        return (
          <Pressable
            key={star}
            onPress={() => handlePress(star)}
            disabled={!interactive}
            style={({ pressed }) => [
              styles.star,
              { opacity: pressed && interactive ? 0.7 : 1 },
            ]}
          >
            <Icon
              name="star"
              size={size}
              color={isFilled ? activeColor : theme.border}
              style={{ opacity: isFilled ? 1 : 0.5 }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  star: {
    padding: 2,
  },
});
