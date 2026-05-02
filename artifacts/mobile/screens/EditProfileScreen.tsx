import React, { useState } from "react";
import { View, StyleSheet, Alert, Image, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { PhoneInput } from "@/components/PhoneInput";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type EditMode = "profile" | "email" | "password";

const formatPhoneWithPrefix = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('212')) {
    return '+' + cleaned;
  }
  const withoutLeadingZero = cleaned.replace(/^0/, '');
  return '+212' + withoutLeadingZero;
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user, updateUser } = useAuth();

  const [editMode, setEditMode] = useState<EditMode>("profile");
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");

  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        if (Platform.OS !== "web") {
          Alert.alert(t("requiredField"), "Permission required");
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
      console.error("Error picking profile picture:", error);
    }
  };

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = t("requiredField");
    if (!phone.trim()) newErrors.phone = t("requiredField");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    if (!newEmail.trim()) newErrors.newEmail = t("requiredField");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) newErrors.newEmail = t("invalidEmail");
    if (emailVerificationSent && !verificationCode.trim()) newErrors.verificationCode = t("requiredField");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) newErrors.newPassword = t("requiredField");
    else if (newPassword.length < 6) newErrors.newPassword = t("passwordTooShort");
    if (newPassword !== confirmPassword) newErrors.confirmPassword = t("passwordMismatch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setIsLoading(true);
    try {
      await updateUser({ fullName, phone: formatPhoneWithPrefix(phone), avatarUrl });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("success"), t("profileUpdated"));
      navigation.goBack();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("failedToUpdateDriver"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();
      if (data.success) {
        setEmailVerificationSent(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("success"), t("verificationCodeSent"));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("verificationSendError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndUpdateEmail = async () => {
    if (!verificationCode.trim()) {
      setErrors({ verificationCode: t("requiredField") });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, code: verificationCode }),
      });

      const data = await response.json();
      if (data.success) {
        await updateUser({ email: newEmail });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("success"), t("emailUpdateSuccess"));
        navigation.goBack();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("invalidVerificationCode"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("success"), t("passwordUpdateSuccess"));
      navigation.goBack();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("failedToUpdateDriver"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileEdit = () => (
    <View style={styles.form}>
      <Pressable
        onPress={pickProfilePicture}
        style={({ pressed }) => [
          styles.avatarPicker,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + "15" }]}>
            <Icon name="camera" size={32} color={theme.primary} />
          </View>
        )}
        <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
          <Icon name="edit-2" size={14} color="#fff" />
        </View>
      </Pressable>

      <Input
        label={t("fullName")}
        icon="user"
        placeholder={t("fullName")}
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
      />
      <PhoneInput
        label={t("phone")}
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
      />

      <Button
        onPress={handleSaveProfile}
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? "..." : t("saveChanges")}
      </Button>
    </View>
  );

  const renderEmailEdit = () => (
    <View style={styles.form}>
      {user?.email ? (
        <View style={[styles.currentInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("email")}</ThemedText>
          <ThemedText style={styles.currentValue}>{user.email}</ThemedText>
        </View>
      ) : null}

      <Input
        label={t("newEmail")}
        icon="mail"
        placeholder="email@example.com"
        value={newEmail}
        onChangeText={setNewEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.newEmail}
        editable={!emailVerificationSent}
      />

      {emailVerificationSent ? (
        <>
          <Input
            label={t("verificationCode")}
            icon="lock"
            placeholder="000000"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.verificationCode}
          />
          <Button
            onPress={handleVerifyAndUpdateEmail}
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? "..." : t("verifyNewEmail")}
          </Button>
        </>
      ) : (
        <Button
          onPress={handleSendEmailVerification}
          disabled={isLoading}
          style={styles.button}
        >
          {isLoading ? "..." : t("sendVerificationCode")}
        </Button>
      )}
    </View>
  );

  const renderPasswordEdit = () => (
    <View style={styles.form}>
      <Input
        label={t("newPassword")}
        icon="lock"
        placeholder="********"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        error={errors.newPassword}
      />
      <Input
        label={t("confirmPassword")}
        icon="lock"
        placeholder="********"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={errors.confirmPassword}
      />

      <Button
        onPress={handleUpdatePassword}
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? "..." : t("changePassword")}
      </Button>
    </View>
  );

  const TabButton = ({ mode, label }: { mode: EditMode; label: string }) => (
    <Pressable
      onPress={() => {
        setEditMode(mode);
        setErrors({});
      }}
      style={[
        styles.tabButton,
        {
          backgroundColor: editMode === mode ? theme.primary : theme.backgroundSecondary,
          borderColor: theme.primary,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.tabButtonText,
          { color: editMode === mode ? "#fff" : theme.primary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      <View style={[styles.tabBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TabButton mode="profile" label={t("profile")} />
        <TabButton mode="email" label={t("email")} />
        <TabButton mode="password" label={t("password")} />
      </View>

      <View style={[styles.section, Shadows.sm, { backgroundColor: theme.backgroundDefault }]}>
        {editMode === "profile" && renderProfileEdit()}
        {editMode === "email" && renderEmailEdit()}
        {editMode === "password" && renderPasswordEdit()}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  tabBar: {
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    borderWidth: 1,
  },
  tabButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: Spacing.md,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  currentInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    marginTop: Spacing.md,
  },
});
