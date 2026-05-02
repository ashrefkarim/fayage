import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { getApiUrl } from "@/lib/query-client";
import { BorderRadius, Spacing } from "@/constants/theme";

interface PaymentItem {
  id: string;
  orderId: string;
  referenceCode: string;
  method: string;
  receiverPhone: string;
  receiverName: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  driverEarning: number;
  proofImageUrl?: string;
  transactionRef?: string;
  status: string;
  createdAt: string;
  order?: {
    clientName: string;
    driverName: string;
    pickupAddress: string;
    deliveryAddress: string;
    finalPrice: number;
  };
}

const STATUS_COLOR: Record<string, string> = {
  pending_upload: "#9CA3AF",
  pending_review: "#F59E0B",
  accepted: "#22C55E",
  rejected: "#EF4444",
};

const STATUS_LABEL: Record<string, { fr: string; ar: string }> = {
  pending_upload: { fr: "Preuve manquante", ar: "الإيصال مفقود" },
  pending_review: { fr: "En vérification", ar: "قيد المراجعة" },
  accepted: { fr: "Accepté", ar: "مقبول" },
  rejected: { fr: "Refusé", ar: "مرفوض" },
};

type FilterStatus = "all" | "pending_review" | "pending_upload" | "accepted" | "rejected";

export default function AdminPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("pending_review");
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayments = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const url = new URL(`/api/payments${params}`, getApiUrl());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error("Error fetching payments:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { fetchPayments(); }, [fetchPayments]));

  const handleAccept = async (paymentId: string) => {
    Alert.alert(
      t("acceptPayment"),
      t("confirmOrder"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("acceptPayment"),
          style: "default",
          onPress: async () => {
            setActionLoading(true);
            try {
              const url = new URL(`/api/payments/${paymentId}/accept`, getApiUrl());
              const res = await fetch(url.toString(), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: "admin" }),
              });
              const data = await res.json();
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSelectedPayment(null);
                fetchPayments();
              } else {
                Alert.alert(t("error"), data.error);
              }
            } catch (e) {
              Alert.alert(t("error"), t("withdrawalSubmitError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (paymentId: string) => {
    Alert.alert(
      t("rejectPayment"),
      t("confirmCancelOrder"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("rejectPayment"),
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const url = new URL(`/api/payments/${paymentId}/reject`, getApiUrl());
              const res = await fetch(url.toString(), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: "admin" }),
              });
              const data = await res.json();
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setSelectedPayment(null);
                fetchPayments();
              } else {
                Alert.alert(t("error"), data.error);
              }
            } catch (e) {
              Alert.alert(t("error"), t("withdrawalSubmitError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPaymentCard = ({ item }: { item: PaymentItem }) => {
    const statusColor = STATUS_COLOR[item.status] || "#9CA3AF";
    const statusLabel = STATUS_LABEL[item.status]?.[language as "fr" | "ar"] || item.status;
    return (
      <Pressable onPress={() => setSelectedPayment(item)}>
        <Card style={styles.paymentCard}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.refCode}>{item.referenceCode}</ThemedText>
              <ThemedText style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</ThemedText>
            </View>
            <ThemedText style={[styles.amount, { color: theme.primary }]}>
              {item.amount?.toFixed(2)} MAD
            </ThemedText>
          </View>

          {/* Client / Driver */}
          <View style={styles.infoRow}>
            <Icon name="user" size={13} color={theme.textSecondary} />
            <ThemedText style={styles.infoText}>{item.order?.clientName || "-"}</ThemedText>
            <Icon name="truck" size={13} color={theme.textSecondary} style={{ marginLeft: 12 }} />
            <ThemedText style={styles.infoText}>{item.order?.driverName || "-"}</ThemedText>
          </View>

          {/* Commission */}
          <View style={styles.infoRow}>
            <Icon name="percent" size={13} color={theme.textSecondary} />
            <ThemedText style={styles.infoText}>
              {item.commissionRate}% — Gain: {item.driverEarning?.toFixed(2)} MAD
            </ThemedText>
          </View>

          {/* Has proof */}
          {item.proofImageUrl && (
            <View style={[styles.proofBadge, { backgroundColor: "#F0FDF4" }]}>
              <Icon name="image" size={12} color="#16A34A" />
              <ThemedText style={styles.proofBadgeText}>{t("proofImage")}</ThemedText>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: "pending_review", label: "En vérification" },
    { key: "pending_upload", label: "Preuve manquante" },
    { key: "accepted", label: t("acceptPayment") + "és" },
    { key: "rejected", label: "Refusés" },
    { key: "all", label: t("allPayments") },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterScroll, { paddingTop: headerHeight }]}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? theme.primary : theme.card,
                borderColor: filter === f.key ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <ThemedText style={[styles.filterLabel, filter === f.key && { color: "#fff" }]}>
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentCard}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchPayments(true)}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="credit-card"
              title={t("noPayments")}
              subtitle={t("noPaymentsDesc")}
            />
          }
        />
      )}

      {/* Payment detail modal */}
      <Modal
        visible={!!selectedPayment}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{selectedPayment?.referenceCode}</ThemedText>
              <Pressable onPress={() => setSelectedPayment(null)}>
                <Icon name="x" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPayment && (
                <>
                  {/* Summary */}
                  <View style={styles.modalRow}>
                    <ThemedText style={styles.modalLabel}>Client</ThemedText>
                    <ThemedText style={styles.modalValue}>{selectedPayment.order?.clientName}</ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={styles.modalLabel}>{t("driver")}</ThemedText>
                    <ThemedText style={styles.modalValue}>{selectedPayment.order?.driverName}</ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={styles.modalLabel}>{t("paymentAmount")}</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.primary, fontFamily: "Poppins_700Bold" }]}>
                      {selectedPayment.amount?.toFixed(2)} MAD
                    </ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={styles.modalLabel}>{t("commissionRate")}</ThemedText>
                    <ThemedText style={styles.modalValue}>
                      {selectedPayment.commissionRate}% ({selectedPayment.commissionAmount?.toFixed(2)} MAD)
                    </ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={styles.modalLabel}>{t("driverEarning")}</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: "#22C55E" }]}>
                      {selectedPayment.driverEarning?.toFixed(2)} MAD
                    </ThemedText>
                  </View>
                  {selectedPayment.transactionRef && (
                    <View style={styles.modalRow}>
                      <ThemedText style={styles.modalLabel}>{t("transactionRef")}</ThemedText>
                      <ThemedText style={styles.modalValue}>{selectedPayment.transactionRef}</ThemedText>
                    </View>
                  )}

                  {/* Proof image */}
                  {selectedPayment.proofImageUrl ? (
                    <>
                      <ThemedText style={styles.proofTitle}>{t("proofImage")}</ThemedText>
                      <Image
                        source={{ uri: selectedPayment.proofImageUrl }}
                        style={styles.proofImage}
                        resizeMode="contain"
                      />
                    </>
                  ) : (
                    <View style={[styles.noProof, { backgroundColor: theme.card }]}>
                      <Icon name="image" size={24} color={theme.textSecondary} />
                      <ThemedText style={{ color: theme.textSecondary, marginTop: 6 }}>
                        Aucune preuve soumise
                      </ThemedText>
                    </View>
                  )}

                  {/* Action buttons */}
                  {selectedPayment.status === "pending_review" && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                        onPress={() => handleReject(selectedPayment.id)}
                        disabled={actionLoading}
                      >
                        <Icon name="x" size={18} color="#fff" />
                        <ThemedText style={styles.actionBtnText}>{t("rejectPayment")}</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#22C55E" }]}
                        onPress={() => handleAccept(selectedPayment.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Icon name="check" size={18} color="#fff" />
                            <ThemedText style={styles.actionBtnText}>{t("acceptPayment")}</ThemedText>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {selectedPayment.status === "accepted" && (
                    <View style={[styles.statusBanner, { backgroundColor: "#F0FDF4" }]}>
                      <Icon name="check-circle" size={20} color="#22C55E" />
                      <ThemedText style={[styles.statusBannerText, { color: "#16A34A" }]}>
                        {t("paymentAccepted")}
                      </ThemedText>
                    </View>
                  )}

                  {selectedPayment.status === "rejected" && (
                    <View style={[styles.statusBanner, { backgroundColor: "#FEF2F2" }]}>
                      <Icon name="x-circle" size={20} color="#EF4444" />
                      <ThemedText style={[styles.statusBannerText, { color: "#EF4444" }]}>
                        {t("paymentRejected")}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  paymentCard: {
    marginBottom: 10,
    padding: Spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  refCode: { fontSize: 15, fontFamily: "Poppins_700Bold" },
  statusLabel: { fontSize: 11, fontFamily: "Poppins_500Medium", marginTop: 1 },
  amount: { fontSize: 16, fontFamily: "Poppins_700Bold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  infoText: { fontSize: 12, color: "#6B7280" },
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  proofBadgeText: { fontSize: 11, color: "#16A34A" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold" },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalLabel: { fontSize: 13, color: "#6B7280" },
  modalValue: { fontSize: 14, fontFamily: "Poppins_500Medium" },
  proofTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  proofImage: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.md,
    backgroundColor: "#F3F4F6",
  },
  noProof: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusBannerText: { fontSize: 14, fontFamily: "Poppins_600SemiBold" },
});
