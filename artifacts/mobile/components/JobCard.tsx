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
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `Il y a ${diff}s`;
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

function formatScheduledDate(dateStr: string, language: string, atWord: string): string {
  const locale = language === "ar" ? "ar-MA" : "fr-FR";
  const d = new Date(dateStr);
  const day = d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${day} ${atWord} ${time}`;
}

export function JobCard({
  request,
  onAccept,
  onNegotiate,
  hasOffered = false,
  offeredPrice,
}: JobCardProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const weight = request.estimatedWeight || 0;
  const { earning: driverNet } = calculateDriverEarning(request.proposedPrice || 0, weight);
  const driverNetOffered = offeredPrice
    ? calculateDriverEarning(offeredPrice, weight).earning
    : undefined;

  const createdAt = (request as any).createdAt ?? (request as any).created_at;

  const handleAccept = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  return (
    <View style={[styles.card, Shadows.md, { backgroundColor: theme.backgroundDefault }]}>

      {/* ── Description title ── */}
      <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.goodsIconWrap, { backgroundColor: theme.primary + "14" }]}>
          <Icon name="package" size={15} color={theme.primary} />
        </View>
        <ThemedText style={[styles.title, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
          {request.goodsDescription || "—"}
        </ThemedText>
        <View style={[styles.tapHint, { backgroundColor: theme.primary + "10" }]}>
          <Icon name="info" size={13} color={theme.primary} />
        </View>
      </View>

      {/* ── Route ── */}
      <View style={[styles.route, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Track: dots + line */}
        <View style={styles.track}>
          <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
          <View style={[styles.trackLine, { backgroundColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
        </View>

        {/* Addresses */}
        <View style={[styles.addresses, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <View style={styles.addrBlock}>
            <ThemedText style={[styles.addrLabel, { color: "#10B981" }]}>
              RAMASSAGE
            </ThemedText>
            <ThemedText
              style={[styles.addrText, { textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={1}
            >
              {request.pickupAddress}
            </ThemedText>
          </View>

          <View style={styles.addrSpacer} />

          <View style={styles.addrBlock}>
            <ThemedText style={[styles.addrLabel, { color: "#EF4444" }]}>
              LIVRAISON
            </ThemedText>
            <ThemedText
              style={[styles.addrText, { textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={1}
            >
              {request.deliveryAddress}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* ── Scheduled date banner (only for programmed deliveries) ── */}
      {request.scheduledFor ? (
        <View style={styles.scheduledBanner}>
          <Icon name="calendar" size={13} color="#92400E" />
          <ThemedText style={styles.scheduledLabel}>{t("scheduledDelivery").toUpperCase()}</ThemedText>
          <ThemedText style={styles.scheduledDate}>
            {formatScheduledDate(request.scheduledFor, language, t("scheduledDeliveryAt"))}
          </ThemedText>
        </View>
      ) : null}

      {/* ── Footer: date + price ── */}
      <View
        style={[
          styles.footer,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            borderTopColor: theme.border,
          },
        ]}
      >
        <View style={[styles.datePill, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon name="clock" size={11} color={theme.textSecondary} />
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

      {/* ── Actions ── */}
      {hasOffered ? (
        <View
          style={[
            styles.waiting,
            { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
          ]}
        >
          <Icon name="clock" size={15} color="#D97706" />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.waitTitle}>{t("waitingForApproval")}</ThemedText>
            {driverNetOffered !== undefined ? (
              <ThemedText style={styles.waitSub}>
                {t("yourOffer")}: {driverNetOffered} MAD
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View
            style={[styles.negotiateBtn, { borderColor: theme.primary }]}
          >
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
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },

  /* Title */
  titleRow: {
    alignItems: "flex-start",
    gap: 10,
  },
  goodsIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  tapHint: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },

  /* Route */
  route: {
    gap: 12,
    alignItems: "stretch",
  },
  track: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    width: 14,
    flexShrink: 0,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trackLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 4,
    minHeight: 18,
  },
  addresses: {
    flex: 1,
    gap: 0,
  },
  addrBlock: {
    gap: 2,
    paddingVertical: 6,
  },
  addrSpacer: {
    height: 10,
  },
  addrLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  addrText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Scheduled date banner */
  scheduledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexWrap: "wrap",
  },
  scheduledLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scheduledDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350F",
    flex: 1,
  },

  /* Footer */
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 28,
  },
  priceCur: {
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 2,
    opacity: 0.8,
  },

  /* Actions */
  actions: {
    gap: Spacing.sm,
  },
  negotiateBtn: {
    flex: 1,
    height: 48,
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
    height: 48,
  },

  /* Waiting */
  waiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  waitTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  waitSub: {
    fontSize: 12,
    marginTop: 2,
    color: "#B45309",
  },
});
