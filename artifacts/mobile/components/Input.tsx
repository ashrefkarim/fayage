import React, { useState } from "react";
import { View, TextInput, StyleSheet, TextInputProps, Pressable } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  error?: string;
}

export function Input({ label, icon, error, style, secureTextEntry, ...props }: InputProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText 
          type="label"
          style={[
            styles.label, 
            { 
              textAlign: isRTL ? "right" : "left",
              color: isFocused ? theme.primary : theme.textSecondary,
            }
          ]}
        >
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          Shadows.sm,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: error ? theme.error : isFocused ? theme.primary : theme.border,
            borderWidth: isFocused ? 2 : 1,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        {icon ? (
          <View style={[styles.iconContainer, { backgroundColor: isFocused ? theme.primary + "15" : "transparent" }]}>
            <Icon
              name={icon}
              size={18}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          </View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              textAlign: isRTL ? "right" : "left",
            },
            style,
          ]}
          placeholderTextColor={theme.textSecondary + "80"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Icon
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={[styles.errorContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="alert-circle" size={12} color={theme.error} />
          <ThemedText style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    fontFamily: "Poppins_400Regular",
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: 12,
  },
});
