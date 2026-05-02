import React, { useState } from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Icon, IconName } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

const faqItems: FAQItem[] = [
  { questionKey: "howToCreateRequest", answerKey: "howToCreateRequestAnswer" },
  { questionKey: "howToTrack", answerKey: "howToTrackAnswer" },
  { questionKey: "howToRate", answerKey: "howToRateAnswer" },
  { questionKey: "howToBecomeDriver", answerKey: "howToBecomeDriverAnswer" },
  { questionKey: "paymentQuestion", answerKey: "paymentAnswer" },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleEmailPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = "support@fayage.ma";
    const subject = encodeURIComponent("Support FAYAGE");
    const url = `mailto:${email}?subject=${subject}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open email:", error);
    }
  };

  const handlePhonePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = "+212500000000";
    const url = Platform.OS === "ios" ? `tel:${phone}` : `tel:${phone}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open phone:", error);
    }
  };

  const toggleFAQ = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const ContactButton = ({
    icon,
    label,
    value,
    onPress,
  }: {
    icon: IconName;
    label: string;
    value: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactButton,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
        Shadows.sm,
      ]}
    >
      <View style={[styles.contactIcon, { backgroundColor: theme.primary + "15" }]}>
        <Icon name={icon} size={20} color={theme.primary} />
      </View>
      <View style={[styles.contactInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{label}</ThemedText>
        <ThemedText style={styles.contactValue}>{value}</ThemedText>
      </View>
      <Icon
        name={isRTL ? "chevron-left" : "chevron-right"}
        size={20}
        color={theme.textSecondary}
      />
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
      <View style={[styles.section, Shadows.sm, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
        >
          {t("faq")}
        </ThemedText>
        {faqItems.map((item, index) => (
          <View key={index}>
            <Pressable
              onPress={() => toggleFAQ(index)}
              style={[
                styles.faqItem,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <ThemedText
                style={[
                  styles.faqQuestion,
                  { flex: 1, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t(item.questionKey)}
              </ThemedText>
              <Icon
                name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            {expandedIndex === index ? (
              <View style={[styles.faqAnswer, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText
                  style={[
                    styles.faqAnswerText,
                    { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t(item.answerKey)}
                </ThemedText>
              </View>
            ) : null}
            {index < faqItems.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.contactSection}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
        >
          {t("contactSupport")}
        </ThemedText>
        <ContactButton
          icon="mail"
          label={t("sendEmail")}
          value={t("supportEmail")}
          onPress={handleEmailPress}
        />
        <ContactButton
          icon="phone"
          label={t("callUs")}
          value={t("supportPhone")}
          onPress={handlePhonePress}
        />
      </View>

      <View style={[styles.section, Shadows.sm, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}
        >
          {t("aboutApp")}
        </ThemedText>
        <View style={styles.aboutItem}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("appVersion")}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Pressable
          style={[styles.aboutItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={() => {}}
        >
          <ThemedText>{t("termsAndConditions")}</ThemedText>
          <Icon
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Pressable
          style={[styles.aboutItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={() => {}}
        >
          <ThemedText>{t("privacyPolicy")}</ThemedText>
          <Icon
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
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
  section: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  faqItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "500",
  },
  faqAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  contactSection: {
    gap: Spacing.md,
  },
  contactButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  aboutItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
    alignItems: "center",
  },
});
