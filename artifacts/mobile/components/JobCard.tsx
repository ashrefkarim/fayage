import React from "react";
import { View, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { calculateDriverEarning } from "@/utils/commission";

interface JobCardProps {
  request: TransportRequest;
  onAccept: () => void;
  onNegotiate: () => void;
  hasOffered?: boolean;
  offeredPrice?: number;
}

function timeAgo(dateStr: string | Date): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `Il y a ${diff}s`;
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export function JobCard({ request, onAccept, onNegotiate, hasOffered = false, offeredPrice }: JobCardProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const weight = request.estimatedWeight || 0;
  const { earning: driverNet } = calculateDriverEarning(request.proposedPrice || 0, weight);
  const driverNetOffered = offeredPrice ? calculateDriverEarning(offeredPrice, weight).earning : undefined;

  const handleAccept = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  const createdAt = (request as any).createdAt ?? (request as any).created_at;

  return (
    <View style={[styles.card, Shadows.lg, { backgroundColor: theme.backgroundDefault }]}>

      {/* Title row: description + "details" hint */}
      <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {request.goodsDescription || "—"}
        </ThemedText>
        <View style={[styles.detailsHint, { backgroundColor: theme.primary + "12" }]}>
          <Icon name="chevron-right" size={14} color={theme.primary} />
        </View>
      </View>

      {/* Route: pickup → delivery */}
      <View style={styles.route}>
        <View style={[styles.routeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
          <View style={[styles.routeConnectorWrap]}>
            <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
          </View>
          <ThemedText style={styles.routeAddr} numberOfLines={1}>
            {request.pickupAddress}
          </ThemedText>
        </View>

        <View style={[styles.routeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
          <View style={styles.routeConnectorWrap} />
          <ThemedText style={styles.routeAddr} numberOfLines={1}>
            {request.deliveryAddress}
          </ThemedText>
        </View>
      </View>

      {/* Footer: date + price */}
      <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row", borderTopColor: theme.border }]}>
        <View style={[styles.footerLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="clock" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.dateText, { color: theme.textSecondary }]}>
            {createdAt ? timeAgo(createdAt) : "—"}
          </ThemedText>
        </View>
        <View style={[styles.priceWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <ThemedText style={[styles.priceAmount, { color: theme.primary }]}>
            {driverNet}
          </ThemedText>
          <ThemedText style={[styles.priceCur, { color: theme.primary }]}>MAD</ThemedText>
        </View>
      </View>

      {/* Actions */}
      {hasOffered ? (
        <View style={[styles.waiting, { backgroundColor: theme.warning + "14", borderColor: theme.warning + "30" }]}>
          <Icon name="clock" size={16} color={theme.warning} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.waitTitle, { color: theme.warning }]}>
              {t("waitingForApproval")}
            </ThemedText>
            {driverNetOffered !== undefined ? (
              <ThemedText style={[styles.waitSub, { color: theme.textSecondary }]}>
                {t("yourOffer")}: {driverNetOffered} MAD
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.negotiateBtn, { borderColor: theme.primary + "60" }]}>
            <ThemedText
              style={[styles.negotiateBtnText, { color: theme.primary }]}
              onPress={onNegotiate}
            >
              {t("negotiate")}
            </ThemedText>
          </View>
          <Button onPress={handleAccept} style={styles.acceptBtn}>
            {t("accept")}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 14,
  },

  /* Title */
  titleRow: {
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  detailsHint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  /* Route */
  route: {
    gap: 0,
  },
  routeRow: {
    alignItems: "center",
    gap: 10,
    minHeight: 28,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  routeConnectorWrap: {
    position: "absolute",
    left: 4,
    top: 16,
    width: 2,
    height: 18,
    alignItems: "center",
  },
  routeLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
  },
  routeAddr: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  /* Footer */
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLeft: {
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  priceWrap: {
    alignItems: "flex-end",
    gap: 3,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: "800",
  },
  priceCur: {
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 3,
  },

  /* Actions */
  actions: {
    gap: Spacing.sm,
  },
  negotiateBtn: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  negotiateBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 1,
    height: 46,
  },

  /* Waiting */
  waiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  waitTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  waitSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
