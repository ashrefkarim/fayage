import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

interface LanguageToggleProps {
  light?: boolean;
}

export function LanguageToggle({ light = false }: LanguageToggleProps) {
  const { theme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const handleToggle = async (lang: "fr" | "ar") => {
    if (lang !== language) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLanguage(lang);
    }
  };

  const backgroundColor = light ? "rgba(255,255,255,0.2)" : theme.backgroundSecondary;
  const activeColor = light ? "#FFFFFF" : theme.primary;
  const inactiveTextColor = light ? "rgba(255,255,255,0.7)" : theme.text;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Pressable
        onPress={() => handleToggle("fr")}
        style={[
          styles.option,
          language === "fr" && { backgroundColor: activeColor },
        ]}
      >
        <ThemedText
          style={[
            styles.text,
            { color: language === "fr" ? (light ? theme.primary : "#FFFFFF") : inactiveTextColor },
          ]}
        >
          FR
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => handleToggle("ar")}
        style={[
          styles.option,
          language === "ar" && { backgroundColor: activeColor },
        ]}
      >
        <ThemedText
          style={[
            styles.text,
            { color: language === "ar" ? (light ? theme.primary : "#FFFFFF") : inactiveTextColor },
          ]}
        >
          AR
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  option: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
});
