import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

const VEHICLE_TYPES: Record<string, { fr: string; ar: string }> = {
  tricycle: { fr: "Tricycle", ar: "دراجة ثلاثية" },
  van: { fr: "Fourgonnette", ar: "شاحنة صغيرة" },
  truck_3_5t: { fr: "Camion 3.5T", ar: "شاحنة 3.5 طن" },
  truck_10t: { fr: "Camion 10T", ar: "شاحنة 10 طن" },
  semi_trailer: { fr: "Semi-remorque", ar: "نصف مقطورة" },
};

interface FavoriteDriver {
  id: string;
  driverId: string;
  driver: {
    id: string;
    fullName: string;
    phone: string;
    avatarUrl?: string;
    rating: number;
    totalDeliveries: number;
    vehicleType: string;
    isVerified: boolean;
  };
}

export default function FavoriteDriversScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const { theme } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/clients/${user.id}/favorites`);
      const result = await response.json();
      if (result.success) {
        setFavorites(result.favorites.filter((f: any) => f.driver));
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (driverId: string) => {
    if (!user) return;
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}api/clients/${user.id}/favorites/${driverId}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (result.success) {
        setFavorites((prev) => prev.filter((f) => f.driverId !== driverId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const confirmRemove = (driver: FavoriteDriver) => {
    Alert.alert(
      t("removeFavorite"),
      `${t("confirmRemoveFavorite")} ${driver.driver.fullName}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("remove"),
          style: "destructive",
          onPress: () => handleRemoveFavorite(driver.driverId),
        },
      ]
    );
  };

  const getVehicleTypeName = (type: string) => {
    const vehicleType = VEHICLE_TYPES[type];
    if (!vehicleType) return type;
    return language === "ar" ? vehicleType.ar : vehicleType.fr;
  };

  const renderDriver = ({ item }: { item: FavoriteDriver }) => (
    <View
      style={[
        styles.driverCard,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <View style={[styles.cardContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {item.driver.avatarUrl ? (
          <Image source={{ uri: item.driver.avatarUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            style={styles.avatar}
          >
            <ThemedText style={styles.avatarText}>
              {item.driver.fullName?.charAt(0)?.toUpperCase() || "?"}
            </ThemedText>
          </LinearGradient>
        )}

        <View style={[styles.driverInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <View style={[styles.nameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <ThemedText type="body" style={styles.driverName}>
              {item.driver.fullName}
            </ThemedText>
            {item.driver.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={10} color="#FFF" />
              </View>
            ) : null}
          </View>

          <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.stat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Icon name="star" size={14} color={theme.secondary} />
              <ThemedText style={styles.statText}>
                {item.driver.rating?.toFixed(1) || "0.0"}
              </ThemedText>
            </View>
            <View style={[styles.stat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Icon name="truck" size={14} color={theme.textSecondary} />
              <ThemedText style={styles.statText}>
                {item.driver.totalDeliveries || 0}
              </ThemedText>
            </View>
            <View style={[styles.stat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Icon name="package" size={14} color={theme.textSecondary} />
              <ThemedText style={styles.statText}>
                {getVehicleTypeName(item.driver.vehicleType)}
              </ThemedText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => confirmRemove(item)}
          style={[styles.removeButton, { backgroundColor: theme.error + "15" }]}
        >
          <Icon name="heart" size={20} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "15" }]}>
        <Icon name="heart" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        {t("noFavoriteDrivers")}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t("noFavoriteDriversDesc")}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={[styles.header, { paddingTop: headerHeight + Spacing.md }]}
      >
        <ThemedText type="h2" style={styles.headerTitle}>
          {t("favoriteDrivers")}
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {favorites.length} {t("savedDrivers")}
        </ThemedText>
      </LinearGradient>

      <FlatList
        data={favorites}
        renderItem={renderDriver}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFavorites();
            }}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={loading ? null : renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  driverCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  driverInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameRow: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  driverName: {
    fontWeight: "600",
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: "#666",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 3,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
  },
});
