import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest } from "@/contexts/RequestsContext";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { BorderRadius, Spacing, VehicleTypes } from "@/constants/theme";
import { calculateDriverEarning, formatWeight } from "@/utils/commission";

function AmountDisplay({ amount, currency, amountStyle, currencyStyle, isRTL }: {
  amount: number; currency: string; amountStyle?: object; currencyStyle?: object; isRTL: boolean;
}) {
  return (
    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-end", gap: 4 }}>
      <ThemedText style={amountStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {amount.toLocaleString()}
      </ThemedText>
      <ThemedText style={[currencyStyle, { paddingBottom: 2 }]} numberOfLines={1}>{currency}</ThemedText>
    </View>
  );
}

function StatCard({ icon, label, amount, currency, gradient, isRTL }: {
  icon: IconName; label: string; amount: number; currency: string; gradient: readonly [string, string]; isRTL: boolean;
}) {
  return (
    <LinearGradient colors={gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Icon name={icon} size={22} color="#FFFFFF" />
      </View>
      <ThemedText style={[styles.statLabel, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{label}</ThemedText>
      <AmountDisplay amount={amount} currency={currency} amountStyle={styles.statValue} currencyStyle={styles.statCurrency} isRTL={isRTL} />
    </LinearGradient>
  );
}

function DriverHistoryCard({ request, isRTL, language, t, theme }: {
  request: TransportRequest; isRTL: boolean; language: string; t: (k: string) => string; theme: any;
}) {
  const vehicle = VehicleTypes.find((v) => v.id === request.vehicleType);
  const vehicleLabel = vehicle ? (language === "ar" ? vehicle.labelAr : vehicle.labelFr) : request.vehicleType;

  const formattedDate = new Date(request.updatedAt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const rawPrice = request.finalPrice || request.proposedPrice || 0;
  const { earning: earnings } = calculateDriverEarning(rawPrice, request.estimatedWeight || 0);

  return (
    <View style={[styles.historyCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.historyAccent, { backgroundColor: theme.success }]} />
      <View style={styles.historyContent}>
        {/* Header row */}
        <View style={[styles.historyTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.historyStatusPill, { backgroundColor: theme.success + "18", borderColor: theme.success + "40" }]}>
            <Icon name="check-circle" size={11} color={theme.success} />
            <ThemedText style={[styles.historyStatusText, { color: theme.success }]}>
              {t("delivered") || "Livrée"}
            </ThemedText>
          </View>
          <View style={[styles.historyDatePill, { backgroundColor: theme.backgroundRoot, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Icon name="calendar" size={11} color={theme.textSecondary} />
            <ThemedText style={[styles.historyDateText, { color: theme.textSecondary }]}>{formattedDate}</ThemedText>
          </View>
        </View>

        {/* Route */}
        <View style={[styles.historyRoute, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <View style={[styles.historyRouteRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.historyDot, { backgroundColor: theme.success }]} />
            <ThemedText style={styles.historyRouteText} numberOfLines={1}>{request.pickupAddress}</ThemedText>
          </View>
          <View style={[styles.historyConnector, { marginLeft: isRTL ? 0 : 3.5, marginRight: isRTL ? 3.5 : 0 }]}>
            <View style={[styles.historyLine, { backgroundColor: theme.border }]} />
          </View>
          <View style={[styles.historyRouteRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.historyDot, { backgroundColor: theme.error }]} />
            <ThemedText style={styles.historyRouteText} numberOfLines={1}>{request.deliveryAddress}</ThemedText>
          </View>
        </View>

        <View style={[styles.historyDivider, { backgroundColor: theme.border }]} />

        {/* Footer: client + earnings */}
        <View style={[styles.historyFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.historyClientRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {request.clientAvatarUrl ? (
              <Image source={{ uri: request.clientAvatarUrl }} style={styles.historyAvatar} />
            ) : (
              <View style={[styles.historyAvatarPlaceholder, { backgroundColor: theme.primary + "18" }]}>
                <Icon name="user" size={13} color={theme.primary} />
              </View>
            )}
            <View style={[{ alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={[styles.historyClientName, { color: theme.textPrimary }]} numberOfLines={1}>
                {request.clientName || "—"}
              </ThemedText>
              <View style={[styles.historyMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Icon name="truck" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.historyMetaText, { color: theme.textSecondary }]}>{vehicleLabel}</ThemedText>
                <View style={styles.historyMetaDot} />
                <Icon name="package" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.historyMetaText, { color: theme.textSecondary }]}>{formatWeight(request.estimatedWeight)}</ThemedText>
              </View>
            </View>
          </View>

          {/* Earnings box */}
          <View style={[styles.historyEarningsBox, { backgroundColor: theme.success + "12", borderRadius: BorderRadius.sm, padding: Spacing.sm }]}>
            <ThemedText style={[styles.historyEarningsAmount, { color: theme.success }]}>
              +{earnings.toLocaleString()}
            </ThemedText>
            <ThemedText style={[styles.historyEarningsCurrency, { color: theme.success }]}>MAD</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DriverEarningsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { gradients } = useDynamicTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getDriverRequests, isLoading, refreshRequests } = useRequests();

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [])
  );

  const requests = user ? getDriverRequests(user.id) : [];
  const completedRequests = requests.filter(
    (r) => r.status === "delivered" || (r.status as string) === "completed"
  );

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const calcEarning = (r: TransportRequest) => {
    const price = r.finalPrice || r.proposedPrice || 0;
    return calculateDriverEarning(price, r.estimatedWeight || 0).earning;
  };

  const todayEarnings = completedRequests
    .filter((r) => new Date(r.updatedAt) >= todayStart)
    .reduce((sum, r) => sum + calcEarning(r), 0);

  const weeklyEarnings = completedRequests
    .filter((r) => new Date(r.updatedAt) >= weekStart)
    .reduce((sum, r) => sum + calcEarning(r), 0);

  const monthlyEarnings = completedRequests
    .filter((r) => new Date(r.updatedAt) >= monthStart)
    .reduce((sum, r) => sum + calcEarning(r), 0);

  const todayDeliveries = completedRequests.filter(
    (r) => new Date(r.updatedAt) >= todayStart
  ).length;

  const madLabel = t("mad");

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Hero card */}
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroContent}>
          <View style={[styles.heroTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.heroIconBg}>
              <Icon name="dollar-sign" size={28} color="#FFFFFF" />
            </View>
            <View style={[styles.heroTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={styles.heroLabel}>{t("totalEarnings")}</ThemedText>
              <AmountDisplay
                amount={monthlyEarnings}
                currency={madLabel}
                amountStyle={styles.heroValue}
                currencyStyle={styles.heroCurrency}
                isRTL={isRTL}
              />
              <ThemedText style={styles.heroSubtitle}>{t("thisMonth")}</ThemedText>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={[styles.heroStats, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.heroStat, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={styles.heroStatValue} numberOfLines={1}>{completedRequests.length}</ThemedText>
              <ThemedText style={styles.heroStatLabel}>{t("totalDeliveries")}</ThemedText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <View style={[styles.ratingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Icon name="star" size={20} color="#FFD700" />
                <ThemedText style={styles.heroStatValue}>{user?.rating.toFixed(1) || "0.0"}</ThemedText>
              </View>
              <ThemedText style={styles.heroStatLabel}>{t("rating")}</ThemedText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={[styles.heroStat, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
              <ThemedText style={styles.heroStatValue} numberOfLines={1}>{todayDeliveries}</ThemedText>
              <ThemedText style={styles.heroStatLabel}>{t("today")}</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.heroDecor}>
          <Icon name="trending-up" size={120} color="rgba(255,255,255,0.08)" />
        </View>
      </LinearGradient>

      {/* Today + Weekly stat cards */}
      <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <StatCard icon="calendar" label={t("todayEarnings")} amount={todayEarnings} currency={madLabel} gradient={["#059669", "#10B981"] as const} isRTL={isRTL} />
        <StatCard icon="trending-up" label={t("weeklyEarnings")} amount={weeklyEarnings} currency={madLabel} gradient={["#D97706", "#F59E0B"] as const} isRTL={isRTL} />
      </View>

      {/* Performance card */}
      <Card elevation={1} style={styles.performanceCard}>
        <View style={[styles.performanceHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.performanceIconBg, { backgroundColor: theme.primary + "15" }]}>
            <Icon name="bar-chart" size={20} color={theme.primary} />
          </View>
          <ThemedText type="h4">{t("performance")}</ThemedText>
        </View>
        <View style={[styles.metricRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.metricItem, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{t("avgPerDelivery")}</ThemedText>
            <AmountDisplay
              amount={completedRequests.length > 0 ? Math.round(monthlyEarnings / completedRequests.length) : 0}
              currency={madLabel}
              amountStyle={[styles.metricValue, { color: theme.success }]}
              currencyStyle={[styles.metricCurrency, { color: theme.success }]}
              isRTL={isRTL}
            />
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
          <View style={[styles.metricItem, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
            <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{t("completionRate")}</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>100%</ThemedText>
          </View>
        </View>
      </Card>

      {/* History section title */}
      {completedRequests.length > 0 ? (
        <View style={[styles.sectionTitle, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.sectionTitleIcon, { backgroundColor: theme.primary + "15" }]}>
            <Icon name="clock" size={16} color={theme.primary} />
          </View>
          <ThemedText type="h4">{t("history")}</ThemedText>
          <View style={[styles.sectionBadge, { backgroundColor: theme.primary + "12" }]}>
            <ThemedText style={[styles.sectionBadgeText, { color: theme.primary }]}>{completedRequests.length}</ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Card elevation={1} style={styles.emptyCard}>
        <View style={[styles.emptyIconBg, { backgroundColor: theme.primary + "12" }]}>
          <Icon name="package" size={48} color={theme.primary} />
        </View>
        <ThemedText type="h3" style={styles.emptyTitle}>{t("noDeliveryHistory")}</ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t("completeDeliveries")}</ThemedText>
        <View style={[styles.emptyTip, { backgroundColor: theme.success + "10", borderRadius: BorderRadius.md, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.tipIcon, { backgroundColor: theme.success + "15" }]}>
            <Icon name="check-circle" size={16} color={theme.success} />
          </View>
          <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
            {t("completeFirstDelivery") || "Complétez votre première livraison pour commencer à gagner"}
          </ThemedText>
        </View>
      </Card>
    </View>
  );

  const renderItem = ({ item }: { item: TransportRequest }) => (
    <DriverHistoryCard request={item} isRTL={isRTL} language={language} t={t} theme={theme} />
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={completedRequests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshRequests} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  header: { gap: Spacing.lg, marginBottom: Spacing.lg },
  heroCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, overflow: "hidden", position: "relative" },
  heroContent: { zIndex: 1 },
  heroTop: { alignItems: "center", gap: Spacing.md },
  heroIconBg: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  heroTextContainer: { flex: 1 },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 2 },
  heroValue: { color: "#FFFFFF", fontSize: 32, fontFamily: "Poppins_700Bold", fontWeight: "700", lineHeight: 38 },
  heroCurrency: { color: "rgba(255,255,255,0.85)", fontSize: 16, fontFamily: "Poppins_600SemiBold", fontWeight: "600" },
  heroSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: Spacing.lg },
  heroStats: { justifyContent: "space-between" },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.15)" },
  heroStatValue: { color: "#FFFFFF", fontSize: 22, fontFamily: "Poppins_600SemiBold", fontWeight: "600" },
  heroStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  ratingRow: { alignItems: "center", gap: 4 },
  heroDecor: { position: "absolute", right: -20, bottom: -20 },
  statsRow: { gap: Spacing.md },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: 4, minWidth: 0 },
  statIconContainer: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  statLabel: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.85)" },
  statValue: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", fontFamily: "Poppins_700Bold", lineHeight: 28 },
  statCurrency: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)", fontFamily: "Poppins_600SemiBold" },
  performanceCard: { padding: Spacing.lg, gap: Spacing.md },
  performanceHeader: { alignItems: "center", gap: Spacing.sm },
  performanceIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricRow: { alignItems: "center" },
  metricItem: { flex: 1, gap: 4 },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 22, fontFamily: "Poppins_600SemiBold", fontWeight: "600", lineHeight: 28 },
  metricCurrency: { fontSize: 13, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  metricDivider: { width: 1, height: 40, marginHorizontal: Spacing.lg },
  sectionTitle: { alignItems: "center", gap: Spacing.sm },
  sectionTitleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700" },
  separator: { height: Spacing.md },
  emptyContainer: { paddingVertical: Spacing.xl },
  emptyCard: { padding: Spacing["2xl"], alignItems: "center", gap: Spacing.md },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  emptyTitle: { textAlign: "center" },
  emptySubtitle: { textAlign: "center", fontSize: 14, lineHeight: 22, maxWidth: 260 },
  emptyTip: { marginTop: Spacing.sm, width: "100%", alignItems: "center", gap: Spacing.sm, padding: Spacing.md },
  tipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  historyCard: {
    borderRadius: BorderRadius.lg, overflow: "hidden", flexDirection: "row",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  historyAccent: { width: 4 },
  historyContent: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  historyTopRow: { justifyContent: "space-between", alignItems: "center" },
  historyStatusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  historyStatusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  historyDatePill: { alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  historyDateText: { fontSize: 11, fontWeight: "500" },
  historyRoute: { gap: 2 },
  historyRouteRow: { alignItems: "center", gap: Spacing.sm },
  historyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  historyConnector: { paddingVertical: 1 },
  historyLine: { width: 1.5, height: 10 },
  historyRouteText: { fontSize: 13, fontWeight: "500", flex: 1 },
  historyDivider: { height: 1, marginVertical: 2 },
  historyFooter: { justifyContent: "space-between", alignItems: "center" },
  historyClientRow: { flex: 1, alignItems: "center", gap: Spacing.sm },
  historyAvatar: { width: 32, height: 32, borderRadius: 16 },
  historyAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  historyClientName: { fontSize: 13, fontWeight: "600" },
  historyMeta: { alignItems: "center", gap: 4, marginTop: 1 },
  historyMetaText: { fontSize: 11 },
  historyMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#ccc" },
  historyEarningsBox: { alignItems: "center", minWidth: 64 },
  historyEarningsAmount: { fontSize: 20, fontWeight: "700", fontFamily: "Poppins_700Bold", lineHeight: 24 },
  historyEarningsCurrency: { fontSize: 11, fontWeight: "600" },
});
