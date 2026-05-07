import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

export type PermissionType = "camera" | "gallery";

interface PermissionModalProps {
  visible: boolean;
  type: PermissionType;
  language?: "fr" | "ar";
  onClose: () => void;
}

const CONTENT = {
  camera: {
    icon: "camera" as const,
    gradient: ["#1D4ED8", "#3B82F6"] as [string, string],
    glow: "#3B82F6",
    title: { fr: "Accès à la caméra", ar: "الوصول إلى الكاميرا" },
    description: {
      fr: "Pour prendre une photo de votre document, FAYAGE a besoin d'accéder à votre caméra.",
      ar: "لالتقاط صورة لوثيقتك، تحتاج FAYAGE إلى الوصول إلى كاميرتك.",
    },
    allow: { fr: "Autoriser la caméra", ar: "السماح بالكاميرا" },
    settings: { fr: "Ouvrir les réglages", ar: "فتح الإعدادات" },
    cancel: { fr: "Annuler", ar: "إلغاء" },
    hint: {
      fr: "Si vous avez déjà refusé, activez l'accès dans Réglages.",
      ar: "إذا رفضت سابقاً، فعّل الوصول من الإعدادات.",
    },
  },
  gallery: {
    icon: "image" as const,
    gradient: ["#6D28D9", "#8B5CF6"] as [string, string],
    glow: "#8B5CF6",
    title: { fr: "Accès à la galerie", ar: "الوصول إلى المعرض" },
    description: {
      fr: "Pour importer une photo depuis votre téléphone, FAYAGE a besoin d'accéder à votre galerie.",
      ar: "لاستيراد صورة من هاتفك، تحتاج FAYAGE إلى الوصول إلى معرض صورك.",
    },
    allow: { fr: "Autoriser la galerie", ar: "السماح بالمعرض" },
    settings: { fr: "Ouvrir les réglages", ar: "فتح الإعدادات" },
    cancel: { fr: "Annuler", ar: "إلغاء" },
    hint: {
      fr: "Si vous avez déjà refusé, activez l'accès dans Réglages.",
      ar: "إذا رفضت سابقاً، فعّل الوصول من الإعدادات.",
    },
  },
};

export default function PermissionModal({
  visible,
  type,
  language = "fr",
  onClose,
}: PermissionModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = CONTENT[type];
  const isRTL = language === "ar";

  const handleSettings = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    Linking.openSettings();
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Scrim */}
      <Pressable style={styles.scrim} onPress={handleClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Icon bubble */}
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={c.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBubble}
          >
            <Icon name={c.icon} size={34} color="#FFFFFF" />
          </LinearGradient>
          {/* glow ring */}
          <View
            style={[
              styles.glowRing,
              { borderColor: c.glow + "30" },
            ]}
          />
        </View>

        {/* Text */}
        <View style={[styles.textBlock, { direction: isRTL ? "rtl" : "ltr" }]}>
          <ThemedText
            style={[styles.title, { textAlign: "center", color: theme.text }]}
          >
            {c.title[language]}
          </ThemedText>
          <ThemedText
            style={[
              styles.description,
              { textAlign: "center", color: theme.textSecondary },
            ]}
          >
            {c.description[language]}
          </ThemedText>
        </View>

        {/* Hint row */}
        <View
          style={[
            styles.hintRow,
            { backgroundColor: c.glow + "12", borderColor: c.glow + "25" },
          ]}
        >
          <Icon name="info" size={14} color={c.glow} />
          <ThemedText style={[styles.hintText, { color: c.glow, textAlign: isRTL ? "right" : "left" }]}>
            {c.hint[language]}
          </ThemedText>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsWrap}>
          {/* Primary — open settings */}
          <Pressable onPress={handleSettings} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient
              colors={c.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Icon name="settings" size={18} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>
                {c.settings[language]}
              </ThemedText>
            </LinearGradient>
          </Pressable>

          {/* Secondary — cancel */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
              {c.cancel[language]}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    alignItems: "center",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    width: "100%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 34,
    borderWidth: 2,
  },
  textBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
    width: "100%",
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
  buttonsWrap: {
    gap: Spacing.md,
    width: "100%",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 54,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },
  cancelBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
