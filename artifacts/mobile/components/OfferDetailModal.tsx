import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Pressable,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, VehicleTypes, DeliveryOptions } from "@/constants/theme";
import { formatWeight, calculateDriverEarning } from "@/utils/commission";

const { width: SW, height: SH } = Dimensions.get("window");
const SHEET_HEIGHT = SH * 0.88;

interface Props {
  visible: boolean;
  request: TransportRequest | null;
  hasOffered: boolean;
  offeredPrice?: number;
  onClose: () => void;
  onAccept: () => void;
  onNegotiate: () => void;
}

export function OfferDetailModal({
  visible,
  request,
  hasOffered,
  offeredPrice,
  onClose,
  onAccept,
  onNegotiate,
}: Props) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  // Keep the last non-null request so content stays visible during the closing animation
  const lastRequest = useRef<TransportRequest | null>(null);
  if (request) lastRequest.current = request;
  const req = lastRequest.current;

  useEffect(() => {
    if (visible) {
      // Reset position before animating in
      slideAnim.setValue(SHEET_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setSelectedPhoto(null));
    }
  }, [visible]);

  const weight = req?.estimatedWeight || 0;
  const { earning: driverNet, rate } = calculateDriverEarning(req?.proposedPrice || 0, weight);
  const driverNetOffered = offeredPrice
    ? calculateDriverEarning(offeredPrice, weight).earning
    : undefined;

  const vehicle = VehicleTypes.find((v) => v.id === req?.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar" ? vehicle.labelAr : vehicle.labelFr
    : req?.vehicleType ?? "";

  const deliveryOption = DeliveryOptions.find((d) => d.id === req?.deliveryOption);
  const optionLabel = deliveryOption
    ? language === "ar" ? deliveryOption.labelAr : deliveryOption.labelFr
    : req?.deliveryOption ?? "";

  const goodsPhotos: string[] = (() => {
    if (!req?.goodsPhotos) return [];
    const raw = req.goodsPhotos;
    let arr: string[] = [];
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        arr = Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    // Accept any valid URL (http or https)
    return arr.filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
  })();

  const handleAcceptAndClose = () => {
    onClose();
    setTimeout(onAccept, 300);
  };

  const handleNegotiateAndClose = () => {
    onClose();
    setTimeout(onNegotiate, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundRoot,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          bounces={false}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + "BB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={[styles.headerTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="x" size={18} color="#FFFFFF" />
              </Pressable>
              <View style={styles.optionPill}>
                <ThemedText style={styles.optionPillText}>{optionLabel}</ThemedText>
              </View>
            </View>

            <View style={[styles.clientRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {req?.clientAvatarUrl ? (
                <Image source={{ uri: req.clientAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Icon name="user" size={22} color={theme.primary} />
                </View>
              )}
              <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                <ThemedText style={styles.clientName}>{req?.clientName}</ThemedText>
                {(req?.clientRating ?? 0) > 0 ? (
                  <View
                    style={[styles.ratingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Icon name="star" size={12} color="#FCD34D" />
                    <ThemedText style={styles.ratingText}>
                      {req!.clientRating.toFixed(1)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <View style={styles.distanceBadge}>
                <Icon name="navigation" size={12} color={theme.primary} />
                <ThemedText style={[styles.distanceText, { color: theme.primary }]}>
                  {req?.distance} km
                </ThemedText>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <View style={[styles.routeCard, { backgroundColor: theme.backgroundDefault }]}>
              <View
                style={[styles.routeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <View style={[styles.routeIcon, { backgroundColor: theme.success + "20" }]}>
                  <Icon name="map-pin" size={13} color={theme.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.routeLabel,
                      { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("pickup")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.routeAddr, { textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={2}
                  >
                    {req?.pickupAddress}
                  </ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.routeConnector,
                  { marginLeft: isRTL ? 0 : 15, marginRight: isRTL ? 15 : 0 },
                ]}
              >
                <View style={[styles.connectorLine, { backgroundColor: theme.border }]} />
              </View>

              <View
                style={[styles.routeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <View style={[styles.routeIcon, { backgroundColor: theme.error + "20" }]}>
                  <Icon name="flag" size={13} color={theme.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.routeLabel,
                      { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("delivery")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.routeAddr, { textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={2}
                  >
                    {req?.deliveryAddress}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.chipsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <Icon name="truck" size={15} color={theme.primary} />
                <ThemedText style={styles.chipText}>{vehicleLabel}</ThemedText>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <Icon name="package" size={15} color={theme.primary} />
                <ThemedText style={styles.chipText}>{formatWeight(weight)}</ThemedText>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <Icon name="navigation" size={15} color={theme.primary} />
                <ThemedText style={styles.chipText}>{req?.distance} km</ThemedText>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
              <View
                style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <Icon name="align-left" size={14} color={theme.primary} />
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {t("goodsDescription")}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.goodsText, { textAlign: isRTL ? "right" : "left" }]}
              >
                {req?.goodsDescription}
              </ThemedText>
            </View>

            {goodsPhotos.length > 0 ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
                <View
                  style={[
                    styles.sectionHeader,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Icon name="image" size={14} color={theme.primary} />
                  <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    Photos de la marchandise ({goodsPhotos.length})
                  </ThemedText>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                >
                  {goodsPhotos.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.82}
                      onPress={() => setSelectedPhoto(idx)}
                      style={styles.thumbWrap}
                    >
                      <Image source={{ uri }} style={styles.thumb} />
                      <View style={styles.zoomBadge}>
                        <Icon name="zoom-in" size={12} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <LinearGradient
              colors={
                hasOffered
                  ? [theme.warning + "22", theme.warning + "0A"]
                  : ["#064E3B", "#065F46"]
              }
              style={styles.priceCard}
            >
              {hasOffered ? (
                <View
                  style={[
                    styles.waitingRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <View style={[styles.waitIcon, { backgroundColor: theme.warning + "30" }]}>
                    <Icon name="clock" size={22} color={theme.warning} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                    <ThemedText style={[styles.waitTitle, { color: theme.warning }]}>
                      {t("waitingForApproval")}
                    </ThemedText>
                    {driverNetOffered !== undefined ? (
                      <ThemedText style={[styles.waitSub, { color: theme.textSecondary }]}>
                        {t("yourOffer")}: {driverNetOffered} {t("mad")}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
                  <ThemedText style={styles.priceReceiveLabel}>Vous recevrez</ThemedText>
                  <View
                    style={[
                      styles.priceAmountRow,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <ThemedText style={styles.priceAmount}>{driverNet}</ThemedText>
                    <ThemedText style={styles.priceCurrency}>MAD</ThemedText>
                  </View>
                  <ThemedText style={styles.commissionNote}>
                    Commission Fayage: {rate}%
                  </ThemedText>
                </>
              )}
            </LinearGradient>

            {!hasOffered ? (
              <View
                style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <Pressable
                  onPress={handleNegotiateAndClose}
                  style={({ pressed }) => [
                    styles.negotiateBtn,
                    { borderColor: theme.primary, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Icon name="message-square" size={15} color={theme.primary} />
                  <ThemedText style={[styles.negotiateBtnText, { color: theme.primary }]}>
                    {t("negotiate")}
                  </ThemedText>
                </Pressable>
                <Button onPress={handleAcceptAndClose} style={styles.acceptBtn}>
                  {t("accept")}
                </Button>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoViewer}>
          <Pressable
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhoto(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="x" size={26} color="#fff" />
          </Pressable>
          {selectedPhoto !== null ? (
            <Image
              source={{ uri: goodsPhotos[selectedPhoto] }}
              style={styles.photoViewerImg}
              resizeMode="contain"
            />
          ) : null}
          {goodsPhotos.length > 1 && selectedPhoto !== null ? (
            <View style={styles.photoNavRow}>
              <TouchableOpacity
                style={styles.photoNavBtn}
                onPress={() =>
                  setSelectedPhoto((p) =>
                    p !== null && p > 0 ? p - 1 : goodsPhotos.length - 1
                  )
                }
              >
                <Icon name="chevron-left" size={30} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                {selectedPhoto + 1} / {goodsPhotos.length}
              </ThemedText>
              <TouchableOpacity
                style={styles.photoNavBtn}
                onPress={() =>
                  setSelectedPhoto((p) =>
                    p !== null && p < goodsPhotos.length - 1 ? p + 1 : 0
                  )
                }
              >
                <Icon name="chevron-right" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  headerTopRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  optionPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clientRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  ratingRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "600",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  routeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  routeRow: {
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  routeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  routeAddr: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  routeConnector: {
    paddingVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 18,
    borderRadius: 1,
    marginLeft: 14,
  },
  chipsRow: {
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  goodsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  zoomBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 4,
  },
  priceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  priceReceiveLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  priceAmountRow: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  priceAmount: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
  },
  priceCurrency: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    fontWeight: "700",
    paddingBottom: 6,
  },
  commissionNote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
  },
  waitingRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  waitIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  waitTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  waitSub: {
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: 4,
  },
  negotiateBtn: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  negotiateBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 1,
    height: 52,
  },
  photoViewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewerClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 8,
  },
  photoViewerImg: {
    width: SW - 32,
    height: SW - 32,
    borderRadius: 16,
  },
  photoNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    marginTop: Spacing.xl,
  },
  photoNavBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
  },
});
