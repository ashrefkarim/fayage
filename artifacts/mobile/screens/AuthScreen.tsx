import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions, Platform, Animated } from "react-native";
import PermissionModal from "@/components/PermissionModal";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PhoneInput } from "@/components/PhoneInput";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTheme } from "@/hooks/useTheme";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");

type AuthMode = "welcome" | "login" | "signup" | "role" | "verification";

const formatPhoneWithPrefix = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('212')) {
    return '+' + cleaned;
  }
  const withoutLeadingZero = cleaned.replace(/^0/, '');
  return '+212' + withoutLeadingZero;
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { gradients, appName, appSlogan, appLogo } = useDynamicTheme();
  const { t, isRTL, language } = useLanguage();
  const { login, signup, loginAsAdmin } = useAuth();

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [referralValidated, setReferralValidated] = useState<{valid: boolean; referrerName?: string} | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.85)).current;
  const contentSlideAnim = useRef(new Animated.Value(30)).current;
  const contentOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode !== "welcome") return;
    // Entrance animation
    Animated.parallel([
      Animated.spring(logoScaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(contentOpacityAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(contentSlideAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
    // Glow breathing
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [mode]);

  const switchMode = (newMode: AuthMode) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setMode(newMode);
      setError("");
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const signupStep = mode === "role" ? 1 : mode === "signup" ? 2 : mode === "verification" ? 3 : null;
  const SIGNUP_STEPS = [t("selectRole"), t("createAccount"), t("verifyEmail")];

  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      Alert.prompt(
        "Admin Access",
        "Enter admin code:",
        async (code) => {
          if (!code) return;
          try {
            await loginAsAdmin(code);
          } catch {
            Alert.alert("Error", "Invalid admin code");
          }
        },
        "secure-text"
      );
    } else {
      logoTapTimer.current = setTimeout(() => {
        logoTapCount.current = 0;
      }, 2000);
    }
  };

  useEffect(() => {
    setLogoLoadError(false);
  }, [appLogo]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    if (!email) {
      setError(t("emailRequired"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(new URL("/api/verification/send", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send code");
      }
      setResendCooldown(60);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(t("verificationSendError"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValidated(null);
      return;
    }
    try {
      const response = await fetch(new URL("/api/referrals/validate", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await response.json();
      if (data.valid) {
        setReferralValidated({ valid: true, referrerName: data.referrerName });
      } else {
        setReferralValidated({ valid: false });
      }
    } catch {
      setReferralValidated({ valid: false });
    }
  };

  const applyReferralAfterSignup = async (userId: string) => {
    if (referralCode.trim() && referralValidated?.valid) {
      try {
        await fetch(new URL("/api/referrals/apply", getApiUrl()).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referredId: userId,
            referredType: selectedRole,
            referralCode: referralCode.trim().toUpperCase(),
          }),
        });
      } catch (err) {
        console.log("Failed to apply referral code:", err);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError(t("enterVerificationCode"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(new URL("/api/verification/verify", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.verified) {
        throw new Error(data.error || "Invalid code");
      }
      const result = await signup({ fullName, phone: formatPhoneWithPrefix(phone), email, password, role: selectedRole, avatarUrl });
      if (result?.user?.id) {
        await applyReferralAfterSignup(result.user.id);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (err.message === "Invalid code" || err.message === "Invalid or expired code") {
        setError(t("invalidVerificationCode"));
      } else {
        setError(err.message || t("error"));
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        if (Platform.OS !== "web") {
          setPermissionModalVisible(true);
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUrl(result.assets[0].uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      setError(t("fillAllFields"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await login(formatPhoneWithPrefix(phone), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(t("error"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!fullName || !phone || !email || !password) {
      setError(t("fillAllFields"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(new URL("/api/verification/send", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification");
      }
      setResendCooldown(60);
      switchMode("verification");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(t("verificationSendError"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleRoleSelect = async (role: UserRole) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
  };

  const renderWelcome = () => {
    return (
      <View style={styles.welcomeRoot}>
        {/* Language toggle */}
        <View style={[styles.welcomeTopBar, { paddingTop: insets.top + 16 }]}>
          <View />
          <LanguageToggle light />
        </View>

        {/* Visual hero */}
        <View style={[styles.welcomeHero, { paddingTop: insets.top + 56 }]}>
          <Animated.View style={{ transform: [{ scale: logoScaleAnim }] }}>
            <Pressable onPress={handleLogoTap} style={styles.logoDisc}>
              <Image
                source={appLogo && !logoLoadError ? { uri: appLogo } : require("../assets/images/icon.png")}
                style={styles.logoImg}
                resizeMode="contain"
                onError={() => setLogoLoadError(true)}
              />
            </Pressable>
          </Animated.View>
        </View>

        {/* Text + CTA */}
        <Animated.View
          style={[
            styles.welcomeCard,
            { paddingBottom: Math.max(insets.bottom + 20, 32), opacity: contentOpacityAnim, transform: [{ translateY: contentSlideAnim }] },
          ]}
        >
          <View style={styles.welcomeTextBlock}>
            <ThemedText style={styles.welcomeAppName}>{appName}</ThemedText>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerDot}>✦</ThemedText>
              <View style={styles.dividerLine} />
            </View>
            <ThemedText style={styles.welcomeSlogan}>{appSlogan}</ThemedText>
          </View>

          {/* Trust pills */}
          <View style={styles.trustRow}>
            {(language === "ar"
              ? ["🚀 سريع", "🔒 آمن", "📍 تتبع مباشر"]
              : ["🚀 Rapide", "🔒 Sécurisé", "📍 Temps réel"]
            ).map((label) => (
              <View key={label} style={styles.trustPill}>
                <ThemedText style={styles.trustPillText}>{label}</ThemedText>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={() => setMode("role")}
            style={({ pressed }) => [styles.ctaWrapper, { opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={["#1E88E5", "#0D47A1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <ThemedText style={styles.ctaBtnText}>{t("getStarted")}</ThemedText>
              <ThemedText style={styles.ctaArrow}>{isRTL ? "←" : "→"}</ThemedText>
            </LinearGradient>
          </Pressable>

          {/* Sign-in link */}
          <Pressable
            onPress={() => setMode("login")}
            style={({ pressed }) => [styles.signInRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedText style={styles.signInText}>{t("alreadyHaveAccount")} </ThemedText>
            <ThemedText style={styles.signInLink}>{t("signIn")}</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  const renderRoleSelection = () => (
    <View style={styles.formContent}>
      <View style={styles.formHeader}>
        <ThemedText type="h1">{t("selectRole")}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          {t("chooseHowToUse")}
        </ThemedText>
      </View>

      <View style={styles.roleOptions}>
        {/* Client card */}
        <Pressable
          onPress={() => handleRoleSelect("client")}
          style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
        >
          <View style={[
            styles.roleCard,
            Shadows.md,
            {
              borderColor: selectedRole === "client" ? "#2563EB" : theme.border,
              borderWidth: selectedRole === "client" ? 2 : 1.5,
              backgroundColor: selectedRole === "client" ? "#EFF6FF" : theme.backgroundDefault,
              overflow: "hidden",
            },
          ]}>
            <View style={[styles.roleCardAccent, { backgroundColor: selectedRole === "client" ? "#2563EB" : "transparent" }]} />
            <LinearGradient
              colors={selectedRole === "client" ? ["#1E3A8A", "#2563EB"] : [theme.backgroundSecondary, theme.backgroundSecondary]}
              style={styles.roleIconGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Icon name="package" size={30} color={selectedRole === "client" ? "#FFFFFF" : theme.textSecondary} />
            </LinearGradient>
            <View style={styles.roleTextContainer}>
              <ThemedText style={[styles.roleTitle, { color: selectedRole === "client" ? "#1E3A8A" : theme.text }]}>
                {t("client")}
              </ThemedText>
              <ThemedText style={[styles.roleDescription, { color: selectedRole === "client" ? "#3B82F6" : theme.textSecondary }]}>
                {t("transportGoods")}
              </ThemedText>
              <View style={[styles.roleBullet, { backgroundColor: selectedRole === "client" ? "#DBEAFE" : theme.backgroundSecondary }]}>
                <Icon name="check-circle" size={12} color={selectedRole === "client" ? "#2563EB" : theme.textSecondary} />
                <ThemedText style={{ fontSize: 11, color: selectedRole === "client" ? "#1D4ED8" : theme.textSecondary }}>
                  {language === "ar" ? "تتبع الطلبات بسهولة" : "Suivi en temps réel"}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.checkBadge, {
              backgroundColor: selectedRole === "client" ? "#2563EB" : theme.backgroundSecondary,
              borderWidth: selectedRole === "client" ? 0 : 1.5,
              borderColor: theme.border,
            }]}>
              <Icon name="check" size={14} color={selectedRole === "client" ? "#FFFFFF" : theme.textSecondary} />
            </View>
          </View>
        </Pressable>

        {/* Driver card */}
        <Pressable
          onPress={() => handleRoleSelect("driver")}
          style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
        >
          <View style={[
            styles.roleCard,
            Shadows.md,
            {
              borderColor: selectedRole === "driver" ? "#7C3AED" : theme.border,
              borderWidth: selectedRole === "driver" ? 2 : 1.5,
              backgroundColor: selectedRole === "driver" ? "#F5F3FF" : theme.backgroundDefault,
              overflow: "hidden",
            },
          ]}>
            <View style={[styles.roleCardAccent, { backgroundColor: selectedRole === "driver" ? "#7C3AED" : "transparent" }]} />
            <LinearGradient
              colors={selectedRole === "driver" ? ["#5B21B6", "#7C3AED"] : [theme.backgroundSecondary, theme.backgroundSecondary]}
              style={styles.roleIconGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Icon name="truck" size={30} color={selectedRole === "driver" ? "#FFFFFF" : theme.textSecondary} />
            </LinearGradient>
            <View style={styles.roleTextContainer}>
              <ThemedText style={[styles.roleTitle, { color: selectedRole === "driver" ? "#5B21B6" : theme.text }]}>
                {t("driver")}
              </ThemedText>
              <ThemedText style={[styles.roleDescription, { color: selectedRole === "driver" ? "#7C3AED" : theme.textSecondary }]}>
                {t("availableNearby")}
              </ThemedText>
              <View style={[styles.roleBullet, { backgroundColor: selectedRole === "driver" ? "#EDE9FE" : theme.backgroundSecondary }]}>
                <Icon name="check-circle" size={12} color={selectedRole === "driver" ? "#7C3AED" : theme.textSecondary} />
                <ThemedText style={{ fontSize: 11, color: selectedRole === "driver" ? "#6D28D9" : theme.textSecondary }}>
                  {language === "ar" ? "اكسب من كل رحلة" : "Gagnez à chaque course"}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.checkBadge, {
              backgroundColor: selectedRole === "driver" ? "#7C3AED" : theme.backgroundSecondary,
              borderWidth: selectedRole === "driver" ? 0 : 1.5,
              borderColor: theme.border,
            }]}>
              <Icon name="check" size={14} color={selectedRole === "driver" ? "#FFFFFF" : theme.textSecondary} />
            </View>
          </View>
        </Pressable>
      </View>

      <Button
        onPress={() => {
          if (selectedRole === "driver") {
            navigation.navigate("DriverRegistration");
          } else {
            switchMode("signup");
          }
        }}
      >
        {`${t("continueAs")} ${selectedRole === "client" ? t("client") : t("driver")}`}
      </Button>
    </View>
  );

  

  const renderLogin = () => (
    <View style={styles.formContent}>
      <View style={styles.formHeader}>
        <ThemedText type="h1">{t("welcomeBack")}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          {t("signInToContinue")}
        </ThemedText>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.error + "15", borderColor: theme.error }]}>
          <Icon name="alert-circle" size={18} color={theme.error} />
          <ThemedText style={{ color: theme.error, flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      <View style={styles.formFields}>
        <PhoneInput
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          label={t("password")}
          icon="lock"
          placeholder="********"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Button onPress={handleLogin} disabled={isLoading}>
        {isLoading ? "..." : t("login")}
      </Button>

      <Pressable
        onPress={() => navigation.navigate("ForgotPassword")}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1, marginTop: Spacing.md }]}
      >
        <ThemedText style={[styles.linkText, { color: theme.primary }]}>
          {t("forgotPassword")}
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => setMode("role")}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1, marginTop: Spacing.md }]}
      >
        <ThemedText style={{ color: theme.textSecondary }}>
          {t("dontHaveAccount")}{" "}
        </ThemedText>
        <ThemedText style={[styles.linkText, { color: theme.primary }]}>
          {t("createAccount")}
        </ThemedText>
      </Pressable>

    </View>
  );

  const renderSignup = () => (
    <View style={styles.formContent}>
      <View style={styles.formHeader}>
        <ThemedText type="h1">{t("createAccount")}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          {t("fillDetailsBelow")}
        </ThemedText>
      </View>

      <Pressable
        onPress={pickProfilePicture}
        style={({ pressed }) => [
          styles.avatarPicker,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + "15" }]}>
            <Icon name="camera" size={28} color={theme.primary} />
          </View>
        )}
        <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
          <Icon name="edit-2" size={12} color="#fff" />
        </View>
      </Pressable>
      <ThemedText style={[styles.avatarHint, { color: theme.textSecondary }]}>
        {t("addProfilePhoto")}
      </ThemedText>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.error + "15", borderColor: theme.error }]}>
          <Icon name="alert-circle" size={18} color={theme.error} />
          <ThemedText style={{ color: theme.error, flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      <View style={styles.formFields}>
        <Input
          label={selectedRole === "client" ? "Nom complet ou Raison sociale" : t("fullName")}
          icon="user"
          placeholder={selectedRole === "client" ? "Nom complet ou Raison sociale" : t("fullName")}
          value={fullName}
          onChangeText={setFullName}
        />
        <PhoneInput
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          label={t("email")}
          icon="mail"
          placeholder={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Input
          label={t("password")}
          icon="lock"
          placeholder="********"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {/* Referral code field hidden temporarily */}
      </View>

      <Button onPress={handleSignup} disabled={isLoading}>
        {isLoading ? "..." : t("createAccount")}
      </Button>

      <Pressable
        onPress={() => setMode("login")}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1, marginTop: Spacing.xl }]}
      >
        <ThemedText style={{ color: theme.textSecondary }}>
          {t("alreadyHaveAccount")}{" "}
        </ThemedText>
        <ThemedText style={[styles.linkText, { color: theme.primary }]}>
          {t("signIn")}
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderVerification = () => (
    <View style={styles.formContent}>
      <View style={styles.formHeader}>
        <View style={[styles.verifyBadge, { backgroundColor: theme.primary + "15" }]}>
          <Icon name="mail" size={28} color={theme.primary} />
        </View>
        <ThemedText type="h1" style={{ marginTop: Spacing.lg }}>{t("verifyEmail")}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
          {t("verificationCodeSent")} {email}
        </ThemedText>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.error + "15", borderColor: theme.error }]}>
          <Icon name="alert-circle" size={18} color={theme.error} />
          <ThemedText style={{ color: theme.error, flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      <View style={styles.formFields}>
        <Input
          label={t("verificationCode")}
          icon="shield"
          placeholder="000000"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <Button onPress={handleVerifyCode} disabled={isLoading}>
        {isLoading ? "..." : t("verify")}
      </Button>

      <Pressable
        onPress={sendVerificationCode}
        disabled={resendCooldown > 0 || isLoading}
        style={({ pressed }) => [
          styles.resendButton,
          { opacity: (pressed || resendCooldown > 0) ? 0.5 : 1 },
        ]}
      >
        <Icon name="refresh-cw" size={16} color={theme.primary} />
        <ThemedText style={[styles.linkText, { color: theme.primary, marginLeft: Spacing.xs }]}>
          {resendCooldown > 0 ? `${t("resendIn")} ${resendCooldown}s` : t("resendCode")}
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => {
          setMode("signup");
          setVerificationCode("");
          setError("");
        }}
        style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1, marginTop: Spacing.lg }]}
      >
        <Icon name="arrow-left" size={16} color={theme.textSecondary} />
        <ThemedText style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
          {t("changeEmail")}
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {mode === "welcome" ? (
        renderWelcome()
      ) : (
        <KeyboardAwareScrollViewCompat
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing["2xl"],
            },
          ]}
        >
          <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Pressable
              onPress={() => {
                if (mode === "login") { setError(""); setMode("welcome"); }
                else if (mode === "signup") switchMode("role");
                else if (mode === "verification") { switchMode("signup"); setVerificationCode(""); }
                else { setError(""); setMode("welcome"); }
              }}
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.backButtonInner, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={theme.text} />
              </View>
            </Pressable>
            <LanguageToggle />
          </View>

          {/* ── Signup Progress Indicator ── */}
          {signupStep !== null && (
            <View style={[styles.signupProgressBar, { borderBottomColor: theme.border }]}>
              <View style={[styles.signupProgressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {SIGNUP_STEPS.map((label, index) => {
                  const step = index + 1;
                  const isCompleted = signupStep > step;
                  const isActive = signupStep === step;
                  return (
                    <React.Fragment key={step}>
                      {index > 0 && (
                        <View style={[styles.signupConnector, {
                          backgroundColor: step <= signupStep ? theme.primary : theme.border,
                        }]} />
                      )}
                      <View style={styles.signupStepDot}>
                        <View style={[styles.signupStepCircle, {
                          backgroundColor: isActive ? theme.primary : isCompleted ? theme.primary : theme.backgroundSecondary,
                          borderColor: isActive || isCompleted ? theme.primary : theme.border,
                          shadowColor: isActive ? theme.primary : "transparent",
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.35,
                          shadowRadius: 6,
                          elevation: isActive ? 4 : 0,
                        }]}>
                          {isCompleted
                            ? <Icon name="check" size={11} color="#fff" />
                            : <ThemedText style={{ color: isActive ? "#fff" : theme.textSecondary, fontWeight: "700", fontSize: 12 }}>{step}</ThemedText>
                          }
                        </View>
                        <ThemedText style={[styles.signupStepLabel, {
                          color: isActive ? theme.primary : isCompleted ? theme.textSecondary : theme.textSecondary,
                          fontWeight: isActive ? "700" : "400",
                          opacity: isActive ? 1 : 0.7,
                        }]} numberOfLines={1}>
                          {label}
                        </ThemedText>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          <Animated.View style={{ opacity: fadeAnim, flex: signupStep !== null ? undefined : 1 }}>
            {mode === "role" && renderRoleSelection()}
            {mode === "login" && renderLogin()}
            {mode === "signup" && renderSignup()}
            {mode === "verification" && renderVerification()}
          </Animated.View>
        </KeyboardAwareScrollViewCompat>
      )}
      <PermissionModal
        visible={permissionModalVisible}
        type="gallery"
        language={language as "fr" | "ar"}
        onClose={() => setPermissionModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Welcome redesign ──────────────────────────────────────
  welcomeRoot: {
    flex: 1,
    backgroundColor: "#060E1F",
    overflow: "hidden",
  },
  welcomeTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  welcomeHero: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRingOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(100,160,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRingMid: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: "rgba(100,160,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoDisc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#1E88E5", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 28 },
      android: { elevation: 20 },
    }),
  },
  logoImg: {
    width: 120,
    height: 120,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 24,
    paddingHorizontal: 28,
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  welcomeTextBlock: {
    alignItems: "center",
    gap: 8,
  },
  welcomeAppName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#060E1F",
    letterSpacing: -1,
    fontFamily: "Poppins_700Bold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "60%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerDot: {
    color: "#1E88E5",
    fontSize: 12,
  },
  welcomeSlogan: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  trustPill: {
    backgroundColor: "#F0F7FF",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  trustPillText: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  ctaWrapper: {
    borderRadius: 100,
    overflow: "hidden",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  ctaArrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    fontWeight: "600",
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  signInText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  signInLink: {
    color: "#1E88E5",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  // ─────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  linkText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
  formContent: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  formHeader: {
    marginBottom: Spacing["2xl"],
  },
  roleOptions: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    paddingLeft: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    position: "relative",
  },
  roleCardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
  },
  roleIconGradient: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContainer: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },
  roleDescription: {
    fontSize: 13,
  },
  roleBullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  checkBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  formFields: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  verifyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  referralValidBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  signupProgressBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  signupProgressRow: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  signupStepDot: {
    alignItems: "center",
    gap: 5,
    minWidth: 72,
  },
  signupStepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  signupStepLabel: {
    fontSize: 10,
    textAlign: "center",
    maxWidth: 72,
    lineHeight: 13,
  },
  signupConnector: {
    flex: 1,
    height: 2,
    marginTop: 16,
    marginHorizontal: 2,
    borderRadius: 1,
  },
});
