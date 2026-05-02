import { Text, type TextProps, Platform } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "label" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    if (type === "caption" || type === "label") {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    const isHeading = ["display", "h1", "h2", "h3", "h4"].includes(type);
    const fontFamily = isHeading ? "Poppins_600SemiBold" : undefined;

    switch (type) {
      case "display":
        return { ...Typography.display, fontFamily };
      case "h1":
        return { ...Typography.h1, fontFamily };
      case "h2":
        return { ...Typography.h2, fontFamily };
      case "h3":
        return { ...Typography.h3, fontFamily: "Poppins_500Medium" };
      case "h4":
        return { ...Typography.h4, fontFamily: "Poppins_500Medium" };
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "caption":
        return Typography.caption;
      case "label":
        return Typography.label;
      case "link":
        return { ...Typography.link, fontFamily: "Poppins_500Medium" };
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
