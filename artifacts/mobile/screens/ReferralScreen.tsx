import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  rewardBalance: number;
}

interface Referral {
  id: string;
  referredId: string;
  referredType: string;
  status: string;
  referrerReward: number;
  createdAt: string;
}

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const { theme } = useTheme();
  const { gradients } = useDynamicTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [codeCopied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchReferralData();
    }
  }, [user?.id]);

  const fetchReferralData = async () => {
    if (!user?.id) return;
    const userType = user.role === "driver" ? "driver" : "client";
    
    try {
      const [codeRes, statsRes, historyRes] = await Promise.all([
        fetch(new URL(`/api/referrals/${user.id}/${userType}/code`, getApiUrl()).toString()),
        fetch(new URL(`/api/referrals/${user.id}/${userType}/stats`, getApiUrl()).toString()),
        fetch(new URL(`/api/referrals/${user.id}/${userType}/history`, getApiUrl()).toString()),
      ]);

      const codeData = await codeRes.json();
      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      if (codeData.success) {
        setReferralCode(codeData.referralCode);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (historyData.success) {
        setReferrals(historyData.referrals);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    if (referralCode) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(referralCode);
        }
        setCopied(true);
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.log("Failed to copy:", error);
      }
    }
  };

  const shareCode = async () => {
    if (referralCode) {
      try {
        await Share.share({
          message: `${t("inviteFriendsDesc")} - ${referralCode}`,
        });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error("Share failed:", error);
      }
    }
  };

  const renderHowItWorks = () => (
    <View style={styles.howItWorksSection}>
      <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>{t("howItWorks")}</ThemedText>
      
      <View style={styles.stepsContainer}>
        {[
          { icon: "share-2" as const, title: t("step1Title"), desc: t("step1Desc") },
          { icon: "user" as const, title: t("step2Title"), desc: t("step2Desc") },
          { icon: "gift" as const, title: t("step3Title"), desc: t("step3Desc") },
        ].map((step, index) => (
          <View key={index} style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: theme.primary + "15" }]}>
              <Icon name={step.icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.stepText}>
              <ThemedText type="label">{step.title}</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{step.desc}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderReferralHistory = () => (
    <View style={styles.historySection}>
      <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>{t("referralHistory")}</ThemedText>
      
      {referrals.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon name="users" size={32} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>{t("noReferralsYet")}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{t("startInviting")}</ThemedText>
        </View>
      ) : (
        <View style={styles.referralsList}>
          {referrals.map((ref) => (
            <View key={ref.id} style={[styles.referralItem, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.referralInfo}>
                <View style={[styles.referralAvatar, { backgroundColor: theme.primary + "15" }]}>
                  <Icon name="user" size={18} color={theme.primary} />
                </View>
                <View>
                  <ThemedText type="label">{ref.referredType === "client" ? t("client") : t("driver")}</ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: ref.status === "completed" ? theme.success + "15" : theme.warning + "15" }
              ]}>
                <ThemedText style={{ 
                  color: ref.status === "completed" ? theme.success : theme.warning,
                  fontSize: 12 
                }}>
                  {ref.status === "completed" ? t("referralStatusCompleted") : t("referralStatusPending")}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradients.primary as [string, string]}
          style={styles.codeCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.codeHeader}>
            <Icon name="gift" size={28} color="#fff" />
            <ThemedText style={styles.codeTitle}>{t("yourReferralCode")}</ThemedText>
          </View>
          
          <View style={styles.codeBox}>
            {isLoading ? (
              <ThemedText style={styles.codeText}>...</ThemedText>
            ) : (
              <ThemedText style={styles.codeText}>{referralCode}</ThemedText>
            )}
          </View>

          <View style={styles.codeActions}>
            <Pressable
              onPress={copyCode}
              style={({ pressed }) => [styles.codeButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Icon name={codeCopied ? "check" : "copy"} size={18} color="#fff" />
              <ThemedText style={styles.codeButtonText}>
                {codeCopied ? t("codeCopied") : t("copyCode")}
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={shareCode}
              style={({ pressed }) => [styles.codeButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Icon name="share-2" size={18} color="#fff" />
              <ThemedText style={styles.codeButtonText}>{t("shareCode")}</ThemedText>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.rewardsInfo}>
          <View style={[styles.rewardBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{t("youEarn")}</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <ThemedText type="h2" style={{ color: theme.primary }}>10</ThemedText>
              <ThemedText style={{ color: theme.primary, fontSize: 14, fontWeight: "600", paddingBottom: 3 }}>MAD</ThemedText>
            </View>
          </View>
          <View style={[styles.rewardBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{t("friendEarns")}</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <ThemedText type="h2" style={{ color: theme.success }}>5</ThemedText>
              <ThemedText style={{ color: theme.success, fontSize: 14, fontWeight: "600", paddingBottom: 3 }}>MAD</ThemedText>
            </View>
          </View>
        </View>

        {stats ? (
          <View style={styles.statsSection}>
            <View style={[styles.statsCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.statItem}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{t("rewardBalance")}</ThemedText>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                  <ThemedText type="h2" style={{ color: theme.primary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{stats.rewardBalance}</ThemedText>
                  <ThemedText style={{ color: theme.primary, fontSize: 14, fontWeight: "600", paddingBottom: 3 }}>MAD</ThemedText>
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.miniStats}>
                <View style={styles.miniStat}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>{t("totalReferrals")}</ThemedText>
                  <ThemedText type="label">{stats.totalReferrals}</ThemedText>
                </View>
                <View style={styles.miniStat}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>{t("completedReferrals")}</ThemedText>
                  <ThemedText type="label" style={{ color: theme.success }}>{stats.completedReferrals}</ThemedText>
                </View>
                <View style={styles.miniStat}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>{t("pendingReferrals")}</ThemedText>
                  <ThemedText type="label" style={{ color: theme.warning }}>{stats.pendingReferrals}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {renderHowItWorks()}
        {renderReferralHistory()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  codeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  codeBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  codeText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 3,
  },
  codeActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  codeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  codeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  rewardsInfo: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  rewardBox: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statsSection: {
    marginBottom: Spacing.lg,
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  statItem: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statsDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.md,
  },
  miniStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  miniStat: {
    alignItems: "center",
  },
  howItWorksSection: {
    marginBottom: Spacing.xl,
  },
  stepsContainer: {
    gap: Spacing.lg,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
  },
  historySection: {
    marginBottom: Spacing.xl,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  referralsList: {
    gap: Spacing.md,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  referralInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
