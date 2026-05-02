import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, VehicleTypes } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatWeight } from "@/utils/commission";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { icon: any; labelFr: string; bg: string; color: string }> = {
  delivered:  { icon: "check-circle", labelFr: "Livrée",   bg: "#DCFCE7", color: "#16A34A" },
  completed:  { icon: "check-circle", labelFr: "Livrée",   bg: "#DCFCE7", color: "#16A34A" },
  cancelled:  { icon: "x-circle",     labelFr: "Annulée",  bg: "#FEE2E2", color: "#DC2626" },
};

function HistoryCard({
  request,
  onPress,
  isRTL,
  language,
  t,
  theme,
  isDark,
  index,
}: {
  request: TransportRequest;
  onPress: () => void;
  isRTL: boolean;
  language: string;
  t: (key: string) => string;
  theme: any;
  isDark: boolean;
  index: number;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const statusKey = (request.status as string) === "completed" ? "delivered" : request.status;
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.delivered;

  const vehicle = VehicleTypes.find((v) => v.id === request.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar" ? vehicle.labelAr : vehicle.labelFr
    : request.vehicleType;

  const dateObj = request.deliveredAt
    ? new Date(request.deliveredAt)
    : new Date(request.updatedAt);
  const dayMonth = dateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const year = dateObj.getFullYear();

  const price = request.finalPrice || request.proposedPrice || 0;
  const isCancelled = request.status === "cancelled";

  const refId = request.orderNumber
    ? String(request.orderNumber).padStart(5, "0")
    : request.id.slice(-6).toUpperCase();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            transform: [{ scale: scaleAnim }],
            shadowColor: isDark ? "#000" : "#1E40AF",
          },
        ]}
      >
        {/* Top stripe accent */}
        <LinearGradient
          colors={isCancelled ? ["#DC2626", "#EF4444"] : ["#1E3A8A", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardTopStripe}
        >
          <View style={styles.cardStripeInner}>
            {/* Ref + Status */}
            <View style={styles.refRow}>
              <View style={styles.refBadge}>
                <ThemedText style={styles.refText}>#{refId}</ThemedText>
              </View>
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Icon name={cfg.icon} size={11} color={cfg.color} />
                <ThemedText style={[styles.statusText, { color: cfg.color }]}>{cfg.labelFr}</ThemedText>
              </View>
            </View>
            {/* Date */}
            <View style={styles.dateRow}>
              <Icon name="calendar" size={11} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.dateStripeText}>{dayMonth} {year}</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Route */}
          <View style={[styles.routeBlock, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Dots + line */}
            <View style={styles.routeTimeline}>
              <View style={[styles.routeCircle, { backgroundColor: "#10B981", borderColor: isDark ? "#1E293B" : "#fff" }]} />
              <View style={[styles.routeLineVert, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]} />
              <View style={[styles.routeCircle, { backgroundColor: "#EF4444", borderColor: isDark ? "#1E293B" : "#fff" }]} />
            </View>
            {/* Addresses */}
            <View style={styles.routeAddresses}>
              <View style={styles.routeAddressRow}>
                <ThemedText style={[styles.routeLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  {t("pickup") || "Départ"}
                </ThemedText>
                <ThemedText
                  style={[styles.routeAddress, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {request.pickupAddress}
                </ThemedText>
              </View>
              <View style={[styles.routeAddressRow, { marginTop: 10 }]}>
                <ThemedText style={[styles.routeLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  {t("delivery") || "Arrivée"}
                </ThemedText>
                <ThemedText
                  style={[styles.routeAddress, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {request.deliveryAddress}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

          {/* Footer */}
          <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Driver + meta */}
            <View style={[styles.driverSection, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {request.driverAvatarUrl ? (
                <Image source={{ uri: request.driverAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "#1E40AF22" : "#EFF6FF" }]}>
                  <Icon name="user" size={14} color="#2563EB" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.driverName, { color: theme.text }]} numberOfLines={1}>
                  {request.driverName || "—"}
                </ThemedText>
                <View style={[styles.metaChips, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.metaChip, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}>
                    <Icon name="truck" size={10} color={isDark ? "#94A3B8" : "#64748B"} />
                    <ThemedText style={[styles.metaChipText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      {vehicleLabel}
                    </ThemedText>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}>
                    <Icon name="package" size={10} color={isDark ? "#94A3B8" : "#64748B"} />
                    <ThemedText style={[styles.metaChipText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      {formatWeight(request.estimatedWeight)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Price badge */}
            <LinearGradient
              colors={isCancelled ? ["#FEE2E2", "#FECACA"] : ["#DCFCE7", "#BBF7D0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.priceBadge}
            >
              <ThemedText style={[styles.priceAmount, { color: isCancelled ? "#DC2626" : "#15803D" }]}>
                {price.toLocaleString()}
              </ThemedText>
              <ThemedText style={[styles.priceCurrency, { color: isCancelled ? "#DC2626" : "#15803D" }]}>
                MAD
              </ThemedText>
            </LinearGradient>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function ClientHistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getClientRequests, isLoading, refreshRequests } = useRequests();

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [])
  );

  const requests = user ? getClientRequests(user.id) : [];
  const completedRequests = requests.filter(
    (r) => r.status === "delivered" || r.status === "cancelled" || (r.status as string) === "completed"
  );

  const delivered = completedRequests.filter(
    (r) => r.status === "delivered" || (r.status as string) === "completed"
  );
  const cancelled = completedRequests.filter((r) => r.status === "cancelled");
  const totalSpent = delivered.reduce((sum, r) => sum + (r.finalPrice || r.proposedPrice || 0), 0);

  const handleRequestPress = (request: TransportRequest) => {
    navigation.navigate("RequestDetails", { requestId: request.id });
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Delivered stat */}
        <LinearGradient
          colors={["#064E3B", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statCard, { flex: 1.1 }]}
        >
          <View style={styles.statIconRing}>
            <Icon name="check-circle" size={18} color="#FFFFFF" />
          </View>
          <ThemedText style={styles.statNumber}>{delivered.length}</ThemedText>
          <ThemedText style={styles.statLabel}>{t("totalDeliveries") || "Livraisons"}</ThemedText>
        </LinearGradient>

        {/* Right column */}
        <View style={styles.statsCol}>
          {/* Total spent */}
          <LinearGradient
            colors={["#1E3A8A", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, styles.statCardSm]}
          >
            <View style={[styles.statIconRing, { width: 28, height: 28 }]}>
              <Icon name="dollar-sign" size={13} color="#FFFFFF" />
            </View>
            <ThemedText style={[styles.statNumber, { fontSize: 18 }]}>
              {totalSpent.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.statLabel}>MAD {t("spent") || "dépensés"}</ThemedText>
          </LinearGradient>

          {/* Cancelled */}
          <LinearGradient
            colors={["#7F1D1D", "#DC2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, styles.statCardSm]}
          >
            <View style={[styles.statIconRing, { width: 28, height: 28 }]}>
              <Icon name="x-circle" size={13} color="#FFFFFF" />
            </View>
            <ThemedText style={[styles.statNumber, { fontSize: 18 }]}>{cancelled.length}</ThemedText>
            <ThemedText style={styles.statLabel}>{t("cancelled") || "Annulées"}</ThemedText>
          </LinearGradient>
        </View>
      </View>

      {/* Section title */}
      <View style={styles.sectionTitle}>
        <View style={[styles.sectionTitleBar, { backgroundColor: "#2563EB" }]} />
        <ThemedText style={[styles.sectionTitleText, { color: theme.text }]}>
          {t("recentOrders") || "Commandes récentes"}
        </ThemedText>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: TransportRequest; index: number }) => (
    <HistoryCard
      request={item}
      onPress={() => handleRequestPress(item)}
      isRTL={isRTL}
      language={language}
      t={t}
      theme={theme}
      isDark={isDark}
      index={index}
    />
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-states/empty-history.png")}
      title={t("noDeliveryHistory")}
      subtitle={t("completeDeliveries")}
    />
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={completedRequests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={completedRequests.length > 0 ? renderHeader : null}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshRequests}
          tintColor="#2563EB"
          colors={["#2563EB"]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: 16 },

  /* Header */
  headerSection: { marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statsCol: { flex: 1, gap: 12 },
  statCard: {
    borderRadius: 20,
    padding: 16,
    gap: 4,
    overflow: "hidden",
  },
  statCardSm: { padding: 12, gap: 2, flex: 1 },
  statIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "500",
  },

  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitleBar: { width: 4, height: 18, borderRadius: 2 },
  sectionTitleText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },

  /* Card */
  card: {
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTopStripe: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardStripeInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  refBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  refText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateStripeText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  cardBody: { padding: 16, gap: 14 },

  /* Route */
  routeBlock: { gap: 12, alignItems: "flex-start" },
  routeTimeline: { alignItems: "center", paddingTop: 14, gap: 0 },
  routeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  routeLineVert: { width: 2, height: 20 },
  routeAddresses: { flex: 1, gap: 0 },
  routeAddressRow: { gap: 1 },
  routeLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  routeAddress: { fontSize: 13, fontWeight: "600", marginTop: 1 },

  divider: { height: 1 },

  /* Footer */
  footer: { justifyContent: "space-between", alignItems: "center" },
  driverSection: { flex: 1, alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  metaChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaChipText: { fontSize: 10, fontWeight: "500" },

  priceBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    gap: 0,
  },
  priceAmount: { fontSize: 18, fontWeight: "800", lineHeight: 22, letterSpacing: -0.3 },
  priceCurrency: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
});
