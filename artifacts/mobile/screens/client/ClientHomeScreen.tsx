import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

import { ThemedText } from "@/components/ThemedText";
import { RequestCard } from "@/components/RequestCard";
import { EmptyState } from "@/components/EmptyState";
import { MapViewComponent, LocationCoordinates } from "@/components/MapViewComponent";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest } from "@/contexts/RequestsContext";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MemoizedMap = memo(function MemoizedMap({
  nearbyDrivers,
  userLocation,
  style,
}: {
  nearbyDrivers: any[];
  userLocation?: LocationCoordinates | null;
  style: any;
}) {
  return (
    <MapViewComponent
      style={style}
      nearbyDrivers={nearbyDrivers.map((d) => ({ ...d, location: d.location }))}
      showUserLocation
      pickupLocation={userLocation || undefined}
    />
  );
});

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function ClientHomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { gradients } = useDynamicTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getClientRequests, isLoading, refreshRequests } = useRequests();

  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [showMap, setShowMap] = useState(Platform.OS !== "android");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const { drivers: nearbyDrivers } = useNearbyDrivers({ userLocation, enabled: true });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted" && isMounted) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        } catch (error) {
          console.log("Location error:", error);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const requests = user ? getClientRequests(user.id) : [];
  const activeRequests = useMemo(
    () => requests.filter((r) => r.status !== "delivered" && r.status !== "cancelled"),
    [requests]
  );
  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === "delivered"),
    [requests]
  );

  const handleCreateRequest = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CreateRequest");
  }, [navigation]);

  const handleRequestPress = useCallback(
    (request: TransportRequest) => {
      navigation.navigate("RequestDetails", { requestId: request.id });
    },
    [navigation]
  );

  const memoizedNearbyDrivers = useMemo(() => nearbyDrivers, [JSON.stringify(nearbyDrivers)]);

  const firstName = user?.fullName?.split(" ")[0] || t("client");

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <AnnouncementBanner audience="clients" />

        {/* Hero Banner */}
        <LinearGradient
          colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Decorative shapes */}
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <View style={styles.heroCircle3} />

          <View style={styles.heroTop}>
            <View style={[styles.heroTextBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={styles.heroGreeting}>{getGreeting()} 👋</ThemedText>
              <ThemedText style={styles.heroName}>{firstName}</ThemedText>
              <ThemedText style={styles.heroSub}>Transport rapide et fiable</ThemedText>
            </View>
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <ThemedText style={styles.heroBadgeText}>
                {memoizedNearbyDrivers.length} {t("available")}
              </ThemedText>
            </View>
          </View>

          {/* Stats row inside hero */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <ThemedText style={styles.heroStatValue}>{requests.length}</ThemedText>
              <ThemedText style={styles.heroStatLabel}>{t("totalRequests")}</ThemedText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <ThemedText style={styles.heroStatValue}>{completedRequests.length}</ThemedText>
              <ThemedText style={styles.heroStatLabel}>{t("completed")}</ThemedText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <ThemedText style={styles.heroStatValue}>{activeRequests.length}</ThemedText>
              <ThemedText style={styles.heroStatLabel}>{t("activeDeliveries")}</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* CTA Button */}
        <Pressable
          onPress={handleCreateRequest}
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={["#F59E0B", "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaIconCircle}>
              <Icon name="package" size={24} color="#FFFFFF" />
            </View>
            <View style={[styles.ctaText, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={styles.ctaTitle}>{t("needTransport")}</ThemedText>
              <ThemedText style={styles.ctaSub}>{t("createNewRequest")}</ThemedText>
            </View>
            <View style={styles.ctaArrow}>
              <Icon name={isRTL ? "arrow-left" : "arrow-right"} size={22} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Map Section */}
        {showMap && Platform.OS !== "web" ? (
          <View style={[styles.mapSection, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
            <View style={[styles.mapSectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.mapTitleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.mapTitleIcon, { backgroundColor: theme.primary + "18" }]}>
                  <Icon name="map-pin" size={16} color={theme.primary} />
                </View>
                <ThemedText style={styles.mapTitle}>{t("nearbyDrivers")}</ThemedText>
              </View>
              {memoizedNearbyDrivers.length > 0 ? (
                <View style={styles.liveChip}>
                  <View style={styles.livePulse} />
                  <ThemedText style={styles.liveText}>
                    {memoizedNearbyDrivers.length} {t("available")}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={styles.mapWrapper}>
              <MemoizedMap
                nearbyDrivers={memoizedNearbyDrivers}
                userLocation={userLocation}
                style={styles.map}
              />
              {userLocation ? (
                <View style={[styles.locationPill, { backgroundColor: theme.backgroundDefault }]}>
                  <Icon name="navigation" size={11} color={theme.primary} />
                  <ThemedText style={[styles.locationPillText, { color: theme.primary }]}>
                    {t("yourPosition")}
                  </ThemedText>
                </View>
              ) : null}
              <Pressable
                onPress={() => setIsMapFullscreen(true)}
                style={[styles.expandBtn, { backgroundColor: theme.backgroundDefault }]}
              >
                <Icon name="maximize" size={16} color={theme.primary} />
              </Pressable>
            </View>

            {memoizedNearbyDrivers.length > 0 ? (
              <View style={[styles.driversRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {memoizedNearbyDrivers.slice(0, 4).map((driver, i) => (
                  <View
                    key={driver.id}
                    style={[
                      styles.driverDot,
                      {
                        backgroundColor: "#10B981" + "20",
                        marginLeft: i > 0 ? -6 : 0,
                        borderColor: theme.backgroundDefault,
                      },
                    ]}
                  >
                    <Icon name="truck" size={12} color="#10B981" />
                  </View>
                ))}
                {memoizedNearbyDrivers.length > 4 ? (
                  <View style={[styles.driverDot, styles.moreDot, { marginLeft: -6, borderColor: theme.backgroundDefault, backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.moreDotText, { color: theme.textSecondary }]}>
                      +{memoizedNearbyDrivers.length - 4}
                    </ThemedText>
                  </View>
                ) : null}
                <ThemedText style={[styles.driversNearbyText, { color: theme.textSecondary }]}>
                  {t("driversNearby")}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Active deliveries header */}
        {activeRequests.length > 0 ? (
          <View style={[styles.sectionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.sectionTitleGroup, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.sectionIcon, { backgroundColor: "#F59E0B" + "20" }]}>
                <Icon name="truck" size={15} color="#F59E0B" />
              </View>
              <ThemedText style={styles.sectionTitle}>{t("activeDeliveries")}</ThemedText>
            </View>
            <View style={[styles.countBadge, { backgroundColor: "#F59E0B" }]}>
              <ThemedText style={styles.countBadgeText}>{activeRequests.length}</ThemedText>
            </View>
          </View>
        ) : null}
      </View>
    ),
    [
      theme, gradients, t, isRTL, user, firstName,
      handleCreateRequest, showMap, memoizedNearbyDrivers,
      requests.length, completedRequests.length, activeRequests.length, userLocation,
    ]
  );

  return (
    <>
      <FlatList
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={activeRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard request={item} onPress={() => handleRequestPress(item)} showDriver />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/empty-requests.png")}
            title={t("noRequestsYet")}
            subtitle={t("createFirstRequest")}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshRequests} />}
      />

      {/* Fullscreen map modal */}
      <Modal visible={isMapFullscreen} animationType="slide" onRequestClose={() => setIsMapFullscreen(false)}>
        <View style={[styles.fsContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.fsHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <ThemedText style={styles.fsTitle}>{t("nearbyDrivers")}</ThemedText>
            <TouchableOpacity
              onPress={() => setIsMapFullscreen(false)}
              style={[styles.fsCloseBtn, { backgroundColor: theme.backgroundDefault }]}
            >
              <Icon name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.fsMapWrapper}>
            <MemoizedMap nearbyDrivers={memoizedNearbyDrivers} userLocation={userLocation} style={styles.fsMap} />
          </View>
          <View style={[styles.fsFooter, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.liveChip}>
              <View style={styles.livePulse} />
              <ThemedText style={styles.liveText}>{memoizedNearbyDrivers.length} {t("driversAvailable")}</ThemedText>
            </View>
            {userLocation ? (
              <View style={[styles.locationPill, { backgroundColor: theme.primary + "15" }]}>
                <Icon name="navigation" size={12} color={theme.primary} />
                <ThemedText style={[styles.locationPillText, { color: theme.primary }]}>{t("yourPosition")}</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  header: { gap: Spacing.md, marginBottom: Spacing.md },

  /* Hero */
  heroBanner: {
    borderRadius: 24,
    overflow: "hidden",
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  heroCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -70,
    right: -50,
  },
  heroCircle2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 10,
    left: -40,
  },
  heroCircle3: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: 40,
    right: 60,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroTextBlock: { gap: 3 },
  heroGreeting: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  heroName: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", letterSpacing: 0.3 },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 2 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.25)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34D399" },
  heroBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    paddingVertical: Spacing.md,
  },
  heroStatItem: { flex: 1, alignItems: "center", gap: 3 },
  heroStatValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  heroStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, textAlign: "center" },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 4 },

  /* CTA */
  ctaBtn: { borderRadius: 20, overflow: "hidden", ...Shadows.md },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  ctaIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { flex: 1, gap: 3 },
  ctaTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  ctaSub: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  ctaArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Map */
  mapSection: {
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  mapSectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.xs,
  },
  mapTitleRow: { alignItems: "center", gap: Spacing.sm },
  mapTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: { fontSize: 15, fontWeight: "700" },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981" + "18",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { color: "#10B981", fontSize: 12, fontWeight: "700" },
  mapWrapper: { height: 175, borderRadius: 16, overflow: "hidden", position: "relative" },
  map: { flex: 1 },
  locationPill: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationPillText: { fontSize: 11, fontWeight: "600" },
  expandBtn: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driversRow: {
    alignItems: "center",
    paddingTop: Spacing.xs,
    gap: 0,
  },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  moreDot: {},
  moreDotText: { fontSize: 9, fontWeight: "700" },
  driversNearbyText: { fontSize: 12, marginLeft: Spacing.sm },

  /* Section header */
  sectionRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  sectionTitleGroup: { alignItems: "center", gap: Spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  countBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  /* Fullscreen modal */
  fsContainer: { flex: 1 },
  fsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  fsTitle: { fontSize: 18, fontWeight: "700" },
  fsCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fsMapWrapper: { flex: 1 },
  fsMap: { flex: 1, borderRadius: 0 },
  fsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});
