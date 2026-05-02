import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Colors, Gradients, Spacing, BorderRadius, Typography } from "../constants/theme";
import { useLanguage } from "../contexts/LanguageContext";

interface MaintenanceScreenProps {
  message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  const { language } = useLanguage();

  const translations = {
    title: language === "ar" ? "صيانة التطبيق" : "Application en maintenance",
    subtitle:
      language === "ar"
        ? "نعمل على تحسين التطبيق من أجلكم"
        : "Nous travaillons à améliorer l'application pour vous",
    defaultMessage:
      language === "ar"
        ? "التطبيق قيد الصيانة حاليًا. يرجى المحاولة مرة أخرى لاحقًا."
        : "L'application est actuellement en maintenance. Veuillez réessayer plus tard.",
    thankYou:
      language === "ar"
        ? "شكرا لتفهمكم"
        : "Merci de votre compréhension",
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={Gradients.primary as [string, string, ...string[]]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
              style={styles.iconGradient}
            >
              <Feather name="tool" size={64} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.title, language === "ar" && styles.rtlText]}>
            {translations.title}
          </Text>
          
          <Text style={[styles.subtitle, language === "ar" && styles.rtlText]}>
            {translations.subtitle}
          </Text>

          <View style={styles.messageCard}>
            <View style={styles.messageIconRow}>
              <Feather name="info" size={20} color={Colors.light.primary} />
            </View>
            <Text style={[styles.message, language === "ar" && styles.rtlText]}>
              {message || translations.defaultMessage}
            </Text>
          </View>

          <View style={styles.decorativeDotsContainer}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <Text style={[styles.thankYou, language === "ar" && styles.rtlText]}>
            {translations.thankYou}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FAYAGE</Text>
          <Text style={styles.footerSubtext}>Transport Premium</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.primary,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing["2xl"],
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  title: {
    ...Typography.h1,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
    fontFamily: "Poppins_600SemiBold",
  },
  subtitle: {
    ...Typography.body,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: width - Spacing.xl * 2,
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  messageIconRow: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.body,
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 24,
  },
  decorativeDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing["2xl"],
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 24,
  },
  thankYou: {
    ...Typography.caption,
    color: "rgba(255,255,255,0.8)",
    marginTop: Spacing.xl,
    fontStyle: "italic",
  },
  footer: {
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },
  footerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  footerSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.xs,
    letterSpacing: 1,
  },
});
