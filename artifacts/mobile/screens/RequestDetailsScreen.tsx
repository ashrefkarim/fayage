import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Platform, KeyboardAvoidingView, Linking, Image, ScrollView, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SignatureCapture } from "@/components/SignatureCapture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, IconName } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StatusBadge } from "@/components/StatusBadge";
import { RatingStars } from "@/components/RatingStars";
import { Button } from "@/components/Button";
import { MapViewComponent } from "@/components/MapViewComponent";
import { DriverReviewModal } from "@/components/DriverReviewModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests } from "@/contexts/RequestsContext";
import { useDriverLocationSubscription } from "@/hooks/useLocationTracking";
import { BorderRadius, Spacing, VehicleTypes, DeliveryOptions } from "@/constants/theme";
import QuickMessageModal from "@/components/QuickMessageModal";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";
import { formatWeight } from "@/utils/commission";

type RouteParams = RouteProp<RootStackParamList, "RequestDetails">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OFFER_AVATAR_GRADIENTS: readonly [string, string][] = [
  ["#4F46E5", "#7C3AED"],
  ["#0891B2", "#06B6D4"],
  ["#059669", "#10B981"],
  ["#C2410C", "#EA580C"],
  ["#B45309", "#D97706"],
];
const OFFER_ACCENT_COLORS = ["#4F46E5", "#0891B2", "#059669", "#EA580C", "#D97706"];

export default function RequestDetailsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { requests, updateRequest, submitRating, refreshRequests } = useRequests();

  const baseRequest = requests.find((r) => r.id === route.params.requestId);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [fullOrderDetails, setFullOrderDetails] = useState<any>(null);
  const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [unreadDriverCount, setUnreadDriverCount] = useState(0);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState<string | null>(null);
  const [proofAlreadySubmitted, setProofAlreadySubmitted] = useState(false);
  
  // Merge base request with full order details (for delivery photo/signature)
  const request = fullOrderDetails ? { ...baseRequest, ...fullOrderDetails } : baseRequest;

  // Parse goodsPhotos from API response (may be JSON string or array)
  // Also filter out invalid local file:// URLs from old orders
  const parseGoodsPhotos = (photos: any): string[] | undefined => {
    let photoArray: string[] = [];
    if (!photos) return undefined;
    if (Array.isArray(photos)) {
      photoArray = photos;
    } else if (typeof photos === "string") {
      try {
        const parsed = JSON.parse(photos);
        photoArray = Array.isArray(parsed) ? parsed : [];
      } catch {
        return undefined;
      }
    }
    // Filter out local file:// URLs that won't work
    const validPhotos = photoArray.filter((url) => url && url.startsWith("http"));
    return validPhotos.length > 0 ? validPhotos : undefined;
  };

  // Fetch full order details including delivery photo when viewing a delivered order
  const fetchFullOrderDetails = useCallback(async () => {
    if (!route.params.requestId) return;
    try {
      const url = new URL(`/api/orders/${route.params.requestId}`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success && data.order) {
        // Parse goodsPhotos if it's a JSON string
        const order = {
          ...data.order,
          goodsPhotos: parseGoodsPhotos(data.order.goodsPhotos),
        };
        setFullOrderDetails(order);
      }
    } catch (error) {
      console.error("Failed to fetch full order details:", error);
    }
  }, [route.params.requestId]);

  // Fetch full details when viewing a delivered order (to get delivery photo/signature)
  useEffect(() => {
    if (baseRequest?.status === "delivered" || baseRequest?.hasDeliveryPhoto || baseRequest?.hasClientSignature) {
      fetchFullOrderDetails();
    }
  }, [baseRequest?.status, baseRequest?.hasDeliveryPhoto, baseRequest?.hasClientSignature, fetchFullOrderDetails]);

  const fetchOffers = useCallback(async () => {
    if (!request?.id || request.status !== "awaiting_client_approval") return;
    try {
      const url = new URL(`/api/orders/${request.id}/offers`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        const offers = data.offers || [];
        // Enrich each offer with live driver rating from the stats endpoint
        const enriched = await Promise.all(
          offers.map(async (offer: any) => {
            try {
              const statsUrl = new URL(`/api/drivers/${offer.driverId}/stats`, getApiUrl());
              const statsRes = await fetch(statsUrl.toString());
              const statsData = await statsRes.json();
              if (statsData.success && statsData.rating > 0) {
                return { ...offer, driverRating: statsData.rating };
              }
            } catch {}
            return offer;
          })
        );
        setOffers(enriched);
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
    }
  }, [request?.id, request?.status]);

  useEffect(() => {
    if (request?.status === "awaiting_client_approval") {
      fetchOffers();
    }
  }, [request?.status, fetchOffers]);

  const fetchSupportUnreadCount = useCallback(async () => {
    if (!user?.id || !request?.id) return;
    try {
      const url = new URL(`/api/messages/${request.id}/unread/${user.id}?type=support`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setUnreadSupportCount(data.count);
      }
    } catch {}
  }, [user?.id, request?.id]);

  const fetchDriverUnreadCount = useCallback(async () => {
    if (!user?.id || !request?.id || user?.role !== "client") return;
    try {
      const url = new URL(`/api/messages/${request.id}/unread/${user.id}?type=direct`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setUnreadDriverCount(data.count);
      }
    } catch {}
  }, [user?.id, request?.id, user?.role]);

  useFocusEffect(
    useCallback(() => {
      fetchSupportUnreadCount();
      fetchDriverUnreadCount();
      const interval = setInterval(() => {
        fetchSupportUnreadCount();
        fetchDriverUnreadCount();
      }, 15000);
      return () => clearInterval(interval);
    }, [fetchSupportUnreadCount, fetchDriverUnreadCount])
  );

  // Check if client already submitted payment proof (re-runs when returning from PaymentInstructions)
  useFocusEffect(
    useCallback(() => {
      if (!baseRequest || baseRequest.status !== "waiting_for_payment" || user?.role !== "client") return;
      const checkProof = async () => {
        try {
          const url = new URL(`/api/payments/order/${baseRequest.id}`, getApiUrl());
          const res = await fetch(url.toString());
          const data = await res.json();
          if (data.success && data.payment?.proofImageUrl) {
            setProofAlreadySubmitted(true);
          }
        } catch (e) {}
      };
      checkProof();
    }, [baseRequest?.id, baseRequest?.status, user?.role])
  );

  const checkIfFavorite = useCallback(async () => {
    if (!user?.id || !request?.driverId || user.role !== "client") return;
    try {
      const url = new URL(`/api/clients/${user.id}/favorites`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        const isFav = data.favorites.some((f: any) => f.driverId === request.driverId);
        setIsFavorite(isFav);
      }
    } catch (error) {
      console.error("Failed to check favorite status:", error);
    }
  }, [user?.id, user?.role, request?.driverId]);

  useEffect(() => {
    if (request?.status === "delivered" && request?.driverId) {
      checkIfFavorite();
    }
  }, [request?.status, request?.driverId, checkIfFavorite]);

  const handleToggleFavorite = async () => {
    if (!user?.id || !request?.driverId) return;
    setFavoriteLoading(true);
    try {
      const baseUrl = getApiUrl();
      if (isFavorite) {
        const response = await fetch(`${baseUrl}api/clients/${user.id}/favorites/${request.driverId}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          setIsFavorite(false);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        const response = await fetch(`${baseUrl}api/clients/${user.id}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId: request.driverId }),
        });
        const data = await response.json();
        if (data.success) {
          setIsFavorite(true);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const isTrackingActive = request?.status === "pickup" || request?.status === "in_transit";
  const { driverLocation } = useDriverLocationSubscription(isTrackingActive ? request?.id : undefined);

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Request not found</ThemedText>
      </ThemedView>
    );
  }

  const vehicle = VehicleTypes.find((v) => v.id === request.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar"
      ? vehicle.labelAr
      : vehicle.labelFr
    : request.vehicleType;

  const deliveryOpt = DeliveryOptions.find((d) => d.id === request.deliveryOption);
  const optionLabel = deliveryOpt
    ? language === "ar"
      ? deliveryOpt.labelAr
      : deliveryOpt.labelFr
    : request.deliveryOption;

  const isClient = user?.role === "client";
  const canRate = request.status === "delivered" && isClient && !request.clientRated;
  const canCancel = ["pending", "awaiting_client_approval"].includes(request.status);
  const isPaidStatus = ["paid", "pickup", "in_transit", "driver_arrived", "delivered"].includes(request.status);
  const handleSupport = async () => {
    setUnreadSupportCount(0);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Chat", { requestId: request.id, isSupport: true });
  };

  const handleDriverChat = async () => {
    setUnreadDriverCount(0);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickMessage(true);
  };

  const canChatWithDriver = isClient &&
    !!request.driverId &&
    ["accepted", "paid", "pickup", "in_transit", "driver_arrived", "waiting_for_payment"].includes(request.status);

  const handleTrack = () => {
    navigation.navigate("LiveTracking", { requestId: request.id });
  };

  const handleDownloadDeliveryNote = async () => {
    const url = new URL(`/api/orders/${request.id}/delivery-note`, getApiUrl());
    await Linking.openURL(url.toString());
  };

  const canTrack = isClient && ["accepted", "paid", "pickup", "in_transit", "driver_arrived"].includes(request.status) && request.driverId;

  const handleCancel = async () => {
    await updateRequest(request.id, { status: "cancelled" });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    navigation.goBack();
  };

  const handlePayNow = () => {
    navigation.navigate("PaymentInstructions", { orderId: request.id });
  };

  const handleConfirmDelivery = async () => {
    if (!clientSignature) return;
    try {
      setConfirmDeliveryLoading(true);
      const url = new URL(`/api/orders/${request.id}/confirm-delivery`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSignature }),
      });
      const data = await response.json();
      if (data.success) {
        setDeliveryConfirmed(true);
        setShowConfirmModal(false);
        setClientSignature(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          t("error"),
          data.error || t("withdrawalSubmitError"),
          [{ text: t("ok") }]
        );
      }
    } catch (error) {
      console.error("Failed to confirm delivery:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("withdrawalSubmitError"), [{ text: t("ok") }]);
    } finally {
      setConfirmDeliveryLoading(false);
    }
  };

  const handleOpenDeliveryNote = async () => {
    const url = new URL(`/api/orders/${request.id}/delivery-note`, getApiUrl());
    await Linking.openURL(url.toString());
  };

  const handleSubmitRating = async () => {
    try {
      await submitRating(request.id, isClient, rating, review.trim() || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRatingModal(false);
      setRating(5);
      setReview("");
    } catch (error) {
      console.error("Failed to submit rating:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleApproveDriver = async () => {
    if (!selectedOffer) return;
    try {
      setApprovalLoading(true);
      const url = new URL(`/api/orders/${request.id}/client-approve`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          driverId: selectedOffer.driverId,
          driverName: selectedOffer.driverName,
          driverPhone: selectedOffer.driverPhone,
          driverRating: selectedOffer.driverRating,
          finalPrice: selectedOffer.offeredPrice,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowDriverModal(false);
        setSelectedOffer(null);
        setOffers([]);
        refreshRequests();
      }
    } catch (error) {
      console.error("Failed to approve driver:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectDriver = async () => {
    if (!selectedOffer) return;
    try {
      setApprovalLoading(true);
      const url = new URL(`/api/orders/${request.id}/client-reject`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          driverId: selectedOffer.driverId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowDriverModal(false);
        setSelectedOffer(null);
        fetchOffers();
      }
    } catch (error) {
      console.error("Failed to reject driver:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setApprovalLoading(false);
    }
  };

  const DetailRow = ({
    icon,
    label,
    value,
  }: {
    icon: IconName;
    label: string;
    value: string;
  }) => (
    <View style={[styles.detailRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.detailLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Icon name={icon} size={18} color={theme.textSecondary} />
        <ThemedText style={{ color: theme.textSecondary }}>{label}</ThemedText>
      </View>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + 320,
          },
        ]}
      >
        {/* Hero header card */}
        <LinearGradient
          colors={
            request.status === "delivered"
              ? ["#064E3B", "#065F46", "#047857"]
              : request.status === "cancelled"
              ? ["#7F1D1D", "#991B1B", "#B91C1C"]
              : request.status === "in_transit" || request.status === "pickup"
              ? ["#1E3A8A", "#1D4ED8", "#2563EB"]
              : ["#0F2554", "#1E3A8A", "#2563EB"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Watermark icons */}
          <View style={[styles.heroBg, { bottom: -10, right: -10 }]}>
            <Icon name="truck" size={160} color="rgba(255,255,255,0.04)" />
          </View>
          <View style={{ position: "absolute", top: -20, left: -20 }}>
            <Icon name="circle" size={120} color="rgba(255,255,255,0.03)" />
          </View>

          {/* Top row: ref badge + status */}
          <View style={[styles.heroTop, { marginBottom: 0 }]}>
            <View style={styles.heroRefBadge}>
              <ThemedText style={styles.heroRefText}>
                {request.orderNumber
                  ? `#${String(request.orderNumber).padStart(5, "0")}`
                  : `#${request.id.slice(-6).toUpperCase()}`}
              </ThemedText>
            </View>
            <StatusBadge status={request.status} />
          </View>

          {/* Price */}
          <View style={styles.heroPriceRow}>
            <ThemedText style={styles.heroPrice}>
              {(request.finalPrice || request.proposedPrice || 0).toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.heroCurrency}>MAD</ThemedText>
          </View>

          {/* Bottom meta */}
          <View style={styles.heroMeta}>
            {request.status !== "pending" && request.status !== "awaiting_client_approval" ? (
              <View style={styles.heroMetaPill}>
                <Icon name="calendar" size={11} color="rgba(255,255,255,0.65)" />
                <ThemedText style={styles.heroDate}>
                  {new Date(request.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </ThemedText>
              </View>
            ) : null}
            {request.distance ? (
              <View style={styles.heroMetaPill}>
                <Icon name="navigation" size={11} color="rgba(255,255,255,0.65)" />
                <ThemedText style={styles.heroDate}>{request.distance} km</ThemedText>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {request.status === "driver_arrived" && isClient ? (
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.arrivedBanner}
          >
            <View style={[styles.arrivedIconRing]}>
              <Icon name="truck" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.arrivedBannerTitle}>
                {t("driverHasArrived")}
              </ThemedText>
              <ThemedText style={styles.arrivedBannerSubtitle}>
                {request.driverName} {t("isWaitingForYou")}
              </ThemedText>
            </View>
            <View style={styles.arrivedPulse}>
              <View style={[styles.arrivedPulseDot, { backgroundColor: "#FFFFFF" }]} />
            </View>
          </LinearGradient>
        ) : null}

        {isTrackingActive && Platform.OS !== "web" ? (
          <View style={[styles.trackingCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.trackingHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.trackingBadge, { backgroundColor: theme.success + "20" }]}>
                <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
                <ThemedText style={{ color: theme.success, fontWeight: "600", fontSize: 12 }}>
                  {t("liveTracking")}
                </ThemedText>
              </View>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                {t("driverOnTheWay")}
              </ThemedText>
            </View>
            <MapViewComponent
              style={styles.trackingMap}
              pickupLocation={request.pickupCoords}
              dropoffLocation={request.deliveryCoords}
              driverLocation={driverLocation || undefined}
              isTracking
              showUserLocation={false}
            />
          </View>
        ) : null}

        <View style={[styles.routeCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
          <View style={[styles.routeCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.sectionAccentBar} />
            <ThemedText style={[styles.routeCardTitle, { color: theme.text }]}>
              {t("route") || "Itinéraire"}
            </ThemedText>
            <View style={[styles.routeDistancePill, { backgroundColor: "#2563EB14" }]}>
              <Icon name="navigation" size={11} color="#2563EB" />
              <ThemedText style={[styles.routeDistanceText, { color: "#2563EB" }]}>
                {request.distance} {t("km")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.routeBody}>
            <View style={styles.routeDotsColumn}>
              <View style={[styles.routeDotLarge, { backgroundColor: theme.success, borderColor: theme.success + "40" }]} />
              <View style={[styles.routeDashedLine, { backgroundColor: theme.border }]} />
              <View style={[styles.routeDotLarge, { backgroundColor: theme.error, borderColor: theme.error + "40" }]} />
            </View>
            <View style={[styles.routeAddressesColumn, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.routeAddressBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={[styles.routeLabel, { color: theme.success }]}>
                  {t("pickup") || "Départ"}
                </ThemedText>
                <ThemedText style={styles.routeAddress}>{request.pickupAddress}</ThemedText>
              </View>
              <View style={[styles.routeAddressBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={[styles.routeLabel, { color: theme.error }]}>
                  {t("delivery") || "Destination"}
                </ThemedText>
                <ThemedText style={styles.routeAddress}>{request.deliveryAddress}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.detailsCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
          <View style={[styles.detailsCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.sectionAccentBar, { backgroundColor: "#7C3AED" }]} />
            <ThemedText style={[styles.detailsCardTitle, { color: theme.text }]}>{t("orderDetails") || "Détails"}</ThemedText>
          </View>
          <View style={styles.chipGrid}>
            {[
              { icon: "truck" as IconName, label: t("vehicleType"), value: vehicleLabel, color: "#2563EB", bg: "#EFF6FF" },
              { icon: "package" as IconName, label: t("estimatedWeight"), value: formatWeight(request.estimatedWeight), color: "#D97706", bg: "#FFFBEB" },
              { icon: "navigation" as IconName, label: t("distance"), value: `${request.distance} km`, color: "#059669", bg: "#F0FDF4" },
              { icon: "zap" as IconName, label: t("deliveryOption"), value: optionLabel, color: "#7C3AED", bg: "#F5F3FF" },
            ].map((chip, i) => (
              <View key={i} style={[styles.chip, {
                backgroundColor: isDark ? chip.color + "15" : chip.bg,
                borderColor: chip.color + "30",
                borderWidth: 1,
              }]}>
                <View style={[styles.chipIcon, { backgroundColor: chip.color + "20" }]}>
                  <Icon name={chip.icon} size={16} color={chip.color} />
                </View>
                <ThemedText style={[styles.chipLabel, { color: isDark ? chip.color + "CC" : chip.color + "AA" }]}>{chip.label}</ThemedText>
                <ThemedText style={[styles.chipValue, { color: isDark ? "#F1F5F9" : "#1E293B" }]}>{chip.value}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <View style={[styles.sectionAccentBar, { backgroundColor: "#D97706" }]} />
            <ThemedText style={[styles.detailsCardTitle, { color: theme.text }]}>
              {t("goodsDescription")}
            </ThemedText>
          </View>
          <ThemedText>{request.goodsDescription}</ThemedText>
          
          {request.goodsPhotos && request.goodsPhotos.length > 0 ? (
            <View style={styles.goodsPhotosSection}>
              <ThemedText style={[styles.descriptionLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>
                {t("photoOfGoods")} ({request.goodsPhotos.length})
              </ThemedText>
              <View style={styles.goodsPhotosRow}>
                {request.goodsPhotos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.goodsPhotoThumbnail}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {request.status === "delivered" ? (
          <>
            <View style={[styles.deliveryProofCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.proofHeader}>
                <Icon name="check-circle" size={20} color={theme.success} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: theme.success }}>
                  {t("deliveryProof")}
                </ThemedText>
              </View>
              
              {request.deliveryPhoto ? (
                <View style={styles.proofSection}>
                  <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                    {t("photoOfDeliveredGoods")}
                  </ThemedText>
                  <Image 
                    source={{ uri: request.deliveryPhoto }} 
                    style={styles.deliveryPhotoImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
              
              {request.clientSignature ? (
                <View style={styles.proofSection}>
                  <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                    {t("clientSignature")}
                  </ThemedText>
                  <View style={[styles.signatureContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <Image 
                      source={{ uri: request.clientSignature }} 
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.deliveryNoteCard, { backgroundColor: theme.backgroundDefault }]}>
              <Pressable
                onPress={handleDownloadDeliveryNote}
                style={({ pressed }) => [
                  styles.downloadButtonInCard,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Icon name="file-text" size={18} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>{t("downloadDeliveryNote")}</ThemedText>
              </Pressable>
            </View>
          </>
        ) : null}

        {request.status === "awaiting_client_approval" && offers.length > 0 && isClient ? (
          <View style={styles.offersSection}>
            {/* Section header */}
            <View style={[styles.offersSectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.offersPulseWrap}>
                <View style={[styles.offersPulseRing, { borderColor: "rgba(59,130,246,0.3)" }]} />
                <View style={[styles.offersPulseDot, { backgroundColor: "#3B82F6" }]} />
              </View>
              <ThemedText style={[styles.offersSectionLabel, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                {t("driversWantToAccept")}
              </ThemedText>
              <View style={styles.offersCountBadge}>
                <ThemedText style={styles.offersCountText}>{offers.length}</ThemedText>
              </View>
            </View>

            {offers.map((offer, index) => (
              <Pressable
                key={offer.id}
                onPress={() => { setSelectedOffer(offer); setShowDriverModal(true); }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                  borderRadius: BorderRadius.lg,
                  overflow: "hidden",
                  shadowColor: OFFER_ACCENT_COLORS[index % OFFER_ACCENT_COLORS.length],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 4,
                })}
              >
                <View style={[styles.driverOfferCard, { backgroundColor: theme.backgroundDefault }]}>
                  {/* Colorful left accent bar */}
                  <View style={[styles.driverOfferAccentBar, { backgroundColor: OFFER_ACCENT_COLORS[index % OFFER_ACCENT_COLORS.length] }]} />

                  <View style={styles.driverOfferInner}>
                    {/* Main row: avatar + name + price */}
                    <View style={[styles.driverOfferTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      {/* Gradient avatar with online dot */}
                      <View style={styles.driverOfferAvatarWrap}>
                        <LinearGradient
                          colors={[...OFFER_AVATAR_GRADIENTS[index % OFFER_AVATAR_GRADIENTS.length]]}
                          style={styles.driverOfferAvatar}
                        >
                          <ThemedText style={styles.driverOfferAvatarInitial}>
                            {offer.driverName?.charAt(0)?.toUpperCase() || "?"}
                          </ThemedText>
                        </LinearGradient>
                        <View style={[styles.driverOnlineDot, { borderColor: theme.backgroundDefault }]} />
                      </View>

                      {/* Name + rating */}
                      <View style={[styles.driverOfferInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                        <ThemedText style={styles.driverOfferName}>{offer.driverName}</ThemedText>
                        <View style={[styles.driverOfferRatingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                          {offer.driverRating && offer.driverRating > 0 ? (
                            <>
                              <Icon name="star" size={12} color="#F59E0B" />
                              <ThemedText style={styles.driverOfferRatingNum}>
                                {offer.driverRating.toFixed(1)}
                              </ThemedText>
                              <ThemedText style={[styles.driverOfferDot, { color: theme.textSecondary }]}>·</ThemedText>
                            </>
                          ) : (
                            <>
                              <View style={{ backgroundColor: "#10B98118", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <ThemedText style={{ fontSize: 10, fontWeight: "700", color: "#10B981" }}>NOUVEAU</ThemedText>
                              </View>
                              <ThemedText style={[styles.driverOfferDot, { color: theme.textSecondary }]}>·</ThemedText>
                            </>
                          )}
                          <ThemedText style={styles.driverOfferAvailableLabel}>Disponible</ThemedText>
                        </View>
                      </View>

                      {/* Price badge */}
                      {offer.offeredPrice ? (
                        <View style={styles.driverOfferPriceBadge}>
                          <ThemedText style={styles.driverOfferPriceValue}>{offer.offeredPrice}</ThemedText>
                          <ThemedText style={styles.driverOfferPriceCurrency}>MAD</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    {/* CTA row */}
                    <View style={[styles.driverOfferCTARow, { borderTopColor: theme.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <ThemedText style={[styles.driverOfferCTAText, { color: theme.primary }]}>
                        {t("viewDriverProfile")}
                      </ThemedText>
                      <View style={[styles.driverOfferCTAArrow, { backgroundColor: theme.primary + "18" }]}>
                        <Icon name="chevron-right" size={14} color={theme.primary} />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {request.driverName && isClient && request.status !== "awaiting_client_approval" ? (
          <View style={[styles.personCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={[styles.personCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.sectionAccentBar, { backgroundColor: "#2563EB" }]} />
              <ThemedText style={[styles.personCardTitle, { color: theme.text }]}>
                {t("driver") || "Chauffeur"}
              </ThemedText>
            </View>
            <View style={[styles.personCardBody, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {/* Premium avatar with gradient ring */}
              <View style={styles.personAvatarRing}>
                <LinearGradient
                  colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
                  style={styles.personAvatarGradientRing}
                >
                  <View style={[styles.personAvatarInner, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                    {request.driverAvatarUrl
                      ? <Image source={{ uri: request.driverAvatarUrl }} style={styles.personAvatarImg} />
                      : <Icon name="user" size={28} color="#2563EB" />
                    }
                  </View>
                </LinearGradient>
              </View>
              <View style={[styles.personDetails, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={styles.personName}>{request.driverName}</ThemedText>
                {request.driverRating ? <RatingStars rating={request.driverRating} size={14} /> : null}
                <View style={[styles.lockedPill, { backgroundColor: "#2563EB12", borderColor: "#2563EB25" }]}>
                  <Icon name="shield" size={11} color="#2563EB" />
                  <ThemedText style={[styles.lockedText, { color: "#2563EB" }]}>
                    {t("contactViaSupport") || "Contactez via Support"}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {request.clientName && !isClient ? (
          <View style={[styles.personCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={[styles.personCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.sectionAccentBar, { backgroundColor: "#059669" }]} />
              <ThemedText style={[styles.personCardTitle, { color: theme.text }]}>
                {t("client") || "Client"}
              </ThemedText>
            </View>
            <View style={[styles.personCardBody, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.personAvatarRing}>
                <LinearGradient
                  colors={["#064E3B", "#059669", "#10B981"]}
                  style={styles.personAvatarGradientRing}
                >
                  <View style={[styles.personAvatarInner, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                    {request.clientAvatarUrl
                      ? <Image source={{ uri: request.clientAvatarUrl }} style={styles.personAvatarImg} />
                      : <Icon name="user" size={28} color="#059669" />
                    }
                  </View>
                </LinearGradient>
              </View>
              <View style={[styles.personDetails, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <ThemedText style={styles.personName}>{request.clientName}</ThemedText>
                {request.clientRating > 0 ? <RatingStars rating={request.clientRating} size={14} /> : null}
                <View style={[styles.lockedPill, { backgroundColor: "#05996912", borderColor: "#05996925" }]}>
                  <Icon name="shield" size={11} color="#059669" />
                  <ThemedText style={[styles.lockedText, { color: "#059669" }]}>
                    {t("contactViaSupport") || "Contactez via Support"}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        {/* Primary actions: Track (full row) then Chat + Support row */}
        {request.status !== "cancelled" ? (
          <View style={styles.primaryActionsColumn}>
            {/* Suivi en direct — full width */}
            {canTrack ? (
              <Pressable
                onPress={handleTrack}
                style={({ pressed }) => [
                  styles.trackButton,
                  { backgroundColor: theme.success, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon name="map-pin" size={20} color="#FFFFFF" />
                <ThemedText style={styles.trackButtonText}>{t("liveTracking") || "Suivi en direct"}</ThemedText>
                <Icon name="chevron-right" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: "auto" }} />
              </Pressable>
            ) : null}

            {/* Message driver + Support — side by side */}
            {(canChatWithDriver || true) ? (
              <View style={styles.primaryActionsRow}>
                {canChatWithDriver ? (
                  <Pressable
                    onPress={handleDriverChat}
                    style={({ pressed }) => [
                      styles.chatButton,
                      { backgroundColor: "#10B981", opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={{ position: "relative" }}>
                      <Icon name="message-circle" size={18} color="#FFFFFF" />
                      {unreadDriverCount > 0 ? (
                        <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                          <ThemedText style={styles.badgeText}>
                            {unreadDriverCount > 9 ? "9+" : String(unreadDriverCount)}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={styles.chatButtonText}>Messages</ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleSupport}
                  style={({ pressed }) => [
                    styles.chatButton,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ position: "relative" }}>
                    <Icon name="headphones" size={18} color="#FFFFFF" />
                    {unreadSupportCount > 0 ? (
                      <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                        <ThemedText style={styles.badgeText}>
                          {unreadSupportCount > 9 ? "9+" : String(unreadSupportCount)}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={styles.chatButtonText}>{t("support") || "Support"}</ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Pay Now button — for waiting_for_payment */}
        {request.status === "waiting_for_payment" && isClient ? (
          proofAlreadySubmitted ? (
            <View style={[styles.rateButton, { backgroundColor: "#6B7280", alignItems: "center", justifyContent: "center" }]}>
              <Icon name="clock" size={18} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>En attente de confirmation</ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={handlePayNow}
              style={({ pressed }) => [
                styles.rateButton,
                { backgroundColor: "#F59E0B", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="credit-card" size={18} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{t("payNow") || "Payer maintenant"}</ThemedText>
            </Pressable>
          )
        ) : null}

        {/* Confirm Delivery button — opens signature + delivery note modal */}
        {request.status === "delivered" && isClient && !deliveryConfirmed && !request.completedAt ? (
          <Pressable
            onPress={() => setShowConfirmModal(true)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              borderRadius: 18,
              overflow: "hidden",
            })}
          >
            <LinearGradient
              colors={["#059669", "#10B981"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmDeliveryBtn}
            >
              <View style={styles.confirmDeliveryIconWrap}>
                <Icon name="edit-3" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.confirmDeliveryTextWrap}>
                <ThemedText style={styles.confirmDeliveryTitle}>
                  {t("confirmDelivery") || "Signer & Confirmer la livraison"}
                </ThemedText>
                <ThemedText style={styles.confirmDeliverySubtitle}>
                  Signez pour confirmer la réception
                </ThemedText>
              </View>
              <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Success banner shown after client confirms delivery */}
        {(deliveryConfirmed || !!request.completedAt) && isClient ? (
          <LinearGradient
            colors={["#064E3B", "#065F46"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successBanner}
          >
            <View style={styles.successIconCircle}>
              <Icon name="check-circle" size={28} color="#10B981" />
            </View>
            <View style={styles.successTextWrap}>
              <ThemedText style={styles.successTitle}>
                {t("deliveryConfirmed") || "Livraison confirmée !"}
              </ThemedText>
              <ThemedText style={styles.successSubtitle}>
                {t("deliveryConfirmedSuccess") || "Le livreur a été crédité avec succès."}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleOpenDeliveryNote}
              style={({ pressed }) => ({
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 10,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="download" size={20} color="#6EE7B7" />
              <ThemedText style={{ color: "#6EE7B7", fontSize: 10, fontWeight: "700", marginTop: 2 }}>
                BON
              </ThemedText>
            </Pressable>
          </LinearGradient>
        ) : null}

        {/* Cancel button — full width, below primary actions */}
        {canCancel ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: theme.error + "60", backgroundColor: theme.error + "08", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon name="x" size={16} color={theme.error} />
            <ThemedText style={{ color: theme.error, fontWeight: "600", fontSize: 14 }}>{t("cancel")}</ThemedText>
          </Pressable>
        ) : null}

        {/* Rate + Favorite — 2-column card grid */}
        {(canRate || (request.status === "delivered" && isClient && request.driverId)) ? (
          <View style={styles.actionCardRow}>
            {canRate ? (
              <Pressable
                onPress={() => setShowRatingModal(true)}
                style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.82 : 1 }]}
              >
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionCardGradient}
                >
                  <View style={styles.actionCardIconWrap}>
                    <Icon name="star" size={22} color="#FFF" />
                  </View>
                  <ThemedText style={styles.actionCardTitle}>
                    {t("rateDriver") || "Noter le\nchauffeur"}
                  </ThemedText>
                  <View style={styles.actionCardArrow}>
                    <Icon name="chevron-right" size={13} color="rgba(255,255,255,0.65)" />
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {request.status === "delivered" && isClient && request.driverId ? (
              <Pressable
                onPress={handleToggleFavorite}
                disabled={favoriteLoading}
                style={({ pressed }) => [styles.actionCard, { opacity: pressed || favoriteLoading ? 0.75 : 1 }]}
              >
                <LinearGradient
                  colors={isFavorite ? ["#7C3AED", "#5B21B6"] : [theme.backgroundSecondary, theme.backgroundSecondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionCardGradient, !isFavorite && { borderWidth: 1.5, borderColor: theme.border }]}
                >
                  <View style={[styles.actionCardIconWrap, { backgroundColor: isFavorite ? "rgba(255,255,255,0.18)" : theme.backgroundDefault }]}>
                    <Icon name="heart" size={22} color={isFavorite ? "#FFF" : theme.textSecondary} />
                  </View>
                  <ThemedText style={[styles.actionCardTitle, { color: isFavorite ? "#FFF" : theme.textSecondary }]}>
                    {isFavorite ? (t("removeFromFavorites") || "Retiré des\nfavoris") : (t("addToFavorites") || "Ajouter aux\nfavoris")}
                  </ThemedText>
                  <View style={styles.actionCardArrow}>
                    <Icon name={isFavorite ? "check" : "plus"} size={13} color={isFavorite ? "rgba(255,255,255,0.65)" : theme.textSecondary} />
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ThemedView style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <ThemedText type="h4">{t("rateDriver")}</ThemedText>
              <Pressable onPress={() => setShowRatingModal(false)}>
                <Icon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <RatingStars rating={rating} size={36} interactive onRatingChange={setRating} />
              <View style={[styles.reviewInput, { backgroundColor: theme.backgroundSecondary }]}>
                <TextInput
                  style={[styles.reviewTextInput, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
                  placeholder={t("writeReview")}
                  placeholderTextColor={theme.textSecondary}
                  value={review}
                  onChangeText={setReview}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <Button onPress={handleSubmitRating}>{t("submitReview")}</Button>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      {(selectedOffer || (request.driverId && request.driverName)) ? (
        <DriverReviewModal
          visible={showDriverModal}
          onClose={() => {
            setShowDriverModal(false);
            setSelectedOffer(null);
          }}
          onApprove={handleApproveDriver}
          onReject={handleRejectDriver}
          driverId={selectedOffer?.driverId || request.driverId || ""}
          driverName={selectedOffer?.driverName || request.driverName || ""}
          driverPhone={selectedOffer?.driverPhone || request.driverPhone || ""}
          driverRating={selectedOffer?.driverRating || request.driverRating}
          loading={approvalLoading}
          hidePhone={!!request.driverId}
        />
      ) : null}

      <QuickMessageModal
        visible={showQuickMessage}
        requestId={request.id}
        otherPartyName={request.driverName || "Chauffeur"}
        onClose={() => setShowQuickMessage(false)}
        onSent={() => fetchDriverUnreadCount(request.id)}
      />

      {/* ── Client delivery confirmation modal (signature + delivery note) ── */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalSheet, { backgroundColor: theme.backgroundDefault }]}>
            {/* Header */}
            <LinearGradient
              colors={["#064E3B", "#065F46"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmModalHeader}
            >
              <View style={styles.confirmModalHandleBar}>
                <View style={[styles.confirmModalHandle, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
              </View>
              <View style={styles.confirmModalHeaderRow}>
                <View style={styles.confirmModalHeaderIcon}>
                  <Icon name="edit-3" size={20} color="#6EE7B7" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.confirmModalTitle}>{t("confirmDelivery")}</ThemedText>
                  <ThemedText style={styles.confirmModalSub}>{t("signHere")}</ThemedText>
                </View>
                <Pressable
                  onPress={() => { setShowConfirmModal(false); setClientSignature(null); setDeliveryNote(null); }}
                  style={[styles.confirmModalClose, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                >
                  <Icon name="x" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </LinearGradient>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.confirmModalContent}
            >
              {/* Signature pad */}
              <View style={[styles.confirmSection, { backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.lg }]}>
                <View style={styles.confirmSectionHeader}>
                  <Icon name="edit-3" size={16} color={theme.primary} />
                  <ThemedText style={[styles.confirmSectionLabel, { color: theme.text }]}>
                    {t("clientSignature")} <ThemedText style={{ color: theme.error }}>*</ThemedText>
                  </ThemedText>
                </View>
                <View style={[styles.signaturePadWrap, { borderColor: clientSignature ? "#10B981" : theme.border }]}>
                  <SignatureCapture
                    onSignatureChange={setClientSignature}
                    width={300}
                    height={150}
                  />
                </View>
                {clientSignature && (
                  <View style={styles.signedBadge}>
                    <Icon name="check-circle" size={14} color="#10B981" />
                    <ThemedText style={styles.signedBadgeText}>{t("photoTaken")}</ThemedText>
                  </View>
                )}
              </View>

              {/* Submit button */}
              <Pressable
                onPress={handleConfirmDelivery}
                disabled={!clientSignature || confirmDeliveryLoading}
                style={({ pressed }) => ({
                  opacity: !clientSignature || confirmDeliveryLoading ? 0.5 : pressed ? 0.85 : 1,
                  borderRadius: 16,
                  overflow: "hidden",
                })}
              >
                <LinearGradient
                  colors={["#059669", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmSubmitBtn}
                >
                  {confirmDeliveryLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="check-circle" size={20} color="#FFFFFF" />
                      <ThemedText style={styles.confirmSubmitText}>{t("confirmDelivery")}</ThemedText>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: "hidden",
    position: "relative",
    gap: 4,
  },
  heroBg: {
    position: "absolute",
    right: -20,
    bottom: -20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroRefBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroRefText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 18,
    marginBottom: 6,
  },
  heroPrice: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "800",
    fontFamily: "Poppins_700Bold",
    lineHeight: 52,
  },
  heroCurrency: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
    paddingBottom: 8,
  },
  heroMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroDate: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "500",
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#2563EB",
  },
  trackingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  trackingHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackingMap: {
    height: 220,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  routeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  routeCardHeader: {
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.xs,
  },
  routeCardIconBg: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  routeCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  routeDistancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeDistanceText: { fontSize: 12, fontWeight: "500" },
  routeBody: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "stretch",
  },
  routeDotsColumn: {
    alignItems: "center",
    width: 20,
    paddingTop: 4,
  },
  routeDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  routeDashedLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    borderRadius: 1,
    minHeight: 32,
  },
  routeAddressesColumn: {
    flex: 1,
    gap: Spacing.lg,
  },
  routeAddressBlock: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  routeLine: { display: "none" },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  detailsCardHeader: {
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.xs,
  },
  detailsCardIconBg: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    width: "47%",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  chipValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  detailRow: { display: "none" },
  detailLeft: { display: "none" },
  detailValue: { display: "none" },
  descriptionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  personCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  personCardHeader: {
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.sm,
  },
  personCardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  personCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  personCardBody: {
    alignItems: "center",
    gap: Spacing.md,
  },
  personAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    flexShrink: 0,
  },
  personAvatarRing: {
    flexShrink: 0,
  },
  personAvatarGradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  personAvatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  personAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  personDetails: {
    flex: 1,
    gap: 6,
  },
  personName: {
    fontSize: 17,
    fontWeight: "700",
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  lockedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  phonePill: {
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  phoneText: {
    fontSize: 13,
    fontWeight: "500",
  },
  personInfo: { display: "none" },
  personAvatar: { display: "none" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.07)",
  },
  primaryActionsColumn: {
    gap: Spacing.sm,
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  trackButton: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },
  chatButton: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    gap: Spacing.sm,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
  cancelButton: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  rateButton: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  deliveryProofCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  proofSection: {
    marginTop: Spacing.md,
  },
  deliveryPhotoImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
  },
  signatureContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  signatureImage: {
    width: "100%",
    height: 100,
  },
  deliveryNoteCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  downloadButtonInCard: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  favoriteButtonBottom: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionCardRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardGradient: {
    padding: 16,
    minHeight: 100,
    justifyContent: "space-between",
    borderRadius: 18,
  },
  actionCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionCardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  actionCardArrow: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  modalHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalBody: {
    padding: Spacing.xl,
    gap: Spacing.xl,
    alignItems: "center",
  },
  reviewInput: {
    width: "100%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  reviewTextInput: {
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  offersSection: {
    gap: Spacing.md,
  },
  offersSectionHeader: {
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  offersPulseWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  offersPulseRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  offersPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  offersSectionLabel: {
    fontWeight: "700",
    fontSize: 16,
  },
  offersCountBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 13,
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  offersCountText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  driverOfferCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  driverOfferAccentBar: {
    width: 5,
  },
  driverOfferInner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm + 2,
  },
  driverOfferTopRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  driverOfferAvatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  driverOfferAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  driverOfferAvatarInitial: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  driverOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
  },
  driverOfferInfo: {
    flex: 1,
    gap: 4,
  },
  driverOfferName: {
    fontWeight: "700",
    fontSize: 15,
  },
  driverOfferRatingRow: {
    alignItems: "center",
    gap: 4,
  },
  driverOfferRatingNum: {
    fontWeight: "700",
    fontSize: 13,
    color: "#F59E0B",
  },
  driverOfferDot: {
    fontSize: 13,
  },
  driverOfferAvailableLabel: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  driverOfferPriceBadge: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  driverOfferPriceValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 22,
  },
  driverOfferPriceCurrency: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  driverOfferCTARow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  driverOfferCTAText: {
    fontWeight: "600",
    fontSize: 13,
  },
  driverOfferCTAArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  // Legacy — kept to avoid any stray references
  offersSectionTitle: { marginBottom: Spacing.sm },
  offerPriceBadge: { display: "none" as any },
  offerPriceText: { display: "none" as any },
  approvalCard: { display: "none" as any },
  approvalGradient: { display: "none" as any },
  approvalHeader: { display: "none" as any },
  driverAvatarApproval: { display: "none" as any },
  approvalDriverName: { display: "none" as any },
  approvalBadge: { display: "none" as any },
  approvalText: { display: "none" as any },
  approvalAction: { display: "none" as any },
  approvalActionText: { display: "none" as any },
  goodsPhotosSection: {
    marginTop: Spacing.sm,
  },
  goodsPhotosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  goodsPhotoThumbnail: {
    width: 80,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  arrivedBanner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  arrivedIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  arrivedBannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  arrivedBannerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  arrivedPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  arrivedPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confirmDeliveryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderRadius: 18,
  },
  confirmDeliveryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeliveryTextWrap: {
    flex: 1,
  },
  confirmDeliveryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  confirmDeliverySubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "400",
  },
  successBanner: {
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  successTextWrap: { flex: 1 },
  successTitle: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  successSubtitle: {
    color: "rgba(167,243,208,0.9)",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },

  /* Confirm delivery modal */
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  confirmModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    overflow: "hidden",
  },
  confirmModalHeader: {
    paddingBottom: Spacing.md,
  },
  confirmModalHandleBar: {
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  confirmModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  confirmModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  confirmModalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmModalSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 1,
  },
  confirmModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 40,
  },
  confirmSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  confirmSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  confirmSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  signaturePadWrap: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    alignItems: "center",
  },
  signedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  signedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  uploadNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
  },
  deliveryNotePreview: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.md,
  },
  removeNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  confirmSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
  },
  confirmSubmitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
