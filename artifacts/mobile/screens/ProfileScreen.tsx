import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Switch,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon, IconName } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { RatingStars } from "@/components/RatingStars";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Shadows, Gradients } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, logout } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [driverStats, setDriverStats] = useState({ rating: 0, totalDeliveries: 0 });

  useEffect(() => {
    if (user?.role === "driver" && user?.id) {
      const fetchDriverStats = async () => {
        try {
          const response = await fetch(`${getApiUrl()}/api/drivers/${user.id}/stats`);
          const data = await response.json();
          if (data.success) {
            setDriverStats({
              rating: data.rating || 0,
              totalDeliveries: data.totalDeliveries || 0,
            });
          }
        } catch (error) {
          console.log("Failed to fetch driver stats:", error);
        }
      };
      fetchDriverStats();
    }
  }, [user?.id, user?.role]);

  const defaultAvatarSource =
    user?.role === "driver"
      ? require("../assets/images/avatar-driver.png")
      : require("../assets/images/avatar-client.png");

  const hasCustomAvatar = user?.avatarUrl && user.avatarUrl.length > 0;

  const handleLogout = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t("logout"), t("confirmDeleteMessage").replace(t("deleteAccount"), t("logout")), [
      { text: t("no"), style: "cancel" },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleLanguageToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(language === "fr" ? "ar" : "fr");
  };

  const handleVerification = () => {
    if (user?.role === "driver") {
      navigation.navigate("Verification");
    }
  };

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    showArrow = true,
    rightComponent,
    destructive = false,
    isLast = false,
    accentColor,
  }: {
    icon: IconName;
    label: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    destructive?: boolean;
    isLast?: boolean;
    accentColor?: string;
  }) => {
    const color = destructive ? theme.error : (accentColor || theme.primary);
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.menuItem,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            backgroundColor: pressed && onPress ? theme.backgroundRoot : "transparent",
          },
        ]}
      >
        <View style={[styles.menuLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <LinearGradient
            colors={[color + "25", color + "10"]}
            style={styles.menuIcon}
          >
            <Icon name={icon} size={17} color={color} />
          </LinearGradient>
          <ThemedText style={[styles.menuLabel, destructive && { color: theme.error }]}>
            {label}
          </ThemedText>
        </View>
        <View style={[styles.menuRight, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {value ? (
            <ThemedText style={[styles.menuValue, { color: theme.textSecondary }]}>{value}</ThemedText>
          ) : null}
          {rightComponent}
          {showArrow && onPress && !destructive ? (
            <Icon
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={16}
              color={theme.textSecondary + "80"}
            />
          ) : null}
        </View>
        {!isLast && (
          <View style={[styles.divider, { backgroundColor: theme.border + "50", left: isRTL ? 0 : 60, right: isRTL ? 60 : 0 }]} />
        )}
      </Pressable>
    );
  };

  const SectionCard = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
      {title ? (
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border + "40" }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {title}
          </ThemedText>
        </View>
      ) : null}
      {children}
    </View>
  );

  const roleLabel = user?.role === "driver" ? t("driver") : t("client");
  const roleColor = user?.role === "driver" ? "#F59E0B" : "#10B981";

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing["3xl"],
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      {/* Hero Profile Card */}
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, Shadows.lg]}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Edit button */}
        <Pressable
          onPress={() => navigation.navigate("EditProfile")}
          style={[styles.editButton, { backgroundColor: "rgba(255,255,255,0.2)" }]}
        >
          <Icon name="edit-2" size={15} color="#FFFFFF" />
        </Pressable>

        <View style={styles.heroContent}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              {hasCustomAvatar ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <Image source={defaultAvatarSource} style={styles.avatar} resizeMode="cover" />
              )}
            </View>
            {user?.isVerified ? (
              <View style={styles.verifiedBadge}>
                <VerifiedBadge size="medium" />
              </View>
            ) : null}
          </View>

          {/* Name & role */}
          <ThemedText style={styles.heroName}>{user?.fullName}</ThemedText>
          <View style={styles.roleChip}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <ThemedText style={styles.roleText}>{roleLabel}</ThemedText>
          </View>

          {/* Contact info */}
          <View style={styles.contactRow}>
            <Icon name="phone" size={13} color="rgba(255,255,255,0.7)" />
            <ThemedText style={styles.contactText}>{user?.phone}</ThemedText>
          </View>
          {user?.email ? (
            <View style={styles.contactRow}>
              <Icon name="mail" size={13} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.contactText}>{user.email}</ThemedText>
            </View>
          ) : null}
        </View>

        {/* Driver stats bar */}
        {user?.role === "driver" ? (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{driverStats.totalDeliveries}</ThemedText>
              <ThemedText style={styles.statLabel}>{t("totalDeliveries")}</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ThemedText style={styles.statValue}>{driverStats.rating.toFixed(1)}</ThemedText>
                <Icon name="star" size={14} color="#FBBF24" />
              </View>
              <ThemedText style={styles.statLabel}>{t("rating")}</ThemedText>
            </View>
          </View>
        ) : null}
      </LinearGradient>

      {/* Account Section */}
      <SectionCard title={t("account")}>
        <MenuItem
          icon="edit-2"
          label={t("editProfile")}
          onPress={() => navigation.navigate("EditProfile")}
          accentColor="#6366F1"
          isLast={user?.role === "driver"}
        />
        {/* Verification hidden temporarily */}
        {user?.role === "client" ? (
          <MenuItem
            icon="heart"
            label={t("favoriteDrivers")}
            onPress={() => navigation.navigate("FavoriteDrivers")}
            accentColor="#EF4444"
            isLast
          />
        ) : null}
        {/* Messages hidden temporarily */}
      </SectionCard>

      {/* Settings Section */}
      <SectionCard title={t("settings")}>
        <MenuItem
          icon="globe"
          label={t("language")}
          value={language === "fr" ? t("french") : t("arabic")}
          onPress={handleLanguageToggle}
          accentColor="#8B5CF6"
        />
        <MenuItem
          icon="bell"
          label={t("notifications")}
          showArrow={false}
          rightComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          }
          accentColor="#F59E0B"
        />
        <MenuItem
          icon="credit-card"
          label={t("paymentMethods")}
          value={t("cash")}
          accentColor="#10B981"
          isLast
        />
        {/* Referral program hidden temporarily */}
      </SectionCard>

      {/* Support Section */}
      <SectionCard title={t("support")}>
        <MenuItem
          icon="help-circle"
          label={t("faq")}
          onPress={() => navigation.navigate("Support")}
          accentColor="#06B6D4"
        />
        <MenuItem
          icon="mail"
          label={t("contactSupport")}
          onPress={() => navigation.navigate("Support")}
          accentColor="#06B6D4"
          isLast
        />
      </SectionCard>

      {/* Logout */}
      <SectionCard>
        <MenuItem
          icon="log-out"
          label={t("logout")}
          onPress={handleLogout}
          destructive
          showArrow={false}
          isLast
        />
      </SectionCard>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  /* Hero Card */
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    ...Shadows.lg,
  },
  decorCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -40,
  },
  decorCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 30,
    left: -30,
  },
  editButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  heroContent: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  roleText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "600",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },

  /* Stats bar */
  statsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: Spacing.sm,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Section card */
  sectionCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  /* Menu item */
  menuItem: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  menuLeft: {
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuRight: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    position: "absolute",
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
