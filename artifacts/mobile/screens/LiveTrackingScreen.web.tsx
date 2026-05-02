import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type LiveTrackingRouteProp = RouteProp<RootStackParamList, "LiveTracking">;

export default function LiveTrackingScreen() {
  const headerHeight = useHeaderPadding();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const route = useRoute<LiveTrackingRouteProp>();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
      <View style={styles.webFallback}>
        <Icon name="map" size={64} color={theme.textSecondary} />
        <ThemedText type="h2" style={styles.webFallbackTitle}>
          {t("liveTracking")}
        </ThemedText>
        <ThemedText type="body" style={[styles.webFallbackText, { color: theme.textSecondary }]}>
          {t("useExpoGo")}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  webFallbackTitle: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  webFallbackText: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
});
