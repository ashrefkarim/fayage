import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, VehicleTypes } from "@/constants/theme";
import { formatWeight } from "@/utils/commission";

interface RequestCardProps {
  request: TransportRequest;
  onPress?: () => void;
  showDriver?: boolean;
  showClient?: boolean;
}

export function RequestCard({ request, onPress, showDriver, showClient }: RequestCardProps) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();

  const vehicle = VehicleTypes.find((v) => v.id === request.vehicleType);
  const vehicleLabel = vehicle
    ? language === "ar"
      ? vehicle.labelAr
      : vehicle.labelFr
    : request.vehicleType;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.routeContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <ThemedText style={styles.address} numberOfLines={1}>
              {request.pickupAddress}
            </ThemedText>
          </View>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.dot, { backgroundColor: theme.error }]} />
            <ThemedText style={styles.address} numberOfLines={1}>
              {request.deliveryAddress}
            </ThemedText>
          </View>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={[styles.details, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.detailItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="truck" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
            {vehicleLabel}
          </ThemedText>
        </View>
        <View style={[styles.detailItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
            {request.distance} {t("km")}
          </ThemedText>
        </View>
        <View style={[styles.detailItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="package" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
            {formatWeight(request.estimatedWeight)}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {showDriver && request.driverName ? (
          <View style={[styles.personInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {request.driverAvatarUrl ? (
              <Image source={{ uri: request.driverAvatarUrl }} style={styles.personAvatar} />
            ) : (
              <Icon name="user" size={14} color={theme.primary} />
            )}
            <ThemedText style={[styles.personName, { color: theme.primary }]}>
              {request.driverName}
            </ThemedText>
            {request.driverRating ? (
              <View style={[styles.ratingBadge, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Icon name="star" size={12} color={theme.warning} />
                <ThemedText style={styles.ratingText}>
                  {request.driverRating.toFixed(1)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : showClient ? (
          <View style={[styles.personInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {request.clientAvatarUrl ? (
              <Image source={{ uri: request.clientAvatarUrl }} style={styles.personAvatar} />
            ) : (
              <Icon name="user" size={14} color={theme.primary} />
            )}
            <ThemedText style={[styles.personName, { color: theme.primary }]}>
              {request.clientName}
            </ThemedText>
            {request.clientRating > 0 ? (
              <View style={[styles.ratingBadge, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Icon name="star" size={12} color={theme.warning} />
                <ThemedText style={styles.ratingText}>
                  {request.clientRating.toFixed(1)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
          <ThemedText style={[styles.price, { color: theme.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {request.finalPrice || request.proposedPrice}
          </ThemedText>
          <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: "600", paddingBottom: 1 }}>
            {t("mad")}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  header: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  routeContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  addressRow: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 1,
    height: 12,
    marginLeft: 3.5,
  },
  address: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  details: {
    gap: Spacing.lg,
    flexWrap: "wrap",
  },
  detailItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 12,
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  personInfo: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  personAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  personName: {
    fontSize: 13,
    fontWeight: "500",
  },
  ratingBadge: {
    alignItems: "center",
    gap: 2,
    marginLeft: Spacing.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
});
