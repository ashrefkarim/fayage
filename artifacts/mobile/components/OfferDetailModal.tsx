import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
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
const SHEET_HEIGHT = SH * 0.9;

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

  // Persist last non-null request so content stays visible during the closing animation
  const lastRequest = useRef<TransportRequest | null>(null);
  if (request) lastRequest.current = request;
  const req = lastRequest.current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SHEET_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 72,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setSelectedPhoto(null));
    }
  }, [visible]);

  // ── Derived values ──
  const weight = req?.estimatedWeight || 0;
  const { earning: driverNet, rate } = calculateDriverEarning(req?.proposedPrice || 0, weight);
  const driverNetOffered = offeredPrice
    ? calculateDriverEarning(offeredPrice, weight).earning
    : undefined;

  const vehicle = VehicleTypes.find((v) => v.id === req?.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar" ? vehicle.labelAr : vehicle.labelFr
    : req?.vehicleType ?? "—";

  const deliveryOption = DeliveryOptions.find((d) => d.id === req?.deliveryOption);
  const optionLabel = deliveryOption
    ? language === "ar" ? deliveryOption.labelAr : deliveryOption.labelFr
    : req?.deliveryOption ?? "—";

  const goodsPhotos: string[] = (() => {
    const raw = req?.goodsPhotos;
    if (!raw) return [];
    let arr: string[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") {
      try { arr = JSON.parse(raw); } catch { return []; }
    }
    return arr.filter(
      (u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:"))
    );
  })();

  // ── Handlers ──
  const handleAcceptAndClose = () => { onClose(); setTimeout(onAccept, 300); };
  const handleNegotiateAndClose = () => { onClose(); setTimeout(onNegotiate, 300); };

  const actionBarHeight = !hasOffered ? (insets.bottom + 76) : 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundRoot,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Scrollable content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: actionBarHeight + 12 }}
          bounces={Platform.OS === "ios"}
        >
          {/* ── Header gradient ── */}
          <LinearGradient
            colors={["#0369A1", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Top row: close + option pill */}
            <View style={[styles.headerTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Icon name="x" size={17} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.optionPill}>
                <Icon name="zap" size={11} color="rgba(255,255,255,0.9)" />
                <ThemedText style={styles.optionPillText}>{optionLabel}</ThemedText>
              </View>
            </View>

            {/* Client info */}
            <View style={[styles.clientRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.avatarWrap}>
                {req?.clientAvatarUrl ? (
                  <Image source={{ uri: req.clientAvatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <ThemedText style={styles.avatarInitial}>
                      {(req?.clientName ?? "?")[0].toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start", gap: 4 }}>
                <ThemedText style={styles.clientName}>{req?.clientName ?? "—"}</ThemedText>
                {(req?.clientRating ?? 0) > 0 ? (
                  <View style={[styles.ratingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        name="star"
                        size={12}
                        color={star <= Math.round(req!.clientRating) ? "#FCD34D" : "rgba(255,255,255,0.3)"}
                      />
                    ))}
                    <ThemedText style={styles.ratingText}>
                      {req!.clientRating.toFixed(1)}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.noRatingText}>Pas encore noté</ThemedText>
                )}
              </View>
              <View style={styles.distanceBadge}>
                <Icon name="navigation" size={12} color="#0EA5E9" />
                <ThemedText style={styles.distanceText}>{req?.distance ?? "—"} km</ThemedText>
              </View>
            </View>
          </LinearGradient>

          {/* ── Body ── */}
          <View style={styles.body}>

            {/* Route card */}
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>
                ITINÉRAIRE
              </ThemedText>

              <View style={[styles.routeInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {/* Track */}
                <View style={styles.routeTrack}>
                  <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
                  <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
                  <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
                </View>

                {/* Addresses */}
                <View style={[styles.routeAddrs, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <View style={styles.addrBlock}>
                    <ThemedText style={[styles.addrLabel, { color: "#10B981" }]}>
                      RAMASSAGE
                    </ThemedText>
                    <ThemedText
                      style={[styles.addrText, { textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={2}
                    >
                      {req?.pickupAddress ?? "—"}
                    </ThemedText>
                  </View>
                  <View style={{ height: 14 }} />
                  <View style={styles.addrBlock}>
                    <ThemedText style={[styles.addrLabel, { color: "#EF4444" }]}>
                      LIVRAISON
                    </ThemedText>
                    <ThemedText
                      style={[styles.addrText, { textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={2}
                    >
                      {req?.deliveryAddress ?? "—"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Info chips */}
            <View style={[styles.chipsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.chipIcon, { backgroundColor: "#0EA5E914" }]}>
                  <Icon name="truck" size={14} color="#0EA5E9" />
                </View>
                <ThemedText style={styles.chipText} numberOfLines={2}>{vehicleLabel}</ThemedText>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.chipIcon, { backgroundColor: "#8B5CF614" }]}>
                  <Icon name="package" size={14} color="#8B5CF6" />
                </View>
                <ThemedText style={styles.chipText}>{formatWeight(weight)}</ThemedText>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.chipIcon, { backgroundColor: "#F59E0B14" }]}>
                  <Icon name="navigation" size={14} color="#F59E0B" />
                </View>
                <ThemedText style={styles.chipText}>{req?.distance ?? "—"} km</ThemedText>
              </View>
            </View>

            {/* Description */}
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>
                DESCRIPTION DE LA MARCHANDISE
              </ThemedText>
              <ThemedText
                style={[styles.descText, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
              >
                {req?.goodsDescription ?? "—"}
              </ThemedText>
            </View>

            {/* Photos */}
            {goodsPhotos.length > 0 ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.cardLabelRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>
                    PHOTOS
                  </ThemedText>
                  <View style={[styles.countBadge, { backgroundColor: theme.primary + "18" }]}>
                    <ThemedText style={[styles.countBadgeText, { color: theme.primary }]}>
                      {goodsPhotos.length}
                    </ThemedText>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                  {goodsPhotos.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPhoto(idx)}
                      style={styles.thumbWrap}
                    >
                      <Image source={{ uri }} style={styles.thumb} />
                      <View style={styles.zoomBadge}>
                        <Icon name="maximize-2" size={11} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Price card */}
            {hasOffered ? (
              <View style={[styles.card, { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D" }]}>
                <View style={[styles.waitingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.waitIconWrap, { backgroundColor: "#FDE68A" }]}>
                    <Icon name="clock" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1, gap: 4, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                    <ThemedText style={styles.waitTitle}>{t("waitingForApproval")}</ThemedText>
                    {driverNetOffered !== undefined ? (
                      <ThemedText style={styles.waitSub}>
                        Votre offre : <ThemedText style={styles.waitOfferAmt}>{driverNetOffered} MAD</ThemedText>
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={["#064E3B", "#0F766E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.priceCard}
              >
                <ThemedText style={styles.priceLabel}>Vous recevrez</ThemedText>
                <View style={[styles.priceAmountRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <ThemedText style={styles.priceAmount}>{driverNet}</ThemedText>
                  <ThemedText style={styles.priceCur}>MAD</ThemedText>
                </View>
              </LinearGradient>
            )}
          </View>
        </ScrollView>

        {/* ── Sticky action bar (outside scroll) ── */}
        {!hasOffered ? (
          <View
            style={[
              styles.actionBar,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                borderTopColor: theme.border,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleNegotiateAndClose}
              style={[styles.negotiateBtn, { borderColor: theme.primary }]}
              activeOpacity={0.75}
            >
              <Icon name="message-square" size={16} color={theme.primary} />
              <ThemedText style={[styles.negotiateBtnText, { color: theme.primary }]}>
                {t("negotiate")}
              </ThemedText>
            </TouchableOpacity>
            <Button onPress={handleAcceptAndClose} style={styles.acceptBtn}>
              {t("accept")}
            </Button>
          </View>
        ) : null}
      </Animated.View>

      {/* ── Full-screen photo viewer ── */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoViewer}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhoto(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <Icon name="x" size={24} color="#fff" />
          </TouchableOpacity>

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
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedPhoto((p) => (p !== null && p > 0 ? p - 1 : goodsPhotos.length - 1))
                }
              >
                <Icon name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.photoCounter}>
                {selectedPhoto + 1} / {goodsPhotos.length}
              </ThemedText>
              <TouchableOpacity
                style={styles.photoNavBtn}
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedPhoto((p) => (p !== null && p < goodsPhotos.length - 1 ? p + 1 : 0))
                }
              >
                <Icon name="chevron-right" size={28} color="#fff" />
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
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 30,
  },

  /* Handle */
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },

  /* Header */
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  headerTopRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  optionPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  clientRow: {
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0EA5E9",
  },
  clientName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  ratingRow: {
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 3,
  },
  noRatingText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0EA5E9",
  },

  /* Body */
  body: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardLabelRow: {
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  /* Route */
  routeInner: {
    gap: 14,
    alignItems: "stretch",
  },
  routeTrack: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 18,
    width: 14,
    flexShrink: 0,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 5,
    minHeight: 20,
  },
  routeAddrs: {
    flex: 1,
  },
  addrBlock: {
    gap: 3,
    paddingVertical: 6,
  },
  addrLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  addrText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  /* Chips */
  chipsRow: {
    gap: 10,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },

  /* Description */
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },

  /* Photos */
  thumbWrap: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 14,
  },
  zoomBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    padding: 5,
  },

  /* Price */
  priceCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  priceLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceAmountRow: {
    alignItems: "flex-end",
    gap: 8,
  },
  priceAmount: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
  },
  priceCur: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
    fontWeight: "700",
    paddingBottom: 8,
  },
  commissionRow: {
    justifyContent: "center",
    marginTop: 4,
  },
  commissionPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  commissionText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Waiting */
  waitingRow: {
    alignItems: "center",
    gap: 14,
  },
  waitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  waitTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  waitSub: {
    fontSize: 13,
    color: "#B45309",
  },
  waitOfferAmt: {
    fontWeight: "800",
  },

  /* Action bar */
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  negotiateBtn: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  negotiateBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 1,
    height: 52,
  },

  /* Photo viewer */
  photoViewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewerClose: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 22,
    padding: 10,
  },
  photoViewerImg: {
    width: SW - 32,
    height: SW - 32,
    borderRadius: 18,
  },
  photoNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    marginTop: 28,
  },
  photoNavBtn: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 24,
  },
  photoCounter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
