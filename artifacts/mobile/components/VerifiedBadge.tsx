import React from "react";
import { View, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface VerifiedBadgeProps {
  size?: "small" | "medium" | "large";
}

export function VerifiedBadge({ size = "medium" }: VerifiedBadgeProps) {
  const { theme } = useTheme();

  const sizeConfig = {
    small: { container: 16, icon: 10 },
    medium: { container: 20, icon: 12 },
    large: { container: 28, icon: 16 },
  };

  const config = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.verifiedBadge,
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
        },
      ]}
    >
      <Icon name="check" size={config.icon} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
