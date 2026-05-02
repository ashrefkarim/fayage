import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView, Modal, TouchableOpacity, Dimensions } from "react-native";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, VehicleTypes, DeliveryOptions, Shadows } from "@/constants/theme";
import { formatWeight, calculateDriverEarning } from "@/utils/commission";

const { width: screenWidth } = Dimensions.get("window");

interface JobCardProps {
  request: TransportRequest;
  onAccept: () => void;
  onNegotiate: () => void;
  hasOffered?: boolean;
  offeredPrice?: number;
}

export function JobCard({ request, onAccept, onNegotiate, hasOffered = false, offeredPrice }: JobCardProps) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Always show driver the net price (after commission deduction)
  const weight = request.estimatedWeight || 0;
  const { earning: driverNetProposedPrice, rate: commissionRate } = calculateDriverEarning(request.proposedPrice || 0, weight);
  const driverNetOfferedPrice = offeredPrice ? calculateDriverEarning(offeredPrice, weight).earning : undefined;

  // Parse goodsPhotos - it may be a JSON string or already an array
  // Also filter out invalid local file:// URLs from old orders
  const goodsPhotos: string[] = (() => {
    let photos: string[] = [];
    if (!request.goodsPhotos) return [];
    if (Array.isArray(request.goodsPhotos)) {
      photos = request.goodsPhotos;
    } else if (typeof request.goodsPhotos === "string") {
      try {
        const parsed = JSON.parse(request.goodsPhotos);
        photos = Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    // Filter out local file:// URLs that won't work
    return photos.filter((url) => url && url.startsWith("http"));
  })();

  const vehicle = VehicleTypes.find((v) => v.id === request.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar"
      ? vehicle.labelAr
      : vehicle.labelFr
    : request.vehicleType;

  const deliveryOption = DeliveryOptions.find((d) => d.id === request.deliveryOption);
  const optionLabel = deliveryOption
    ? language === "ar"
      ? deliveryOption.labelAr
      : deliveryOption.labelFr
    : request.deliveryOption;

  const handleAccept = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  return (
    <View
      style={[
        styles.card,
        Shadows.lg,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.clientInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {request.clientAvatarUrl ? (
            <Image source={{ uri: request.clientAvatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
              <Icon name="user" size={20} color={theme.primary} />
            </View>
          )}
          <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
            <ThemedText style={styles.clientName}>{request.clientName}</ThemedText>
            {request.clientRating > 0 ? (
              <View style={[styles.ratingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Icon name="star" size={12} color={theme.warning} />
                <ThemedText style={[styles.ratingText, { color: theme.textSecondary }]}>
                  {request.clientRating.toFixed(1)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.optionBadge, { backgroundColor: theme.secondary + "20" }]}>
          <ThemedText style={[styles.optionText, { color: theme.secondary }]}>
            {optionLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.route}>
        <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.success + "20" }]}>
            <Icon name="map-pin" size={14} color={theme.success} />
          </View>
          <View style={[styles.addressTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={[styles.addressLabel, { color: theme.textSecondary }]}>
              {t("pickup")}
            </ThemedText>
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {request.pickupAddress}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.verticalLine, { backgroundColor: theme.border }]} />

        <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.error + "20" }]}>
            <Icon name="flag" size={14} color={theme.error} />
          </View>
          <View style={[styles.addressTextContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={[styles.addressLabel, { color: theme.textSecondary }]}>
              {t("delivery")}
            </ThemedText>
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {request.deliveryAddress}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.details, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.detailCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon name="truck" size={16} color={theme.primary} />
          <ThemedText style={styles.detailValue}>{vehicleLabel}</ThemedText>
        </View>
        <View style={[styles.detailCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon name="navigation" size={16} color={theme.primary} />
          <ThemedText style={styles.detailValue}>{request.distance} {t("km")}</ThemedText>
        </View>
        <View style={[styles.detailCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon name="package" size={16} color={theme.primary} />
          <ThemedText style={styles.detailValue}>{formatWeight(request.estimatedWeight)}</ThemedText>
        </View>
      </View>

      <View style={styles.description}>
        <ThemedText style={[styles.descriptionLabel, { color: theme.textSecondary }]}>
          {t("goodsDescription")}
        </ThemedText>
        <ThemedText style={styles.descriptionText} numberOfLines={2}>
          {request.goodsDescription}
        </ThemedText>
      </View>

      {goodsPhotos.length > 0 ? (
        <View style={styles.photosSection}>
          <ThemedText style={[styles.descriptionLabel, { color: theme.textSecondary }]}>
            {t("goodsPhotos")} ({goodsPhotos.length})
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosContainer}
          >
            {goodsPhotos.map((uri, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedPhotoIndex(index)}
                style={styles.photoThumbnailContainer}
              >
                <Image source={{ uri }} style={styles.photoThumbnail} />
                <View style={[styles.photoOverlay, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                  <Icon name="zoom-in" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Modal
        visible={selectedPhotoIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Icon name="x" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedPhotoIndex !== null ? (
            <Image
              source={{ uri: goodsPhotos[selectedPhotoIndex] }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          ) : null}
          {goodsPhotos.length > 1 && selectedPhotoIndex !== null ? (
            <View style={styles.photoModalNav}>
              <TouchableOpacity
                onPress={() => setSelectedPhotoIndex(prev => prev !== null && prev > 0 ? prev - 1 : goodsPhotos.length - 1)}
                style={styles.photoNavButton}
              >
                <Icon name="chevron-left" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <ThemedText style={styles.photoCounter}>
                {selectedPhotoIndex + 1} / {goodsPhotos.length}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setSelectedPhotoIndex(prev => prev !== null && prev < goodsPhotos.length - 1 ? prev + 1 : 0)}
                style={styles.photoNavButton}
              >
                <Icon name="chevron-right" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>

      <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ThemedText style={[styles.priceLabel, { color: theme.textSecondary }]}>
          {t("proposedPrice")}
        </ThemedText>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
          <ThemedText style={[styles.priceValue, { color: theme.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {driverNetProposedPrice}
          </ThemedText>
          <ThemedText style={{ color: theme.primary, fontSize: 13, fontWeight: "600", paddingBottom: 1 }}>
            {t("mad")}
          </ThemedText>
        </View>
      </View>

      {hasOffered ? (
        <View style={[styles.waitingContainer, { backgroundColor: theme.warning + "15" }]}>
          <View style={[styles.waitingIcon, { backgroundColor: theme.warning + "20" }]}>
            <Icon name="clock" size={20} color={theme.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.waitingTitle, { color: theme.warning }]}>
              {t("waitingForApproval")}
            </ThemedText>
            {driverNetOfferedPrice !== undefined ? (
              <ThemedText style={[styles.waitingSubtitle, { color: theme.textSecondary }]}>
                {t("yourOffer")}: {driverNetOfferedPrice} {t("mad")}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Pressable
            onPress={onNegotiate}
            style={({ pressed }) => [
              styles.negotiateButton,
              {
                borderColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.negotiateText, { color: theme.primary }]}>
              {t("negotiate")}
            </ThemedText>
          </Pressable>
          <Button onPress={handleAccept} style={styles.acceptButton}>
            {t("accept")}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  header: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientInfo: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
  },
  ratingRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
  },
  optionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  route: {
    gap: Spacing.xs,
  },
  addressRow: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalLine: {
    width: 2,
    height: 16,
    marginLeft: 13,
    borderRadius: 1,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "500",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "500",
  },
  details: {
    gap: Spacing.sm,
  },
  detailCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  description: {
    gap: Spacing.xs,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  descriptionText: {
    fontSize: 14,
  },
  priceRow: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  actions: {
    gap: Spacing.sm,
  },
  negotiateButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  negotiateText: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
  },
  waitingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  waitingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  waitingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  photosSection: {
    gap: Spacing.sm,
  },
  photosContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  photoThumbnailContainer: {
    position: "relative",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  photoThumbnail: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 4,
    borderTopLeftRadius: BorderRadius.sm,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  photoModalImage: {
    width: screenWidth - 40,
    height: screenWidth - 40,
    borderRadius: BorderRadius.md,
  },
  photoModalNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    marginTop: Spacing.xl,
  },
  photoNavButton: {
    padding: Spacing.md,
  },
  photoCounter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
