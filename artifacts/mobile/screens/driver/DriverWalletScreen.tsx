import React, { useState, useCallback } from "react";
import * as Clipboard from "expo-clipboard";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type WithdrawalRequest = {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  receiverPhone: string;
  paymentMethod: string;
  status: "pending" | "sent" | "confirmed" | "rejected";
  paymentCode: string | null;
  adminNote: string | null;
  createdAt: string;
  sentAt: string | null;
  confirmedAt: string | null;
};

type DriverWallet = {
  driverId: string;
  balance: number;
  totalEarnings: number;
  totalCommission: number;
};

const METHOD_LABELS: Record<string, string> = {
  wafacash: "WafaCash",
  cashplus: "CashPlus",
  barid: "Barid Bank",
};

const STATUS_CONFIG: Record<string, { color: string; icon: string; labelKey: string }> = {
  pending: { color: "#F59E0B", icon: "clock", labelKey: "pending" },
  sent: { color: "#3B82F6", icon: "send", labelKey: "withdrawalSent" },
  confirmed: { color: "#10B981", icon: "check-circle", labelKey: "withdrawalConfirmed" },
  rejected: { color: "#EF4444", icon: "x-circle", labelKey: "rejected" },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const cfg = STATUS_CONFIG[status] || { color: "#64748B", icon: "circle", labelKey: status };
  const label = STATUS_CONFIG[status] ? t(cfg.labelKey) : status;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.color + "22" }]}>
      <Icon name={cfg.icon as any} size={12} color={cfg.color} />
      <ThemedText style={[styles.statusLabel, { color: cfg.color }]}>{label}</ThemedText>
    </View>
  );
}

function CopyableCodeBox({ code, note }: { code: string; note?: string | null }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity
      style={[styles.codeBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE", borderWidth: 1 }]}
      onPress={handleCopy}
      activeOpacity={0.75}
    >
      <View style={[styles.codeGiftIcon, { backgroundColor: "#DBEAFE" }]}>
        <Icon name="gift" size={20} color="#2563EB" />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.codeLabel, { color: "#1E40AF" }]}>
          {t("paymentCodeReceived")}
        </ThemedText>
        <ThemedText style={[styles.codeValue, { color: "#1E3A8A" }]}>
          {code}
        </ThemedText>
        {note && (
          <ThemedText style={[styles.codeNote, { color: "#3B82F6" }]}>
            {note}
          </ThemedText>
        )}
      </View>
      <View style={[styles.copyBtn, { backgroundColor: copied ? "#10B981" : "#2563EB" }]}>
        <Icon name={copied ? "check" : "copy"} size={15} color="#FFFFFF" />
        <ThemedText style={styles.copyBtnText}>{copied ? t("copied") : t("copy")}</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

export default function DriverWalletScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const headerPadding = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();

  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [driverName, setDriverName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wafacash" | "cashplus">("wafacash");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [walletRes, reqRes] = await Promise.all([
        fetch(new URL(`api/driver-wallet/${user.id}`, getApiUrl()).toString()),
        fetch(new URL(`api/withdrawal-requests/driver/${user.id}`, getApiUrl()).toString()),
      ]);
      const [walletData, reqData] = await Promise.all([walletRes.json(), reqRes.json()]);
      if (walletData.wallet) setWallet(walletData.wallet);
      if (reqData.success) setRequests(reqData.requests);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const balance = wallet?.balance ?? 0;
  const totalEarnings = wallet?.totalEarnings ?? 0;
  const hasPending = requests.some((r) => r.status === "pending" || r.status === "sent");

  const handleRequestWithdrawal = async () => {
    if (!user?.id) return;
    const nameToUse = driverName.trim() || user?.name || t("driver");
    setSubmitting(true);
    try {
      const phone = user.phone?.replace(/^0/, "+212").replace(/\s/g, "") || "";
      const res = await fetch(new URL("api/withdrawal-requests", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: user.id,
          driverName: nameToUse,
          driverPhone: phone,
          receiverPhone: phone,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setDriverName("");
        setReceiverPhone("");
        setPaymentMethod("wafacash");
        fetchData();
        Alert.alert(t("withdrawalRequestSent"), `${t("withdrawalAmount")}: ${balance.toFixed(2)} MAD`);
      } else {
        Alert.alert(t("error"), data.error || t("error"));
      }
    } catch {
      Alert.alert(t("error"), t("withdrawalSubmitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = (id: string) => {
    Alert.alert(
      t("confirmReception"),
      t("confirmDeliveryDesc"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("verify"),
          style: "default",
          onPress: async () => {
            setConfirmingId(id);
            try {
              const res = await fetch(
                new URL(`api/withdrawal-requests/${id}/confirm`, getApiUrl()).toString(),
                { method: "PUT" }
              );
              const data = await res.json();
              if (data.success) {
                fetchData();
                Alert.alert(t("withdrawalConfirmed"), t("profileUpdated"));
              } else {
                Alert.alert(t("error"), data.error || t("error"));
              }
            } catch {
              Alert.alert(t("error"), t("withdrawalSubmitError"));
            } finally {
              setConfirmingId(null);
            }
          },
        },
      ]
    );
  };

  const renderWithdrawalItem = ({ item }: { item: WithdrawalRequest }) => {
    const date = new Date(item.createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const isSent = item.status === "sent";

    return (
      <Card style={styles.withdrawalCard}>
        <View style={styles.withdrawalRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.withdrawalTopRow}>
              <ThemedText style={[styles.withdrawalAmount, { color: theme.text }]}>
                {item.amount.toFixed(2)} MAD
              </ThemedText>
              <StatusBadge status={item.status} />
            </View>
            <ThemedText style={[styles.withdrawalMeta, { color: theme.textSecondary }]}>
              {METHOD_LABELS[item.paymentMethod] || item.paymentMethod}
            </ThemedText>
            <ThemedText style={[styles.withdrawalDate, { color: theme.textSecondary }]}>
              {date}
            </ThemedText>
          </View>
        </View>

        {isSent && item.paymentCode && (
          <CopyableCodeBox code={item.paymentCode} note={item.adminNote} />
        )}

        {isSent && (
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: "#10B981" }]}
            onPress={() => handleConfirm(item.id)}
            disabled={confirmingId === item.id}
          >
            {confirmingId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={18} color="#fff" />
                <ThemedText style={styles.confirmBtnText}>{t("confirmReception")}</ThemedText>
              </>
            )}
          </TouchableOpacity>
        )}

        {item.status === "rejected" && item.adminNote && (
          <View style={[styles.rejectNote, { backgroundColor: "#FEE2E2" }]}>
            <Icon name="alert-circle" size={14} color="#EF4444" />
            <ThemedText style={styles.rejectNoteText}>{item.adminNote}</ThemedText>
          </View>
        )}
      </Card>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Balance card — always vivid regardless of theme */}
      <LinearGradient
        colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.balanceCard, { marginTop: headerPadding }]}
      >
        {/* Decorative circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        {/* Driver name header */}
        <View style={styles.driverNameRow}>
          <View style={styles.balanceIconWrap}>
            <Icon name="user" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.driverGreeting}>{t("myWallet")}</ThemedText>
            <ThemedText style={styles.driverName} numberOfLines={1}>
              {user?.name || t("driver")}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.balanceLabel}>{t("availableBalance")}</ThemedText>

        <View style={styles.balanceAmountRow}>
          <ThemedText style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {balance.toFixed(2)}
          </ThemedText>
          <ThemedText style={styles.balanceCurrency}>MAD</ThemedText>
        </View>

        {/* CTA button */}
        {balance > 0 && !hasPending && (
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.9}
          >
            <Icon name="arrow-up-circle" size={20} color="#1E3A8A" />
            <ThemedText style={styles.withdrawBtnText}>{t("requestWithdrawal")}</ThemedText>
          </TouchableOpacity>
        )}

        {hasPending && (
          <View style={styles.statusPill}>
            <View style={styles.statusPillDot} />
            <ThemedText style={styles.statusPillText}>{t("withdrawalProcessing")}</ThemedText>
          </View>
        )}

        {balance <= 0 && (
          <View style={styles.statusPill}>
            <Icon name="info" size={12} color="rgba(255,255,255,0.7)" />
            <ThemedText style={styles.statusPillText}>{t("completeDeliveriesForBalance")}</ThemedText>
          </View>
        )}
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={[styles.statIconWrap, { backgroundColor: "#DCFCE7" }]}>
            <Icon name="trending-up" size={18} color="#16A34A" />
          </View>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {totalEarnings.toFixed(0)}
          </ThemedText>
          <ThemedText style={[styles.statUnit, { color: "#16A34A" }]}>MAD</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t("totalEarned")}</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={[styles.statIconWrap, { backgroundColor: "#DBEAFE" }]}>
            <Icon name="check-circle" size={18} color="#2563EB" />
          </View>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {requests.filter((r) => r.status === "confirmed").length}
          </ThemedText>
          <ThemedText style={[styles.statUnit, { color: "#2563EB" }]}>{t("withdrawalSuccessful")}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t("withdrawalHistory")}</ThemedText>
        </View>
      </View>

      {requests.length > 0 && (
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t("withdrawalHistory")}
        </ThemedText>
      )}
    </View>
  );

  const ListEmpty = () =>
    !loading ? (
      <View style={styles.emptyContainer}>
        <Icon name="inbox" size={48} color={theme.textSecondary} />
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t("noWithdrawals")}
        </ThemedText>
      </View>
    ) : null;

  const methodIcons: Record<string, string> = { wafacash: "smartphone", cashplus: "credit-card" };
  const methodDesc: Record<string, string> = {
    wafacash: t("wafacashDesc"),
    cashplus: t("cashplusDesc"),
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderWithdrawalItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.lg },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        />
      )}

      {/* Custom bottom sheet — works on both web and native */}
      {showModal && (
        <View style={styles.overlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowModal(false)}
            activeOpacity={1}
          />

          {/* Sheet */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetWrapper}
          >
            <View style={[styles.sheet, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
              {/* Header row with handle + close button */}
              <View style={styles.sheetHeader}>
                <View style={styles.modalHandle} />
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setShowModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="x" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScroll}
              >
                {/* Amount banner */}
                <LinearGradient
                  colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalAmountBanner}
                >
                  <View style={{ flex: 1, overflow: "visible" }}>
                    <ThemedText style={styles.modalAmountLabel}>{t("withdrawalAmount")}</ThemedText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <ThemedText style={styles.modalAmountValue} numberOfLines={1}>
                        {balance.toFixed(2)}
                      </ThemedText>
                      <ThemedText style={styles.modalAmountCurrency}>MAD</ThemedText>
                    </View>
                  </View>
                  <View style={[styles.modalAmountIcon, { marginLeft: 12 }]}>
                    <Icon name="arrow-up-circle" size={30} color="rgba(255,255,255,0.95)" />
                  </View>
                </LinearGradient>

                {/* Driver full name input */}
                <ThemedText style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>
                  {t("beneficiaryName")}
                </ThemedText>
                <View style={[styles.nameInputRow, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}>
                  <View style={[styles.nameDisplayIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Icon name="user" size={18} color="#2563EB" />
                  </View>
                  <TextInput
                    value={driverName}
                    onChangeText={setDriverName}
                    placeholder={user?.name || t("yourFullName")}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.nameInput, { color: theme.text }]}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>

                {/* Payment method */}
                <ThemedText style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>
                  {t("paymentMethod")}
                </ThemedText>

                {(["wafacash", "cashplus"] as const).map((m) => {
                  const isSelected = paymentMethod === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.methodCard,
                        {
                          borderColor: isSelected ? "#2563EB" : theme.border,
                          backgroundColor: isSelected ? "#EFF6FF" : theme.backgroundRoot,
                        },
                      ]}
                      onPress={() => setPaymentMethod(m)}
                      activeOpacity={0.75}
                    >
                      <View style={[
                        styles.methodCardIcon,
                        { backgroundColor: isSelected ? "#DBEAFE" : theme.border + "80" },
                      ]}>
                        <Icon name={methodIcons[m] as any} size={20} color={isSelected ? "#2563EB" : theme.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.methodCardName, { color: isSelected ? "#1E40AF" : theme.text }]}>
                          {METHOD_LABELS[m]}
                        </ThemedText>
                        <ThemedText style={[styles.methodCardDesc, { color: theme.textSecondary }]}>
                          {methodDesc[m]}
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.methodRadio,
                        {
                          borderColor: isSelected ? "#2563EB" : theme.border,
                          backgroundColor: isSelected ? "#2563EB" : "transparent",
                        },
                      ]}>
                        {isSelected && <View style={styles.methodRadioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <ThemedText style={[styles.phoneHint, { color: theme.textSecondary, marginTop: 12 }]}>
                  {t("paymentAccountNote")} ({METHOD_LABELS[paymentMethod]})
                </ThemedText>

                <TouchableOpacity
                  style={[styles.submitBtn, { opacity: submitting ? 0.5 : 1 }]}
                  onPress={handleRequestWithdrawal}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={["#1E3A8A", "#2563EB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="send" size={18} color="#fff" />
                        <ThemedText style={styles.submitBtnText}>{t("sendRequest")}</ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: insets.bottom + 16 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.md },
  balanceCard: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.md,
    overflow: "hidden",
    minHeight: 230,
    justifyContent: "center",
  },
  bgCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -40,
  },
  bgCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -20,
    left: -20,
  },
  driverNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  driverGreeting: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  driverName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 1,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    fontWeight: "600",
  },
  balanceAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 20,
  },
  balanceValue: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 56,
    letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    paddingBottom: 6,
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawBtnText: { fontWeight: "800", fontSize: 15, color: "#1E3A8A" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 50,
  },
  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FDE047",
  },
  statusPillText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "500" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  statUnit: { fontSize: 12, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: Spacing.sm },
  withdrawalCard: { marginBottom: Spacing.md, padding: Spacing.md },
  withdrawalRow: { flexDirection: "row" },
  withdrawalTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  withdrawalAmount: { fontSize: 17, fontWeight: "700" },
  withdrawalMeta: { fontSize: 13, marginBottom: 2 },
  withdrawalDate: { fontSize: 11 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusLabel: { fontSize: 11, fontWeight: "600" },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderRadius: 14,
    marginTop: Spacing.md,
  },
  codeGiftIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 50,
    flexShrink: 0,
  },
  copyBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  codeLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  codeValue: { fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  codeNote: { fontSize: 12, marginTop: 2 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rejectNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  rejectNoteText: { color: "#EF4444", fontSize: 12, flex: 1 },
  emptyContainer: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    zIndex: 999,
  },
  sheetWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
  },
  sheetCloseBtn: {
    position: "absolute",
    right: 0,
    top: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScroll: {
    paddingBottom: 8,
  },
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nameDisplayIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
    outlineStyle: "none",
  } as any,
  modalAmountBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    marginBottom: 4,
    overflow: "visible",
  },
  modalAmountLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  modalAmountValue: { fontSize: 34, fontWeight: "800", color: "#FFFFFF", lineHeight: 42 },
  modalAmountCurrency: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  modalAmountIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: { fontSize: 13, fontWeight: "700", marginBottom: 10, letterSpacing: 0.2 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 10,
  },
  methodCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodCardName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  methodCardDesc: { fontSize: 12 },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  methodRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: 8,
  },
  phoneFlag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    gap: 2,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontWeight: "600",
  },
  phoneHint: { fontSize: 12, marginBottom: Spacing.lg, lineHeight: 18 },
  submitBtn: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
