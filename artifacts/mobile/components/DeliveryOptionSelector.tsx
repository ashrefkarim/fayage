import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { DeliveryOptions, BorderRadius, Spacing } from "@/constants/theme";

interface DeliveryOptionSelectorProps {
  selected: string;
  onSelect: (option: string) => void;
}

export function DeliveryOptionSelector({ selected, onSelect }: DeliveryOptionSelectorProps) {
  const { theme } = useTheme();
  const { language, isRTL } = useLanguage();

  const getLabel = (option: typeof DeliveryOptions[number]) => {
    if (language === "ar") return option.labelAr;
    return option.labelFr;
  };

  const getIcon = (optionId: string): IconName => {
    switch (optionId) {
      case "standard":
        return "clock";
      case "urgent":
        return "zap";
      case "express":
        return "fast-forward";
      default:
        return "clock";
    }
  };

  return (
    <View style={[styles.container, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      {DeliveryOptions.map((option) => {
        const isSelected = selected === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                borderColor: isSelected ? theme.primary : theme.border,
                opacity: pressed ? 0.8 : 1,
                flex: 1,
              },
            ]}
          >
            <Icon
              name={getIcon(option.id)}
              size={20}
              color={isSelected ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.label,
                { color: isSelected ? "#FFFFFF" : theme.text },
              ]}
            >
              {getLabel(option)}
            </ThemedText>
            <ThemedText
              style={[
                styles.multiplier,
                { color: isSelected ? "#FFFFFF99" : theme.textSecondary },
              ]}
            >
              x{option.multiplier}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  multiplier: {
    fontSize: 11,
    fontWeight: "400",
  },
});
