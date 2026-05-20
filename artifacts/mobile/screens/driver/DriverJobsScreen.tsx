import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Modal, TextInput, Pressable, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Icon } from "@/components/Icon";
import { MapViewComponent, LocationCoordinates } from "@/components/MapViewComponent";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { JobCard } from "@/components/JobCard";
import { OfferDetailModal } from "@/components/OfferDetailModal";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest } from "@/contexts/RequestsContext";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { calculateDriverEarning } from "@/utils/commission";

interface DriverOffer {
  orderId: string;
  offeredPrice: number;
  status: string;
}

function PulseCircle({ color, delay = 0 }: { color: string; delay?: number }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseCircle,
        {
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

export default function DriverJobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { gradients } = useDynamicTheme();
  const { t, isRTL } = useLanguage();
  const { user, canAcceptOrders } = useAuth();
  const { getAvailableRequests, acceptRequest, isLoading, refreshRequests, isConnected } = useRequests();

  const [negotiateModal, setNegotiateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<TransportRequest | null>(null);
  const [counterOffer, setCounterOffer] = useState("");
  const [driverOffers, setDriverOffers] = useState<DriverOffer[]>([]);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const isVerified = canAcceptOrders();
  const availableRequests = getAvailableRequests(user?.id, isVerified);

  const fetchDriverOffers = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${getApiUrl()}api/driver-offers/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDriverOffers(data.offers || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch driver offers:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDriverOffers();
  }, [fetchDriverOffers]);

  const openLocationModal = async () => {
    setLocationModalVisible(true);
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log("Location error:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  const getOfferForOrder = (orderId: string): DriverOffer | undefined => {
    return driverOffers.find(o => o.orderId === orderId && o.status === "pending");
  };

  const handleAccept = async (request: TransportRequest) => {
    if (!user) return;
    
    if (!isVerified) {
      Alert.alert(
        t("verificationRequired"),
        t("verificationRequiredMessage"),
        [{ text: t("ok") }]
      );
      return;
    }

    try {
      await acceptRequest(
        request.id,
        user.id,
        user.fullName,
        user.phone,
        user.rating
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchDriverOffers();
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("failedToAcceptOrder"));
    }
  };

  const handleNegotiate = (request: TransportRequest) => {
    if (!isVerified) {
      Alert.alert(
        t("verificationRequired"),
        t("verificationRequiredMessage"),
        [{ text: t("ok") }]
      );
      return;
    }
    
    setSelectedRequest(request);
    // Initialise with driver's net price (what they'll receive after commission)
    const { earning: netPrice } = calculateDriverEarning(request.proposedPrice || 0, request.estimatedWeight || 0);
    setCounterOffer(netPrice.toString());
    setNegotiateModal(true);
  };

  const handleSubmitOffer = async () => {
    if (!user || !selectedRequest) return;
    const driverNetPrice = parseFloat(counterOffer);
    if (isNaN(driverNetPrice) || driverNetPrice <= 0) return;

    // Convert driver's desired net earnings to gross price (what client will pay)
    const weight = selectedRequest.estimatedWeight || 0;
    const { rate } = calculateDriverEarning(driverNetPrice, weight);
    const grossPrice = Math.round(driverNetPrice / (1 - rate / 100));

    try {
      await acceptRequest(
        selectedRequest.id,
        user.id,
        user.fullName,
        user.phone,
        user.rating,
        grossPrice  // client sees this gross price
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNegotiateModal(false);
      setSelectedRequest(null);
      await fetchDriverOffers();
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("failedToAcceptOrder"));
    }
  };

  const renderItem = ({ item }: { item: TransportRequest }) => {
    const offer = getOfferForOrder(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={() => setDetailRequest(item)}
      >
        <JobCard
          request={item}
          onAccept={() => handleAccept(item)}
          onNegotiate={() => handleNegotiate(item)}
          hasOffered={!!offer}
          offeredPrice={offer?.offeredPrice}
        />
      </TouchableOpacity>
    );
  };

  const renderPendingVerification = () => {
    const isRejected = user?.verificationStatus === "rejected";
    const statusColor = isRejected ? theme.error : theme.warning;
    
    return (
      <Card style={styles.verificationCard}>
        <View style={[styles.verificationIcon, { backgroundColor: statusColor + "15" }]}>
          <Icon name={isRejected ? "x-circle" : "clock"} size={48} color={statusColor} />
        </View>
        <ThemedText type="h3" style={styles.verificationTitle}>
          {isRejected ? t("verificationRejected") : t("pendingVerification")}
        </ThemedText>
        <ThemedText style={[styles.verificationText, { color: theme.textSecondary }]}>
          {isRejected ? t("rejectedDriverNote") : t("pendingVerificationMessage")}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
          <Icon name="shield" size={16} color={statusColor} />
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {isRejected ? t("rejected") : t("pending")}
          </ThemedText>
        </View>
        {isRejected && user?.rejectionReason ? (
          <View style={[styles.rejectionReasonBox, { backgroundColor: theme.error + "08", borderColor: theme.error + "25" }]}>
            <ThemedText style={[styles.rejectionReasonLabel, { color: theme.error }]}>
              {t("rejectionReason")}:
            </ThemedText>
            <ThemedText style={[styles.rejectionReasonText, { color: theme.text }]}>
              {user.rejectionReason}
            </ThemedText>
          </View>
        ) : null}
        {isRejected ? (
          <Button
            onPress={() => navigation.navigate("EditDocuments" as never)}
            style={styles.updateButton}
          >
            {t("updateDocuments")}
          </Button>
        ) : (
          <View style={[styles.waitTimeBox, { backgroundColor: theme.primary + "08" }]}>
            <Icon name="info" size={16} color={theme.primary} />
            <ThemedText style={[styles.waitTimeText, { color: theme.primary }]}>
              {t("verificationWaitTime") || "24-48h"}
            </ThemedText>
          </View>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.radarContainer}>
        <PulseCircle color={theme.primary} delay={0} />
        <PulseCircle color={theme.primary} delay={500} />
        <PulseCircle color={theme.primary} delay={1000} />
        <View style={[styles.radarCenter, { backgroundColor: theme.primary }]}>
          <Icon name="activity" size={28} color="#FFFFFF" />
        </View>
      </View>
      
      <ThemedText type="h3" style={styles.emptyTitle}>
        {t("noAvailableJobs")}
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {t("waitingForJobs")}
      </ThemedText>


      <Card elevation={1} style={styles.tipsCard}>
        <View style={[styles.tipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.tipIconBg, { backgroundColor: theme.success + "15" }]}>
            <Icon name="map-pin" size={18} color={theme.success} />
          </View>
          <View style={[styles.tipTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText type="label" style={{ fontWeight: "600" }}>{t("stayInBusyAreas") || "Stay in busy areas"}</ThemedText>
            <ThemedText style={[styles.tipDescription, { color: theme.textSecondary }]}>
              {t("stayInBusyAreasDesc") || "More jobs appear in commercial zones"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.tipDivider} />
        <View style={[styles.tipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.tipIconBg, { backgroundColor: theme.primary + "15" }]}>
            <Icon name="bell" size={18} color={theme.primary} />
          </View>
          <View style={[styles.tipTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText type="label" style={{ fontWeight: "600" }}>{t("notificationsEnabled") || "Stay connected"}</ThemedText>
            <ThemedText style={[styles.tipDescription, { color: theme.textSecondary }]}>
              {t("notificationsEnabledDesc") || "You'll be notified of new jobs"}
            </ThemedText>
          </View>
        </View>
      </Card>

      <View style={styles.emptyButtonsRow}>
        <Pressable 
          onPress={openLocationModal}
          style={({ pressed }) => [
            styles.locationButton,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Icon name="map" size={18} color={theme.primary} />
          <ThemedText style={[styles.locationButtonText, { color: theme.primary }]}>{t("viewMap") || "Voir carte"}</ThemedText>
        </Pressable>

        <Pressable 
          onPress={refreshRequests}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Icon name="refresh-cw" size={18} color="#FFFFFF" />
          <ThemedText style={styles.refreshButtonText}>{t("refresh")}</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <AnnouncementBanner audience="drivers" />
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={[styles.headerContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.headerIconBg}>
            <Icon name="briefcase" size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.headerTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={styles.headerTitle}>{t("availableJobs")}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {availableRequests.length} {t("jobsNearYou") || "jobs near you"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerDecor}>
          <Icon name="truck" size={80} color="rgba(255,255,255,0.1)" />
        </View>
      </LinearGradient>

      <View style={[styles.connectionStatus, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? theme.success : theme.warning }]} />
        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
          {isConnected ? t("liveUpdates") : t("polling")}
        </ThemedText>
      </View>
    </View>
  );

  if (!isVerified) {
    return (
      <View style={[styles.pendingContainer, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.pendingContent}>
          {renderPendingVerification()}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={availableRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshRequests} />
        }
      />

      <Modal
        visible={negotiateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNegotiateModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ThemedView style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <ThemedText type="h4">{t("negotiate")}</ThemedText>
              <TouchableOpacity
                onPress={() => setNegotiateModal(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedRequest ? (
              <View style={styles.modalBody}>
                {(() => {
                  const weight = selectedRequest.estimatedWeight || 0;
                  const { rate, earning: netProposed } = calculateDriverEarning(selectedRequest.proposedPrice || 0, weight);
                  const driverInput = parseFloat(counterOffer) || 0;
                  const clientWillSee = driverInput > 0
                    ? parseFloat((driverInput / (1 - rate / 100)).toFixed(2))
                    : 0;
                  return (
                    <>
                      {/* What driver will earn from client's proposed price */}
                      <View style={[styles.priceInfo, { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: "#10B981" + "12", borderRadius: 10, padding: 10, marginBottom: 10 }]}>
                        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                          Vous recevrez (offre client):
                        </ThemedText>
                        <ThemedText type="h4" style={{ color: "#10B981" }}>
                          {netProposed} {t("mad")}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>
                        Commission Fayage: {rate}%
                      </ThemedText>
                    </>
                  );
                })()}


                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { textAlign: isRTL ? "right" : "left" }]}>
                    Montant que vous souhaitez recevoir
                  </ThemedText>
                  <View style={[styles.priceInput, { backgroundColor: theme.backgroundSecondary }]}>
                    <TextInput
                      style={[styles.input, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
                      value={counterOffer}
                      onChangeText={setCounterOffer}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <ThemedText style={{ color: theme.textSecondary }}>{t("mad")}</ThemedText>
                  </View>
                </View>

                <Button onPress={handleSubmitOffer} style={styles.submitButton}>
                  {t("submit")}
                </Button>
              </View>
            ) : null}
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.locationModalOverlay}>
          <ThemedView style={styles.locationModalContent}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <ThemedText type="h4">{t("viewMap") || "Voir carte"}</ThemedText>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.locationMapContainer}>
              {locationLoading ? (
                <View style={styles.locationLoadingContainer}>
                  <Icon name="loader" size={32} color={theme.primary} />
                  <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                    {t("gettingLocation") || "Getting your location..."}
                  </ThemedText>
                </View>
              ) : driverLocation ? (
                <MapViewComponent
                  pickup={driverLocation}
                  showDriverMarker
                  driverLocation={driverLocation}
                  style={styles.locationMap}
                />
              ) : (
                <View style={styles.locationLoadingContainer}>
                  <Icon name="map-pin" size={32} color={theme.textSecondary} />
                  <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                    {t("locationNotAvailable") || "Location not available"}
                  </ThemedText>
                </View>
              )}
            </View>
          </ThemedView>
        </View>
      </Modal>

      <OfferDetailModal
        visible={detailRequest !== null}
        request={detailRequest}
        hasOffered={detailRequest ? !!getOfferForOrder(detailRequest.id) : false}
        offeredPrice={detailRequest ? getOfferForOrder(detailRequest.id)?.offeredPrice : undefined}
        onClose={() => setDetailRequest(null)}
        onAccept={() => {
          if (detailRequest) handleAccept(detailRequest);
          setDetailRequest(null);
        }}
        onNegotiate={() => {
          if (detailRequest) handleNegotiate(detailRequest);
          setDetailRequest(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  headerContent: {
    alignItems: "center",
    gap: Spacing.md,
    zIndex: 1,
  },
  headerIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  headerDecor: {
    position: "absolute",
    right: -10,
    bottom: -15,
    opacity: 0.5,
  },
  connectionStatus: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  separator: {
    height: Spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.lg,
  },
  radarContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  pulseCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  radarCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  tipsCard: {
    width: "100%",
    marginTop: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  tipRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  tipIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextContainer: {
    flex: 1,
    gap: 2,
  },
  tipDescription: {
    fontSize: 12,
  },
  tipDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  emptyButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  locationButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  locationModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    height: "70%",
  },
  locationMapContainer: {
    flex: 1,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  locationMap: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  locationLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingContainer: {
    flex: 1,
  },
  pendingContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  verificationCard: {
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  verificationIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  verificationTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  verificationText: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  waitTimeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  waitTimeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  updateButton: {
    marginTop: Spacing.lg,
    width: "100%",
  },
  rejectionReasonBox: {
    width: "100%",
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  rejectionReasonText: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  priceInfo: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.sm,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  driverMapCard: {
    width: "100%",
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  mapSectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapTitleRow: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  driverMapContainer: {
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  driverMap: {
    flex: 1,
  },
});
