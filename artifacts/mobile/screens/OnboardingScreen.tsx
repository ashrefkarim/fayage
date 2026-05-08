import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  StatusBar,
  ListRenderItemInfo,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width } = Dimensions.get("window");
export const ONBOARDING_SEEN_KEY = "@fayage/onboarding_seen";

interface Slide {
  key: string;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  colors: [string, string];
}

const SLIDES: Slide[] = [
  {
    key: "1",
    emoji: "🚚",
    titleKey: "onboarding1Title",
    subtitleKey: "onboarding1Subtitle",
    colors: ["#005BBB", "#0073E6"],
  },
  {
    key: "2",
    emoji: "📦",
    titleKey: "onboarding2Title",
    subtitleKey: "onboarding2Subtitle",
    colors: ["#0073E6", "#0096FF"],
  },
  {
    key: "3",
    emoji: "📍",
    titleKey: "onboarding3Title",
    subtitleKey: "onboarding3Subtitle",
    colors: ["#0066CC", "#00AAFF"],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    navigation.replace("Auth");
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      finish();
    }
  }, [currentIndex, finish]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <LinearGradient colors={item.colors} style={styles.slide}>
      <View style={styles.slideInner}>
        <View style={styles.emojiRing}>
          <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
        </View>
        <ThemedText style={[styles.title, { textAlign: isRTL ? "right" : "center" }]}>
          {t(item.titleKey)}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { textAlign: isRTL ? "right" : "center" }]}>
          {t(item.subtitleKey)}
        </ThemedText>
      </View>
    </LinearGradient>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Skip */}
      {!isLast && (
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={[
            styles.skipBtn,
            { top: insets.top + 16 },
            isRTL ? { left: 24 } : { right: 24 },
          ]}
        >
          <ThemedText style={styles.skipText}>{t("skip")}</ThemedText>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.list}
      />

      {/* Bottom sheet */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 28 }]}>
        {/* Page dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotOn : styles.dotOff]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <ThemedText style={styles.ctaText}>
            {isLast ? t("getStarted") : t("next")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0066CC" },
  list: { flex: 1 },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slideInner: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  emojiRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emoji: { fontSize: 64 },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 24,
  },
  skipBtn: {
    position: "absolute",
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    fontWeight: "500",
  },
  bottom: {
    backgroundColor: "#FFFFFF",
    paddingTop: 28,
    paddingHorizontal: 32,
    gap: 24,
    alignItems: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  dotOn: { width: 28, backgroundColor: "#0066CC" },
  dotOff: { width: 8, backgroundColor: "#D1D5DB" },
  cta: {
    width: "100%",
    backgroundColor: "#0066CC",
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
});
