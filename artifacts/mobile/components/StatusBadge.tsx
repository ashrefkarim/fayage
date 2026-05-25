import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

type Status = "pending" | "awaiting_client_approval" | "waiting_for_payment" | "paid" | "accepted" | "driver_arrived" | "pickup" | "in_transit" | "delivered" | "cancelled" | "pending_verification" | "verified" | "rejected";

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return { color: theme.warning, label: t("pending") };
      case "awaiting_client_approval":
        return { color: theme.secondary, label: t("awaitingApproval") };
      case "accepted":
        return { color: theme.primary, label: t("accepted") };
      case "driver_arrived":
        return { color: theme.success, label: t("driverArrived") };
      case "pickup":
        return { color: theme.secondary, label: t("goodsPickedUp") };
      case "in_transit":
        return { color: theme.warning, label: t("inTransit") };
      case "delivered":
        return { color: theme.success, label: t("delivered") };
      case "cancelled":
        return { color: theme.error, label: t("cancelled") };
      default:
        return { color: theme.textSecondary, label: status };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "20" }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <ThemedText
        style={[styles.text, { color: config.color }]}
      >
        {config.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
