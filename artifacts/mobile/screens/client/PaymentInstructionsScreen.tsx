import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Clipboard,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { getApiUrl } from "@/lib/query-client";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteParams = RouteProp<RootStackParamList, "PaymentInstructions">;

interface PaymentData {
  id: string;
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
}

const METHOD_CONFIG = {
  wafacash: {
    label: "Wafacash",
    icon: "dollar-sign" as const,
    gradient: ["#D97706", "#F59E0B"] as [string, string],
    glow: "#F59E0B30",
    accent: "#D97706",
  },
  cashplus: {
    label: "Cash Plus",
    icon: "credit-card" as const,
    gradient: ["#1D4ED8", "#3B82F6"] as [string, string],
    glow: "#3B82F630",
    accent: "#2563EB",
  },
};

export default function PaymentInstructionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { theme, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { orderId } = route.params;

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [txRef, setTxRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<"wafacash" | "cashplus">("wafacash");
  const [ribWafacash, setRibWafacash] = useState("");
  const [ribCashplus, setRibCashplus] = useState("");
  const [copiedRib, setCopiedRib] = useState(false);
  const [txFocused, setTxFocused] = useState(false);

  const fetchPayment = useCallback(async () => {
    try {
      const url = new URL(`/api/payments/order/${orderId}`, getApiUrl());
      const ribUrl = new URL(`/api/settings/ribs`, getApiUrl());
      const [res, ribRes] = await Promise.all([fetch(url.toString()), fetch(ribUrl.toString())]);
      const data = await res.json();
      const ribData = await ribRes.json();
      if (data.success && data.payment) setPayment(data.payment);
      if (ribData.success) {
        setRibWafacash(ribData.ribWafacash || "");
        setRibCashplus(ribData.ribCashplus || "");
      }
    } catch (e) {
      console.error("Error fetching payment:", e);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useFocusEffect(useCallback(() => { fetchPayment(); }, [fetchPayment]));

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedRib(true);
    setTimeout(() => setCopiedRib(false), 2000);
  };

  const pickProofImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setProofImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takeProofPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("", "Camera permission required"); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      setProofImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const uploadPhoto = async (base64: string): Promise<string> => {
    const url = new URL("/api/upload-photo", getApiUrl());
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleSubmitProof = async () => {
    if (!proofImage) { Alert.alert("", t("proofImage")); return; }
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadPhoto(proofImage);
      const url = new URL(`/api/payments/order/${orderId}/upload-proof`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofImageUrl: imageUrl, transactionRef: txRef || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✓", t("proofSubmitted"), [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert("Erreur", data.error || "Failed to submit");
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = payment?.amount || 0;
  const receiverPhone = payment?.receiverPhone || "";
  const receiverName = payment?.receiverName || "FAYAGE";
  const paymentStatus = payment?.status as string | undefined;
  const isAlreadySubmitted = paymentStatus === "pending_review" || paymentStatus === "accepted";
  const method = METHOD_CONFIG[selectedMethod];
  const currentRib = selectedMethod === "wafacash" ? ribWafacash : ribCashplus;

  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>

      {/* Compact nav header */}
      <View style={[styles.navBar, { borderBottomColor: cardBorder }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.navTitle}>{t("paymentInstructions")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            {/* Status banners */}
            {paymentStatus === "rejected" && (
              <View style={[styles.statusBanner, { backgroundColor: "#FEF2F2", borderLeftColor: "#EF4444" }]}>
                <View style={[styles.statusIconWrap, { backgroundColor: "#FEE2E2" }]}>
                  <Icon name="x-circle" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.statusBannerTitle, { color: "#DC2626" }]}>{t("paymentRejected")}</ThemedText>
                  <ThemedText style={[styles.statusBannerDesc, { color: "#EF4444" }]}>{t("paymentRejectedDesc")}</ThemedText>
                </View>
              </View>
            )}

            {isAlreadySubmitted && (
              <View style={[styles.statusBanner, { backgroundColor: "#F0FDF4", borderLeftColor: "#22C55E" }]}>
                <View style={[styles.statusIconWrap, { backgroundColor: "#DCFCE7" }]}>
                  <Icon name="clock" size={18} color="#16A34A" />
                </View>
                <ThemedText style={[styles.statusBannerTitle, { color: "#15803D", flex: 1 }]}>{t("paymentPending")}</ThemedText>
              </View>
            )}

            {/* ── AMOUNT HERO CARD ── */}
            <LinearGradient
              colors={["#0F172A", "#1E3A8A", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.amountHero}
            >
              {/* Decorative circles */}
              <View style={styles.heroBubble1} />
              <View style={styles.heroBubble2} />

              <ThemedText style={styles.amountLabel}>
                {isRTL ? "المبلغ الواجب دفعه" : "Montant à payer"}
              </ThemedText>

              <View style={styles.amountRow}>
                <ThemedText style={styles.amountValue}>{total.toFixed(2)}</ThemedText>
                <ThemedText style={styles.amountCurrency}>MAD</ThemedText>
              </View>

              {/* Shimmer line */}
              <View style={styles.heroSeparator} />

              <ThemedText style={styles.amountHint}>
                {isRTL ? "يرجى إتمام الدفع خلال 24 ساعة" : "Veuillez effectuer le paiement dans les 24h"}
              </ThemedText>
            </LinearGradient>

            {/* ── PAYMENT METHOD ── */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t("paymentMethods")}</ThemedText>
              <View style={styles.methodsRow}>
                {(["wafacash", "cashplus"] as const).map((m) => {
                  const cfg = METHOD_CONFIG[m];
                  const isSelected = selectedMethod === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => { setSelectedMethod(m); Haptics.selectionAsync(); }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.88 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                        flex: 1,
                      })}
                    >
                      <View
                        style={[
                          styles.methodCard,
                          {
                            backgroundColor: isSelected ? "transparent" : cardBg,
                            borderColor: isSelected ? "transparent" : cardBorder,
                            shadowColor: isSelected ? cfg.accent : "#000",
                            shadowOpacity: isSelected ? 0.2 : 0.06,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFill} />
                        ) : null}
                        <View style={[styles.methodIconCircle, { backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : cfg.glow }]}>
                          <Icon name={cfg.icon} size={18} color={isSelected ? "#FFFFFF" : cfg.accent} />
                        </View>
                        <ThemedText style={[styles.methodName, { color: isSelected ? "#FFFFFF" : theme.text }]}>
                          {cfg.label}
                        </ThemedText>
                        {isSelected && (
                          <View style={styles.methodCheckWrap}>
                            <Icon name="check" size={13} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── RIB CARD ── */}
            {currentRib ? (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {isRTL ? "رقم الحساب" : `RIB ${method.label}`}
                </ThemedText>
                <View style={[styles.ribCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  {/* Left accent */}
                  <LinearGradient colors={method.gradient} style={styles.ribAccent} />

                  <View style={styles.ribContent}>
                    <View style={[styles.ribIconCircle, { backgroundColor: method.glow }]}>
                      <Icon name="credit-card" size={16} color={method.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.ribLabel, { color: theme.textSecondary }]}>
                        {method.label} RIB
                      </ThemedText>
                      <ThemedText style={[styles.ribValue, { color: theme.text }]}>
                        {currentRib}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => copyToClipboard(currentRib)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.75 : 1,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      })}
                    >
                      <LinearGradient
                        colors={copiedRib ? ["#059669", "#10B981"] : method.gradient}
                        style={styles.copyBtn}
                      >
                        <Icon name={copiedRib ? "check" : "copy"} size={15} color="#FFFFFF" />
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── BENEFICIARY ── */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t("paymentReceiver")}</ThemedText>
              <View style={[styles.beneficiaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Name row */}
                <View style={[styles.beneficiaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.beneficiaryAvatar}>
                    <Icon name="user" size={16} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                    <ThemedText style={[styles.beneficiaryLabel, { color: theme.textSecondary }]}>{t("paymentReceiver")}</ThemedText>
                    <ThemedText style={[styles.beneficiaryValue, { color: theme.text }]}>{receiverName}</ThemedText>
                  </View>
                </View>

                {receiverPhone ? (
                  <>
                    <View style={[styles.beneficiaryDivider, { backgroundColor: cardBorder }]} />
                    <View style={[styles.beneficiaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <View style={[styles.beneficiaryPhoneIcon, { backgroundColor: "#0891B220" }]}>
                        <Icon name="phone" size={16} color="#0891B2" />
                      </View>
                      <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                        <ThemedText style={[styles.beneficiaryLabel, { color: theme.textSecondary }]}>{t("paymentReceiverPhone")}</ThemedText>
                        <ThemedText style={[styles.beneficiaryValue, { color: theme.text }]}>{receiverPhone}</ThemedText>
                      </View>
                      <Pressable onPress={() => copyToClipboard(receiverPhone)} hitSlop={10}>
                        <Icon name="copy" size={16} color={theme.primary} />
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            {/* ── UPLOAD PROOF ── */}
            {!isAlreadySubmitted && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t("uploadProof")}</ThemedText>

                {proofImage ? (
                  <Pressable
                    onPress={pickProofImage}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                  >
                    <Image source={{ uri: proofImage }} style={[styles.proofPreview, { borderColor: cardBorder }]} resizeMode="cover" />
                    <View style={styles.changePhotoOverlay}>
                      <Icon name="camera" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.changePhotoText}>Changer</ThemedText>
                    </View>
                  </Pressable>
                ) : (
                  <View style={styles.uploadRow}>
                    {[
                      { icon: "camera" as const, label: t("takePhoto"), action: takeProofPhoto },
                      { icon: "image" as const, label: t("choosePhoto"), action: pickProofImage },
                    ].map(({ icon, label, action }) => (
                      <Pressable
                        key={icon}
                        onPress={action}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                          flex: 1,
                        })}
                      >
                        <View style={[styles.uploadCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                          <View style={[styles.uploadIconCircle, { backgroundColor: theme.primary + "15" }]}>
                            <Icon name={icon} size={22} color={theme.primary} />
                          </View>
                          <ThemedText style={[styles.uploadLabel, { color: theme.text }]}>{label}</ThemedText>
                          <ThemedText style={[styles.uploadHint, { color: theme.textSecondary }]}>
                            {icon === "camera" ? "JPG, PNG" : "Galerie"}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Transaction ref input */}
                <View style={styles.inputWrap}>
                  <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {t("transactionRef")} <ThemedText style={[styles.inputOptional, { color: theme.textSecondary }]}>(optionnel)</ThemedText>
                  </ThemedText>
                  <View
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: cardBg,
                        borderColor: txFocused ? theme.primary : cardBorder,
                        shadowColor: txFocused ? theme.primary : "transparent",
                        shadowOpacity: txFocused ? 0.2 : 0,
                      },
                    ]}
                  >
                    <Icon name="hash" size={16} color={txFocused ? theme.primary : theme.textSecondary} />
                    <TextInput
                      style={[styles.inputField, { color: theme.text }]}
                      placeholder={t("enterTransactionRef")}
                      placeholderTextColor={theme.textSecondary}
                      value={txRef}
                      onChangeText={setTxRef}
                      onFocus={() => setTxFocused(true)}
                      onBlur={() => setTxFocused(false)}
                    />
                  </View>
                </View>

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmitProof}
                  disabled={isSubmitting || !proofImage}
                  style={({ pressed }) => ({
                    opacity: isSubmitting || !proofImage ? 0.5 : pressed ? 0.88 : 1,
                    transform: [{ scale: pressed && !isSubmitting && proofImage ? 0.98 : 1 }],
                    marginTop: Spacing.md,
                  })}
                >
                  <LinearGradient
                    colors={["#1D4ED8", "#2563EB", "#3B82F6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="upload" size={18} color="#FFFFFF" />
                        <ThemedText style={styles.submitBtnText}>{t("submitProof")}</ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Already submitted — show receipt */}
            {isAlreadySubmitted && payment?.proofImageUrl && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t("proofImage")}</ThemedText>
                <Image
                  source={{ uri: payment.proofImageUrl }}
                  style={[styles.proofPreview, { borderColor: cardBorder }]}
                  resizeMode="cover"
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Nav */
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  scrollContent: { paddingTop: 8 },

  loadingWrap: { marginTop: 80, alignItems: "center" },

  /* Status banners */
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  statusIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBannerTitle: { fontSize: 14, fontWeight: "700" },
  statusBannerDesc: { fontSize: 12, marginTop: 2 },

  /* Section */
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  /* Amount hero */
  amountHero: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroBubble1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(99,102,241,0.15)",
    top: -50,
    right: -40,
  },
  heroBubble2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(59,130,246,0.12)",
    bottom: -30,
    left: -20,
  },
  amountLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  amountValue: {
    color: "#FFFFFF",
    fontSize: 56,
    fontWeight: "800",
    lineHeight: 64,
    letterSpacing: -1.5,
  },
  amountCurrency: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSeparator: {
    width: 48,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  amountHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
  },

  /* Methods */
  methodsRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodCard: {
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    minHeight: 100,
    justifyContent: "center",
  },
  methodIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  methodName: {
    fontSize: 13,
    fontWeight: "700",
  },
  methodCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* RIB card */
  ribCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  ribAccent: { width: 5 },
  ribContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  ribIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ribLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  ribValue: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
  copyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Beneficiary */
  beneficiaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  beneficiaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  beneficiaryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  beneficiaryPhoneIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  beneficiaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  beneficiaryValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  beneficiaryDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  /* Upload */
  uploadRow: {
    flexDirection: "row",
    gap: 12,
  },
  uploadCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  uploadHint: {
    fontSize: 11,
    textAlign: "center",
  },

  /* Proof preview */
  proofPreview: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  changePhotoOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  changePhotoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Input */
  inputWrap: { marginTop: Spacing.md },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputOptional: {
    fontSize: 10,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 0,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  /* Submit */
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
