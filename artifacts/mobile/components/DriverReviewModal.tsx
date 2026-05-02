import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RatingStars } from "@/components/RatingStars";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface Review {
  rating: number;
  review: string;
  clientName: string;
  createdAt: string;
}

interface DriverReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverRating?: number;
  loading?: boolean;
  hidePhone?: boolean;
}

export function DriverReviewModal({
  visible,
  onClose,
  onApprove,
  onReject,
  driverId,
  driverName,
  driverPhone,
  driverRating,
  loading = false,
  hidePhone = false,
}: DriverReviewModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [driverBio, setDriverBio] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [avgRating, setAvgRating] = useState(driverRating || 0);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (visible && driverId) {
      fetchReviews();
    }
  }, [visible, driverId]);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const url = new URL(`/api/drivers/${driverId}/reviews`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        const allReviews = data.reviews || [];
        const lastFive = allReviews.slice(0, 5);
        setReviews(lastFive);
        setTotalRatings(data.totalRatings || 0);
        setTotalDeliveries(data.totalDeliveries || 0);
        setDriverBio(data.bio || null);
        setVehicleType(data.vehicleType || null);
        setAvatarUrl(data.avatarUrl || null);
        setIsVerified(data.verificationStatus === "verified");
        setAvgRating(data.rating || driverRating || 0);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView
          style={[
            styles.modalContent,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Deep premium header */}
            <LinearGradient
              colors={["#0A1628", "#0F2447", "#1E3A8A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.driverHeader}
            >
              {/* Decorative background circles */}
              <View style={styles.headerBgCircle1} />
              <View style={styles.headerBgCircle2} />

              {/* Close button top-right */}
              <Pressable onPress={onClose} hitSlop={12} style={styles.heroCloseBtn}>
                <View style={styles.heroCloseBtnInner}>
                  <Icon name="x" size={18} color="#FFFFFF" />
                </View>
              </Pressable>

              {/* Avatar with triple ring glow */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarGlowOuter}>
                  <View style={styles.avatarGlowInner}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient
                        colors={["#3B82F6", "#6366F1"]}
                        style={styles.avatar}
                      >
                        <ThemedText style={styles.avatarInitials}>
                          {driverName ? driverName.charAt(0).toUpperCase() : "?"}
                        </ThemedText>
                      </LinearGradient>
                    )}
                  </View>
                </View>
                {isVerified ? (
                  <View style={styles.verifiedBadgeWrapper}>
                    <VerifiedBadge />
                  </View>
                ) : null}
              </View>

              <ThemedText style={styles.driverName}>{driverName}</ThemedText>
              {!hidePhone && driverPhone ? (
                <View style={styles.phoneRow}>
                  <Icon name="phone" size={13} color="rgba(255,255,255,0.55)" />
                  <ThemedText style={styles.driverPhone}>{driverPhone}</ThemedText>
                </View>
              ) : null}

              {/* Rating pill */}
              <View style={styles.ratingPill}>
                <RatingStars rating={avgRating} size={18} />
                <ThemedText style={styles.ratingPillText}>{avgRating.toFixed(1)}</ThemedText>
                {totalRatings > 0 ? (
                  <ThemedText style={styles.ratingCount}>
                    ({totalRatings})
                  </ThemedText>
                ) : null}
              </View>
            </LinearGradient>

            {/* Premium stats row */}
            <View style={styles.statsSection}>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
                <LinearGradient
                  colors={["#1D4ED820", "#3B82F620"]}
                  style={styles.statIconWrap}
                >
                  <Icon name="package" size={20} color="#3B82F6" />
                </LinearGradient>
                <ThemedText style={[styles.statNumber, { color: "#3B82F6" }]}>
                  {totalDeliveries}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("totalDeliveries")}
                </ThemedText>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
                <LinearGradient
                  colors={["#D9770620", "#F59E0B20"]}
                  style={styles.statIconWrap}
                >
                  <Icon name="star" size={20} color="#F59E0B" />
                </LinearGradient>
                <ThemedText style={[styles.statNumber, { color: "#F59E0B" }]}>
                  {avgRating.toFixed(1)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("rating")}
                </ThemedText>
              </View>

              {vehicleType ? (
                <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <LinearGradient
                    colors={["#05966920", "#10B98120"]}
                    style={styles.statIconWrap}
                  >
                    <Icon name="truck" size={20} color="#10B981" />
                  </LinearGradient>
                  <ThemedText style={[styles.statNumber, { color: "#10B981", fontSize: 13 }]}>
                    {t(vehicleType) || vehicleType}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                    {t("vehicle")}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {driverBio ? (
              <View style={styles.bioSection}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  {t("aboutDriver")}
                </ThemedText>
                <View style={[styles.bioCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={[styles.bioText, { textAlign: isRTL ? "right" : "left" }]}>
                    {driverBio}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            <View style={styles.reviewsSection}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                {t("reviews")}
              </ThemedText>

              {loadingReviews ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : reviews.length === 0 ? (
                <View style={[styles.emptyReviews, { backgroundColor: theme.backgroundSecondary }]}>
                  <Icon name="message-circle" size={32} color={theme.textSecondary} />
                  <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {t("noReviewsYet")}
                  </ThemedText>
                </View>
              ) : (
                <>
                  {reviews.map((review, index) => (
                    <View
                      key={index}
                      style={[styles.reviewCard, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      <View style={[styles.reviewHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                        <View style={[styles.reviewerInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                          <View style={[styles.reviewNumberBadge, { backgroundColor: theme.primary }]}>
                            <ThemedText style={styles.reviewNumber}>{index + 1}</ThemedText>
                          </View>
                          <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                            <ThemedText style={styles.reviewerName}>
                              {review.clientName}
                            </ThemedText>
                            <ThemedText style={[styles.reviewDate, { color: theme.textSecondary }]}>
                              {formatDate(review.createdAt)}
                            </ThemedText>
                          </View>
                        </View>
                        <RatingStars rating={review.rating} size={14} />
                      </View>
                      {review.review ? (
                        <ThemedText style={[styles.reviewText, { textAlign: isRTL ? "right" : "left" }]}>
                          {review.review}
                        </ThemedText>
                      ) : null}
                    </View>
                  ))}
                  {totalRatings > 5 ? (
                    <ThemedText style={[styles.moreReviews, { color: theme.textSecondary }]}>
                      {`+${totalRatings - 5} ${t("moreReviews")}`}
                    </ThemedText>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {/* Primary: Approve — full width gradient */}
            <Pressable
              onPress={onApprove}
              disabled={loading}
              style={({ pressed }) => ({
                opacity: pressed || loading ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderRadius: 16,
                overflow: "hidden",
              })}
            >
              <LinearGradient
                colors={["#059669", "#10B981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.approveButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.approveIconCircle}>
                      <Icon name="check" size={18} color="#059669" />
                    </View>
                    <ThemedText style={styles.approveButtonText}>{t("approveDriver")}</ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Secondary: Reject — outlined, less dominant */}
            <Pressable
              onPress={onReject}
              disabled={loading}
              style={({ pressed }) => [
                styles.rejectButton,
                { borderColor: theme.error + "50", backgroundColor: theme.error + "08", opacity: pressed || loading ? 0.8 : 1 },
              ]}
            >
              <Icon name="x" size={16} color={theme.error} />
              <ThemedText style={[styles.rejectButtonText, { color: theme.error }]}>{t("rejectDriver")}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: "60%",
    maxHeight: "92%",
    overflow: "hidden",
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  driverHeader: {
    paddingTop: Spacing.xl + 12,
    paddingBottom: Spacing.xl + 4,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  headerBgCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.12)",
    top: -60,
    right: -60,
  },
  headerBgCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(99,102,241,0.1)",
    bottom: -40,
    left: -30,
  },
  heroCloseBtn: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  heroCloseBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.xs,
  },
  avatarGlowOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(99,102,241,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlowInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  verifiedBadgeWrapper: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  driverName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  driverPhone: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginTop: 4,
  },
  ratingPillText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  ratingContainer: {
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  ratingCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bioSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bioCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewsSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyReviews: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerInfo: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  moreReviews: {
    textAlign: "center",
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  reviewerName: {
    fontWeight: "600",
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "column",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
  },
  approveButton: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  approveIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  rejectButton: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  rejectButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
