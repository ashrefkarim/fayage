import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const isIOS = Platform.OS === "ios";

  return {
    headerTitleAlign: "center",
    headerTransparent: isIOS ? transparent : false,
    headerBlurEffect: isIOS ? (isDark ? "dark" : "light") : undefined,
    headerTintColor: theme.text,
    headerShadowVisible: !isIOS,
    headerStyle: {
      backgroundColor: isIOS ? undefined : theme.backgroundRoot,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
