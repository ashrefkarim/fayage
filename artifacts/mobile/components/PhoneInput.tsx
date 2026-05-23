import React, { useState } from "react";
import { View, TextInput, StyleSheet, TextInputProps, Platform } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function PhoneInput({ label, error, value, onChangeText, style, ...props }: PhoneInputProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangeText(cleaned);
  };

  const displayValue = value.replace(/^\+212\s*/, '').replace(/^0/, '');

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
        <View style={[styles.iconContainer, { backgroundColor: isFocused ? theme.primary + "15" : "transparent" }]}>
          <Icon
            name="phone"
            size={18}
            color={isFocused ? theme.primary : theme.textSecondary}
          />
        </View>
        <View style={[styles.prefixContainer, { borderRightColor: theme.border }]}>
          <ThemedText style={[styles.prefix, { color: theme.text }]}>+212</ThemedText>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              textAlign: isRTL ? "right" : "left",
            },
            style,
          ]}
          placeholder="6XX XXX XXX"
          placeholderTextColor={theme.textSecondary + "80"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="phone-pad"
          value={displayValue}
          onChangeText={handleChangeText}
          maxLength={10}
          allowFontScaling={false}
          {...props}
        />
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
    minHeight: Spacing.inputHeight,
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
  prefixContainer: {
    paddingRight: Spacing.sm,
    borderRightWidth: 1,
    height: 24,
    justifyContent: "center",
  },
  prefix: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    includeFontPadding: false,
  } as any,
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "android" ? 10 : 0,
    fontFamily: "Poppins_400Regular",
    textAlignVertical: "center",
    includeFontPadding: false,
  } as any,
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
