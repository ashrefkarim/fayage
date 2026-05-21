import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import QuickMessageModal from "@/components/QuickMessageModal";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest, RequestStatus } from "@/contexts/RequestsContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { BorderRadius, Spacing, VehicleTypes, Shadows, Gradients } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";
import { calculateDriverEarning } from "@/utils/commission";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DriverActiveScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getDriverRequests, updateRequest, isLoading, refreshRequests } = useRequests();

  const requests = user ? getDriverRequests(user.id) : [];
  const activeRequests = requests.filter(
    (r) => r.status !== "delivered" && r.status !== "completed" && r.status !== "cancelled"
  );

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [quickMsgRequest, setQuickMsgRequest] = useState<TransportRequest | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Refresh clock every 30 seconds so the button unlocks automatically when scheduled time arrives
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Track IDs of local notifications we scheduled so we can cancel them when requests change
  const scheduledNotifIds = useRef<string[]>([]);

  // Schedule "delivery is coming soon" local notifications for upcoming scheduled deliveries.
  // Fires once per request: 1 hour before AND 30 minutes before the scheduled time.
  useEffect(() => {
    if (Platform.OS === "web") return;

    const isExpoGo =
      (Constants as any).appOwnership === "expo" ||
      (Constants as any).executionEnvironment === "storeClient";
    if (isExpoGo) return;

    let Notifs: any = null;
    try { Notifs = require("expo-notifications"); } catch { return; }
    if (!Notifs) return;

    // Cancel all previously scheduled reminders
    const oldIds = scheduledNotifIds.current;
    if (oldIds.length) {
      oldIds.forEach((id) => Notifs.cancelScheduledNotificationAsync(id).catch(() => {}));
      scheduledNotifIds.current = [];
    }

    const newIds: string[] = [];
    const nowMs = Date.now();

    const schedule = async (triggerMs: number, title: string, body: string, requestId: string) => {
      if (triggerMs <= nowMs) return; // already past
      try {
        const id = await Notifs.scheduleNotificationAsync({
          content: { title, body, data: { requestId } },
          trigger: { type: "date", date: new Date(triggerMs) } as any,
        });
        newIds.push(id);
      } catch { /* silent — device may not support scheduling */ }
    };

    const promises: Promise<void>[] = [];

    for (const req of activeRequests) {
      if (!req.scheduledFor) continue;
      if (req.status !== "accepted" && req.status !== "paid") continue;

      const scheduledMs = new Date(req.scheduledFor).getTime();
      const isAr = language === "ar";

      // 1 hour before
      promises.push(schedule(
        scheduledMs - 60 * 60 * 1000,
        isAr ? "🚚 تذكير بالتوصيل" : "🚚 Rappel de livraison",
        isAr ? "رحلتك تبدأ خلال ساعة — استعد!" : "Votre livraison démarre dans 1 heure — Préparez-vous !",
        req.id,
      ));

      // 30 minutes before
      promises.push(schedule(
        scheduledMs - 30 * 60 * 1000,
        isAr ? "⚡ التوصيل قريب!" : "⚡ Livraison imminente !",
        isAr ? "رحلتك تبدأ خلال 30 دقيقة — انطلق الآن!" : "Votre livraison démarre dans 30 min — En route !",
        req.id,
      ));
    }

    Promise.all(promises).then(() => { scheduledNotifIds.current = newIds; });

    return () => {
      // Cancel on unmount or next run
      scheduledNotifIds.current.forEach((id) =>
        Notifs?.cancelScheduledNotificationAsync(id).catch(() => {})
      );
    };
  }, [activeRequests, language]);

  // Returns true if this order is scheduled AND the pickup window hasn't opened yet.
  // Only blocks the very first action (accepted → driver_arrived / paid → driver_arrived).
  const isScheduleLocked = (item: TransportRequest): boolean => {
    if (!item.scheduledFor) return false;
    if (item.status !== "accepted" && item.status !== "paid") return false;
    return new Date(item.scheduledFor).getTime() > now;
  };

  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id || activeRequests.length === 0) return;
    const counts: Record<string, number> = {};
    await Promise.all(
      activeRequests.map(async (req) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const url = new URL(`/api/messages/${req.id}/unread/${user.id}`, getApiUrl());
          const response = await fetch(url.toString(), { signal: controller.signal });
          const data = await response.json();
          if (data.success) counts[req.id] = data.count;
        } catch {
          // silent — transient network errors on mobile are expected
        } finally {
          clearTimeout(timer);
        }
      })
    );
    setUnreadCounts(counts);
  }, [user?.id, activeRequests.length]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 10000);
      return () => clearInterval(interval);
    }, [fetchUnreadCounts])
  );

  const trackingRequest = useMemo(() => {
    return activeRequests.find(r =>
      r.status === "accepted" ||
      r.status === "paid" ||
      r.status === "driver_arrived" ||
      r.status === "pickup" ||
      r.status === "in_transit"
    );
  }, [activeRequests]);

  useLocationTracking({
    enabled: !!trackingRequest,
    userId: user?.id,
    requestId: trackingRequest?.id,
    updateInterval: 5000,
  });

  const getNextStatus = (current: RequestStatus): RequestStatus | null => {
    if (current === "waiting_for_payment") return null;
    if (current === "paid") return "driver_arrived";
    const flow: RequestStatus[] = ["accepted", "driver_arrived", "pickup", "in_transit", "delivered"];
    const index = flow.indexOf(current);
    if (index >= 0 && index < flow.length - 1) return flow[index + 1];
    return null;
  };

  const getStatusAction = (status: RequestStatus): string => {
    switch (status) {
      case "accepted":
      case "paid":
        return t("iHaveArrived");
      case "driver_arrived":
        return t("goodsPickedUp");
      case "pickup":
        return t("inTransit");
      case "in_transit":
        return t("delivered");
      default:
        return "";
    }
  };

  const getStatusStep = (status: RequestStatus): number => {
    switch (status) {
      case "accepted":
      case "waiting_for_payment":
      case "paid":
        return 1;
      case "driver_arrived":
        return 2;
      case "pickup":
        return 3;
      case "in_transit":
        return 4;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: RequestStatus): string => {
    switch (status) {
      case "waiting_for_payment": return "#F59E0B";
      case "paid":
      case "accepted": return "#6366F1";
      case "driver_arrived": return "#3B82F6";
      case "pickup": return "#8B5CF6";
      case "in_transit": return "#10B981";
      default: return theme.primary;
    }
  };

  const getStatusLabel = (status: RequestStatus): string => {
    switch (status) {
      case "waiting_for_payment": return t("waitingPayment") || "En attente de paiement";
      case "paid":
      case "accepted": return t("accepted");
      case "driver_arrived": return t("driverArrived") || "Arrivé";
      case "pickup": return t("pickup");
      case "in_transit": return t("inTransit");
      default: return status;
    }
  };

  const handleUpdateStatus = async (request: TransportRequest) => {
    const nextStatus = getNextStatus(request.status);
    if (!nextStatus) return;

    if (request.status === "in_transit") {
      navigation.navigate("DeliveryConfirmation", { requestId: request.id });
      return;
    }

    const actionLabel = getStatusAction(request.status);

    const confirmMessages: Partial<Record<RequestStatus, string>> = {
      accepted: "Confirmez-vous être arrivé au point de ramassage ?",
      paid:     "Confirmez-vous être arrivé au point de ramassage ?",
      driver_arrived: "Confirmez-vous avoir récupéré la marchandise ?",
      pickup:   "Confirmez-vous être en transit avec la marchandise ?",
    };
    const message = confirmMessages[request.status as keyof typeof confirmMessages] ?? `Confirmer : ${actionLabel} ?`;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(actionLabel, message, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: async () => {
          await updateRequest(request.id, { status: nextStatus });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleCancelOrder = async (request: TransportRequest) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t("cancelOrder"), t("confirmCancelOrder"), [
      { text: t("no"), style: "cancel" },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          await updateRequest(request.id, { status: "cancelled" });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const canCancelOrder = (status: RequestStatus): boolean => status === "accepted";

  const handleChat = async (request: TransportRequest) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickMsgRequest(request);
  };

  const handleCall = async (phone: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phoneNumber = phone.replace(/\s/g, "");
    const url = Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      console.error("Call error:", error);
    }
  };

  const openMapsNavigation = async (address: string, coords?: { latitude: number; longitude: number }) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let url: string;
    if (coords) {
      url = Platform.OS === "ios"
        ? `maps://maps.apple.com/?daddr=${coords.latitude},${coords.longitude}&dirflg=d`
        : `google.navigation:q=${coords.latitude},${coords.longitude}`;
    } else {
      const encodedAddress = encodeURIComponent(address);
      url = Platform.OS === "ios"
        ? `maps://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`
        : `google.navigation:q=${encodedAddress}`;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else {
        const webUrl = coords
          ? `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      const webUrl = coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      await Linking.openURL(webUrl);
    }
  };

  const renderProgressSteps = (status: RequestStatus) => {
    const currentStep = getStatusStep(status);
    const steps = [
      { icon: "check-circle" as const, label: t("accepted") },
      { icon: "map-pin" as const, label: t("pickup") },
      { icon: "truck" as const, label: t("inTransit") },
    ];
    return (
      <View style={styles.stepsRow}>
        {steps.map((step, i) => {
          const done = i + 1 < currentStep;
          const active = i + 1 === currentStep;
          return (
            <React.Fragment key={i}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  done && { backgroundColor: "#10B981", borderColor: "#10B981" },
                  active && { backgroundColor: theme.primary, borderColor: theme.primary },
                  !done && !active && { backgroundColor: "transparent", borderColor: theme.border },
                ]}>
                  <Icon
                    name={step.icon}
                    size={13}
                    color={done || active ? "#FFFFFF" : theme.textSecondary}
                  />
                </View>
                <ThemedText style={[
                  styles.stepLabel,
                  { color: done || active ? (done ? "#10B981" : theme.primary) : theme.textSecondary }
                ]} numberOfLines={1}>
                  {step.label}
                </ThemedText>
              </View>
              {i < steps.length - 1 && (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: i + 1 < currentStep ? "#10B981" : theme.border }
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: TransportRequest }) => {
    const vehicle = VehicleTypes.find((v) => v.id === item.vehicleType);
    const vehicleLabel = vehicle ? (language === "ar" ? vehicle.labelAr : vehicle.labelFr) : item.vehicleType;
    const nextStatus = getNextStatus(item.status);
    const statusColor = getStatusColor(item.status);
    const isWaiting = item.status === "waiting_for_payment";

    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.lg]}>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
            {getStatusLabel(item.status)}
          </ThemedText>
        </View>

        {/* Client + Earnings Row */}
        <View style={[styles.clientRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.clientAvatarCircle, { backgroundColor: theme.primary + "20" }]}>
            <Icon name="user" size={22} color={theme.primary} />
          </View>
          <View style={[styles.clientDetails, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={styles.clientName}>{item.clientName}</ThemedText>
          </View>
          <View style={[styles.earningsPill, { backgroundColor: "#10B981" + "18" }]}>
            <ThemedText style={styles.earningsAmount}>
              {(() => {
                const price = item.finalPrice || item.proposedPrice || 0;
                const weight = item.estimatedWeight || 0;
                const { earning } = calculateDriverEarning(price, weight);
                return earning;
              })()}
            </ThemedText>
            <ThemedText style={styles.earningsCurrency}> {t("mad")}</ThemedText>
          </View>
        </View>

        {/* Info chips */}
        <View style={[styles.chipsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
            <Icon name="truck" size={12} color={theme.primary} />
            <ThemedText style={[styles.chipText, { color: theme.text }]}>{vehicleLabel}</ThemedText>
          </View>
          <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
            <Icon name="map-pin" size={12} color={theme.primary} />
            <ThemedText style={[styles.chipText, { color: theme.text }]}>{item.distance} {t("km")}</ThemedText>
          </View>
          <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
            <Icon name="clock" size={12} color={theme.primary} />
            <ThemedText style={[styles.chipText, { color: theme.text }]}>{item.estimatedTime} min</ThemedText>
          </View>
        </View>

        {/* Scheduled date — critical info for driver */}
        {item.scheduledFor ? (
          <View style={styles.scheduledBanner}>
            <Icon name="calendar" size={14} color="#92400E" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.scheduledBannerLabel}>{t("scheduledDelivery").toUpperCase()}</ThemedText>
              <ThemedText style={styles.scheduledBannerDate}>
                {(() => {
                  const locale = language === "ar" ? "ar-MA" : "fr-FR";
                  const d = new Date(item.scheduledFor!);
                  const day = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
                  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${t("scheduledDeliveryAt")} ${time}`;
                })()}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Progress steps */}
        <View style={[styles.stepsWrapper, { borderColor: theme.border + "50" }]}>
          {renderProgressSteps(item.status)}
        </View>

        {/* Route cards */}
        <View style={styles.routeSection}>
          <Pressable
            onPress={() => openMapsNavigation(item.pickupAddress, item.pickupCoords)}
            style={({ pressed }) => [styles.routeCard, { backgroundColor: "#10B981" + "10", opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.routeCardInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.routeIconCircle, { backgroundColor: "#10B981" }]}>
                <Icon name="map-pin" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.routeTextBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={[styles.routeTypeLabel, { color: "#10B981" }]}>{t("pickup")}</ThemedText>
                <ThemedText style={[styles.routeAddress, { color: theme.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                  {item.pickupAddress}
                </ThemedText>
              </View>
              <View style={[styles.navButton, { backgroundColor: "#10B981" }]}>
                <Icon name="navigation" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>

          <View style={[styles.routeArrow, { alignSelf: isRTL ? "flex-end" : "flex-start", marginLeft: isRTL ? 0 : 20, marginRight: isRTL ? 20 : 0 }]}>
            <Icon name="arrow-down" size={16} color={theme.textSecondary} />
          </View>

          <Pressable
            onPress={() => openMapsNavigation(item.deliveryAddress, item.deliveryCoords)}
            style={({ pressed }) => [styles.routeCard, { backgroundColor: "#EF4444" + "10", opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.routeCardInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.routeIconCircle, { backgroundColor: "#EF4444" }]}>
                <Icon name="flag" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.routeTextBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={[styles.routeTypeLabel, { color: "#EF4444" }]}>{t("delivery")}</ThemedText>
                <ThemedText style={[styles.routeAddress, { color: theme.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                  {item.deliveryAddress}
                </ThemedText>
              </View>
              <View style={[styles.navButton, { backgroundColor: "#EF4444" }]}>
                <Icon name="navigation" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Bottom actions */}
        <View style={[styles.bottomActions, { borderTopColor: theme.border + "40" }]}>
          {/* Secondary actions */}
          <View style={[styles.secondaryActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Pressable
              onPress={() => handleChat(item)}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.primary + "15", opacity: pressed ? 0.7 : 1 }]}
            >
              <View>
                <Icon name="message-circle" size={22} color={theme.primary} />
                {unreadCounts[item.id] > 0 && (
                  <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                    <ThemedText style={styles.badgeText}>
                      {unreadCounts[item.id] > 9 ? "9+" : unreadCounts[item.id]}
                    </ThemedText>
                  </View>
                )}
              </View>
            </Pressable>

            {canCancelOrder(item.status) && (
              <Pressable
                onPress={() => handleCancelOrder(item)}
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: "#EF4444" + "15", opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="x" size={22} color="#EF4444" />
              </Pressable>
            )}
          </View>

          {/* Main action button */}
          {nextStatus ? (
            isScheduleLocked(item) ? (
              <View style={styles.lockedBtn}>
                <Icon name="lock" size={18} color="#92400E" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.lockedBtnTitle}>
                    {t("scheduledDelivery")}
                  </ThemedText>
                  <ThemedText style={styles.lockedBtnSub} numberOfLines={2}>
                    {(() => {
                      const locale = language === "ar" ? "ar-MA" : "fr-FR";
                      const d = new Date(item.scheduledFor!);
                      const day = d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
                      const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                      return `${t("scheduledFor")} ${day} ${t("scheduledDeliveryAt")} ${time}`;
                    })()}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => handleUpdateStatus(item)}
                style={({ pressed }) => [styles.mainBtn, { opacity: pressed ? 0.92 : 1 }]}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainBtnGradient}
                >
                  <Icon name="check-circle" size={22} color="#FFFFFF" />
                  <ThemedText style={styles.mainBtnText} numberOfLines={1}>
                    {getStatusAction(item.status)}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            )
          ) : null}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (activeRequests.length === 0) return null;
    const totalEarnings = activeRequests.reduce((sum, r) => {
      const price = r.finalPrice || r.proposedPrice || 0;
      const { earning } = calculateDriverEarning(price, r.estimatedWeight || 0);
      return sum + earning;
    }, 0);
    return (
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerCard, Shadows.md]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerStat}>
            <View style={styles.headerIconCircle}>
              <Icon name="package" size={20} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.headerStatValue}>{activeRequests.length}</ThemedText>
            <ThemedText style={styles.headerStatLabel}>
              {activeRequests.length === 1 ? t("activeDelivery") : t("activeDeliveries")}
            </ThemedText>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerStat}>
            <View style={styles.headerIconCircle}>
              <Icon name="navigation" size={20} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.headerStatValue}>
              {activeRequests.filter(r => r.status === "in_transit").length}
            </ThemedText>
            <ThemedText style={styles.headerStatLabel}>{t("inTransit")}</ThemedText>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerStat}>
            <View style={styles.headerIconCircle}>
              <Icon name="dollar-sign" size={20} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.headerStatValue}>{totalEarnings}</ThemedText>
            <ThemedText style={styles.headerStatLabel}>{t("mad")}</ThemedText>
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={activeRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <EmptyState
            image={require("../../assets/images/empty-states/empty-jobs.png")}
            title={t("noActiveDeliveries")}
            subtitle={t("waitingForJobs")}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshRequests} />}
      />
      <QuickMessageModal
        visible={!!quickMsgRequest}
        requestId={quickMsgRequest?.id || ""}
        otherPartyName={quickMsgRequest?.clientName || "Client"}
        onClose={() => setQuickMsgRequest(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: Spacing.lg },

  /* Scheduled date banner */
  scheduledBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 12,
  },
  scheduledBannerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scheduledBannerDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350F",
  },

  /* Header */
  headerCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  headerStat: { flex: 1, alignItems: "center", gap: 4 },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerStatValue: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  headerStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  headerDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.2)" },

  /* Card */
  card: {
    borderRadius: 20,
    overflow: "hidden",
  },

  /* Status badge */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    margin: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  /* Client row */
  clientRow: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  clientAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  clientDetails: { flex: 1, gap: 3 },
  clientName: { fontSize: 17, fontWeight: "700" },
  clientPhone: { fontSize: 14, fontWeight: "600" },
  phoneHint: { fontSize: 13 },
  earningsPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "center",
  },
  earningsAmount: { fontSize: 18, fontWeight: "800", color: "#10B981" },
  earningsCurrency: { fontSize: 11, color: "#10B981", fontWeight: "600" },

  /* Chips */
  chipsRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chipText: { fontSize: 12, fontWeight: "500" },

  /* Steps */
  stepsWrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepItem: { alignItems: "center", gap: 5, flex: 1 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  stepLine: { flex: 1, height: 2, marginBottom: 18, marginHorizontal: 2 },

  /* Route */
  routeSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 0,
  },
  routeArrow: { paddingVertical: 2, alignItems: "center" },
  routeCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  routeCardInner: {
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  routeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  routeTextBlock: { flex: 1, gap: 2 },
  routeTypeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  routeAddress: { fontSize: 14, fontWeight: "500", lineHeight: 19 },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Bottom actions */
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryActions: {
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  mainBtn: { flex: 1 },
  mainBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 15,
    borderRadius: 14,
  },
  mainBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  lockedBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F59E0B40",
  },
  lockedBtnTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  lockedBtnSub: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 15,
  },
});
